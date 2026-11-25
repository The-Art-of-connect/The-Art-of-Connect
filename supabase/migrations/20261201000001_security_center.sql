-- ════════════════════════════════════════════════════════════════════
-- Security Center
--   • security_events: sign-in outcomes, password resets, sign-up attempts,
--     bot-check and rate-limit refusals. Written ONLY by trusted server
--     code (service role). Never stores passwords, keys or raw IP addresses
--     (a one-way hash is used to spot repeated sources).
--   • security_alerts: raised automatically for brute-force attempts and
--     fake-profile signals; reviewed by the owner/admins.
--   • Owner/admin functions to list and revoke sign-in sessions and to see
--     which staff accounts have MFA — exposing only safe columns.
-- ════════════════════════════════════════════════════════════════════

create table public.security_events (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in (
    'login_succeeded', 'login_failed', 'mfa_failed', 'password_reset_requested', 'password_changed',
    'signup_attempt', 'signup_blocked', 'bot_check_failed', 'rate_limited', 'session_revoked', 'sessions_revoked_all')),
  email citext,
  user_id uuid references public.profiles (id) on delete set null,
  ip_hash text check (ip_hash ~ '^[0-9a-f]{16,64}$'),
  user_agent text check (length(user_agent) <= 300),
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index security_events_recent_idx on public.security_events (event_type, created_at desc);
create index security_events_email_idx on public.security_events (email, created_at desc);
create index security_events_ip_idx on public.security_events (ip_hash, created_at desc);
alter table public.security_events enable row level security;
create policy "security staff read" on public.security_events for select using (public.has_staff_role(array['owner','admin']::public.staff_role[]));

create table public.security_alerts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('brute_force_account', 'brute_force_source', 'fake_profile_signal', 'staff_without_mfa', 'other')),
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high')),
  subject text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index security_alerts_open_idx on public.security_alerts (status, created_at desc);
alter table public.security_alerts enable row level security;
create policy "security staff read" on public.security_alerts for select using (public.has_staff_role(array['owner','admin']::public.staff_role[]));
create policy "security staff update" on public.security_alerts for update
  using (public.has_staff_role(array['owner','admin']::public.staff_role[]))
  with check (public.has_staff_role(array['owner','admin']::public.staff_role[]));

-- Fake-profile signals feed the existing safety flag queue too.
alter table public.safety_flags drop constraint safety_flags_reason_check;
alter table public.safety_flags add constraint safety_flags_reason_check
  check (reason in ('multiple_reports', 'payment_fraud', 'identity_mismatch', 'spam', 'manual', 'fake_profile_signal'));

-- Automatic detection on each new event.
create or replace function public.detect_suspicious_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if new.event_type = 'login_failed' then
    if new.email is not null then
      select count(*) into n from public.security_events where event_type = 'login_failed' and email = new.email and created_at > now() - interval '15 minutes';
      if n >= 5 and not exists (select 1 from public.security_alerts where kind = 'brute_force_account' and subject = new.email and created_at > now() - interval '1 hour') then
        insert into public.security_alerts (kind, severity, subject, details)
        values ('brute_force_account', 'high', new.email, n || ' failed sign-in attempts in 15 minutes');
      end if;
    end if;
    if new.ip_hash is not null then
      select count(*) into n from public.security_events where event_type = 'login_failed' and ip_hash = new.ip_hash and created_at > now() - interval '15 minutes';
      if n >= 10 and not exists (select 1 from public.security_alerts where kind = 'brute_force_source' and subject = new.ip_hash and created_at > now() - interval '1 hour') then
        insert into public.security_alerts (kind, severity, subject, details)
        values ('brute_force_source', 'high', new.ip_hash, n || ' failed sign-ins from one source (hashed) in 15 minutes, across accounts');
      end if;
    end if;
  elsif new.event_type = 'signup_attempt' and new.ip_hash is not null then
    select count(*) into n from public.security_events where event_type = 'signup_attempt' and ip_hash = new.ip_hash and created_at > now() - interval '24 hours';
    if n >= 3 then
      if not exists (select 1 from public.security_alerts where kind = 'fake_profile_signal' and subject = new.ip_hash and created_at > now() - interval '24 hours') then
        insert into public.security_alerts (kind, severity, subject, details)
        values ('fake_profile_signal', 'medium', new.ip_hash, n || ' sign-ups from one source (hashed) in 24 hours');
      end if;
      if new.user_id is not null then
        insert into public.safety_flags (user_id, reason, details)
        values (new.user_id, 'fake_profile_signal', 'One of several accounts created from the same source within 24 hours')
        on conflict do nothing;
      end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger detect_suspicious after insert on public.security_events for each row execute function public.detect_suspicious_activity();

-- ─── Sessions (owner/admin, or the member for their own account) ───
create or replace function public.list_sessions(target uuid)
returns table (id uuid, created_at timestamptz, last_active timestamptz, aal text, user_agent text, approx_ip text)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if target is distinct from auth.uid() and not public.has_staff_role(array['owner','admin']::public.staff_role[]) then
    raise exception 'Not permitted';
  end if;
  return query
    select s.id, s.created_at, coalesce(s.refreshed_at, s.updated_at, s.created_at), s.aal::text, left(s.user_agent, 200),
           -- Coarse location only: the first two parts of an IPv4 address.
           case when s.ip is null then null when family(s.ip) = 4 then split_part(host(s.ip), '.', 1) || '.' || split_part(host(s.ip), '.', 2) || '.x.x' else 'IPv6' end
    from auth.sessions s where s.user_id = target order by 3 desc;
end;
$$;

create or replace function public.revoke_sessions(target uuid, session_id uuid default null)
returns integer language plpgsql security definer set search_path = public, auth as $$
declare n integer;
begin
  if target is distinct from auth.uid() and not public.has_staff_role(array['owner','admin']::public.staff_role[]) then
    raise exception 'Not permitted';
  end if;
  delete from auth.sessions where user_id = target and (session_id is null or id = session_id);
  get diagnostics n = row_count;
  insert into public.security_events (event_type, user_id, details)
  values (case when session_id is null then 'sessions_revoked_all' else 'session_revoked' end, target,
          jsonb_build_object('count', n, 'by_staff', target is distinct from auth.uid()));
  return n;
end;
$$;

-- Which staff accounts have a verified MFA factor (owner/admin only).
create or replace function public.staff_security_status()
returns table (user_id uuid, email text, roles text, mfa_factors integer, last_sign_in timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.has_staff_role(array['owner','admin']::public.staff_role[]) then
    raise exception 'Not permitted';
  end if;
  return query
    select p.id, p.email::text, string_agg(distinct r.role::text, ', '),
           (select count(*)::int from auth.mfa_factors f where f.user_id = p.id and f.status = 'verified'),
           (select u.last_sign_in_at from auth.users u where u.id = p.id)
    from public.staff_roles r join public.profiles p on p.id = r.user_id
    group by p.id, p.email;
end;
$$;

-- ─── Explicit grants (automatic API access is disabled) ────────────
grant select on public.security_events to authenticated;
grant select, update on public.security_alerts to authenticated;
grant all on public.security_events, public.security_alerts to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on function public.list_sessions(uuid), public.revoke_sessions(uuid, uuid), public.staff_security_status() to authenticated;
revoke execute on function public.list_sessions(uuid), public.revoke_sessions(uuid, uuid), public.staff_security_status() from anon;

-- ─── Launch readiness: security requirements ───────────────────────
insert into public.launch_checklist (key, category, title, description, requires_owner_approval, sort_order) values
  ('sec:turnstile', 'Security', 'Bot protection (Cloudflare Turnstile) keys added', 'Free. Add NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY in Netlify. No nameserver change.', false, 62),
  ('sec:webhook', 'Security', 'Stripe webhook signing secret configured', 'STRIPE_WEBHOOK_SECRET in Netlify; signature verification tested end to end.', false, 63),
  ('sec:smtp', 'Security', 'Account emails sent through Resend (Supabase SMTP)', 'Supabase → Authentication → SMTP: host smtp.resend.com, port 465, user "resend", password = Resend API key.', false, 64),
  ('sec:github', 'Security', 'GitHub secret scanning, push protection & Dependabot alerts on', 'Repository → Settings → Code security.', false, 65),
  ('sec:repo-visibility', 'Security', 'Decide repository visibility', 'The repository is currently public. Consider making it private before launch.', true, 66),
  ('sec:uptime', 'Security', 'Uptime monitoring on /api/health', 'e.g. a free UptimeRobot monitor alerting info@theartofconnect.com.', false, 67),
  ('sec:pentest', 'Security', 'Pre-launch security review', 'Independent review of authentication, payments and data access before launch (recommended).', true, 68)
on conflict (key) do nothing;
