-- ════════════════════════════════════════════════════════════════════
-- Trust, safety & launch readiness (v4)
--   • Identity verification records (third-party provider; we never
--     store identity documents — only the outcome)
--   • Owner switch to require verified identity before In Love
--     matchmaking; unverified members are neither shown nor shown to
--   • Member blocking (hides both directions, prevents connections)
--   • Fraud prevention: rate limiting, daily connection caps, automatic
--     safety flags after repeated reports
--   • Stricter professional credential verification checklist
--   • Versioned legal-document consents
--   • Launch Readiness checklist (owner-only)
-- ════════════════════════════════════════════════════════════════════

-- ─── Owner-controlled safety settings ──────────────────────────────
insert into public.platform_settings (key, value, description) values
  ('identity_verification_live', 'false', 'Use the identity verification provider (incurs per-verification charges)'),
  ('require_identity_for_matchmaking', 'false', 'Require verified identity and age before taking part in In Love matchmaking'),
  ('hide_flagged_from_matchmaking', 'true', 'Hide members with an open safety flag from matchmaking until reviewed'),
  ('report_flag_threshold', '3', 'Open reports within 30 days that automatically flag an account for review'),
  ('max_daily_connection_requests', '20', 'Maximum connection requests a member can send per day, per experience')
on conflict (key) do nothing;

-- ─── Versioned consents ────────────────────────────────────────────
alter table public.consents drop constraint consents_consent_type_check;
alter table public.consents add constraint consents_consent_type_check check (consent_type in (
  'terms', 'privacy', 'membership_agreement', 'community_standards', 'refund_policy', 'safety_policy',
  'professional_agreement', 'matchmaking', 'counseling_disclaimer', 'identity_verification',
  'marketing', 'professional_referral', 'partner_sharing'));

-- ─── Identity verification ─────────────────────────────────────────
-- Only the outcome is stored. Documents and selfies stay with the
-- provider (e.g. Stripe Identity), never in this database.
create table public.identity_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null default 'stripe_identity',
  provider_session_id text not null unique,
  status text not null default 'pending' check (status in ('pending', 'processing', 'verified', 'requires_input', 'canceled', 'failed')),
  age_meets_minimum boolean,
  name_matches_account boolean,
  failure_reason text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index identity_verifications_user_idx on public.identity_verifications (user_id, created_at desc);
create trigger touch_identity before update on public.identity_verifications for each row execute function public.touch_updated_at();
alter table public.identity_verifications enable row level security;
create policy "own verifications" on public.identity_verifications for select
  using (user_id = auth.uid() or public.has_staff_role(array['owner','admin','moderator']::public.staff_role[]));
-- Written only by the server (service role) from the provider's signed webhook.

alter table public.profiles add column identity_verified_at timestamptz;

create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and not public.has_staff_role(array['owner','admin']::public.staff_role[])
     and (new.status is distinct from old.status
          or new.email is distinct from old.email
          or new.account_type is distinct from old.account_type
          or new.age_eligible is distinct from old.age_eligible
          or new.age_verified_at is distinct from old.age_verified_at
          or new.identity_verified_at is distinct from old.identity_verified_at
          or new.referral_code is distinct from old.referral_code
          or new.referred_by_code is distinct from old.referred_by_code) then
    raise exception 'Not permitted to change these account fields';
  end if;
  return new;
end;
$$;

-- ─── Safety flags (fraud & abuse review queue) ─────────────────────
create table public.safety_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('multiple_reports', 'payment_fraud', 'identity_mismatch', 'spam', 'manual')),
  details text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_by uuid references public.profiles (id),
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index one_open_flag_per_reason on public.safety_flags (user_id, reason) where status in ('open', 'reviewing');
alter table public.safety_flags enable row level security;
create policy "safety staff read" on public.safety_flags for select using (public.has_staff_role(array['owner','admin','moderator']::public.staff_role[]));
create policy "safety staff manage" on public.safety_flags for all
  using (public.has_staff_role(array['owner','admin','moderator']::public.staff_role[]))
  with check (public.has_staff_role(array['owner','admin','moderator']::public.staff_role[]));

create or replace function public.has_open_safety_flag(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.safety_flags where user_id = uid and status in ('open', 'reviewing'));
$$;

-- Repeated reports automatically open a review flag.
create or replace function public.flag_after_reports()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.reported_user_id is not null
     and (select count(*) from public.moderation_reports
          where reported_user_id = new.reported_user_id and status in ('open', 'reviewing')
            and created_at > now() - interval '30 days') >= public.setting_int('report_flag_threshold', 3) then
    insert into public.safety_flags (user_id, reason, details)
    values (new.reported_user_id, 'multiple_reports', 'Automatically flagged after repeated reports')
    on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger flag_after_reports after insert on public.moderation_reports for each row execute function public.flag_after_reports();

-- Members may file one report per person per day (prevents report spam).
create unique index one_report_per_day on public.moderation_reports (reporter_id, reported_user_id, ((created_at at time zone 'utc')::date))
  where reported_user_id is not null;

-- ─── Blocking ──────────────────────────────────────────────────────
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;
create policy "manage own blocks" on public.blocks for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy "moderators read blocks" on public.blocks for select using (public.has_staff_role(array['owner','admin','moderator']::public.staff_role[]));

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

-- ─── Matchmaking eligibility ───────────────────────────────────────
create or replace function public.matchmaking_eligible(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select (not public.setting_enabled('require_identity_for_matchmaking')
          or exists (select 1 from public.profiles where id = uid and identity_verified_at is not null))
     and (not public.setting_enabled('hide_flagged_from_matchmaking') or not public.has_open_safety_flag(uid));
$$;

drop policy "members see visible singles" on relationships.profiles;
create policy "members see eligible visible singles" on relationships.profiles for select
  using (user_id = auth.uid()
         or (is_visible and track = 'single' and public.has_experience('relationships')
             and public.matchmaking_eligible(auth.uid()) and public.matchmaking_eligible(user_id)
             and not public.is_blocked_between(auth.uid(), user_id))
         or public.has_staff_role(array['owner','admin','moderator']::public.staff_role[]));

drop policy "members see visible profiles" on business.profiles;
create policy "members see visible profiles" on business.profiles for select
  using (user_id = auth.uid()
         or (is_visible and public.has_experience('business') and not public.is_blocked_between(auth.uid(), user_id))
         or public.has_staff_role(array['owner','admin','moderator']::public.staff_role[]));

drop policy "request connection" on relationships.connections;
create policy "request connection" on relationships.connections for insert
  with check (requester_id = auth.uid() and public.has_experience('relationships')
              and public.matchmaking_eligible(auth.uid()) and public.matchmaking_eligible(recipient_id)
              and not public.is_blocked_between(requester_id, recipient_id));
drop policy "request connection" on business.connections;
create policy "request connection" on business.connections for insert
  with check (requester_id = auth.uid() and public.has_experience('business')
              and not public.is_blocked_between(requester_id, recipient_id));

-- Blocking someone also closes any existing connection with them.
create or replace function public.close_connections_on_block()
returns trigger language plpgsql security definer set search_path = public, relationships, business as $$
begin
  update relationships.connections set status = 'blocked'
    where (requester_id = new.blocker_id and recipient_id = new.blocked_id) or (requester_id = new.blocked_id and recipient_id = new.blocker_id);
  update business.connections set status = 'blocked'
    where (requester_id = new.blocker_id and recipient_id = new.blocked_id) or (requester_id = new.blocked_id and recipient_id = new.blocker_id);
  return new;
end;
$$;
create trigger close_connections_on_block after insert on public.blocks for each row execute function public.close_connections_on_block();

-- Daily cap on connection requests (anti-spam).
create or replace function public.cap_connection_requests()
returns trigger language plpgsql security definer set search_path = public as $$
declare sent integer;
begin
  execute format('select count(*) from %I.connections where requester_id = $1 and created_at > now() - interval ''1 day''', tg_table_schema)
    into sent using new.requester_id;
  if sent >= public.setting_int('max_daily_connection_requests', 20) then
    raise exception 'Daily connection request limit reached';
  end if;
  return new;
end;
$$;
create trigger cap_requests before insert on relationships.connections for each row execute function public.cap_connection_requests();
create trigger cap_requests before insert on business.connections for each row execute function public.cap_connection_requests();

-- ─── Rate limiting (used by public forms and promo-code checks) ────
create table public.rate_limit_events (
  bucket text not null,
  at timestamptz not null default now()
);
create index rate_limit_bucket_idx on public.rate_limit_events (bucket, at);
alter table public.rate_limit_events enable row level security; -- no policies: only the function below touches it

-- Returns true if the action is allowed, and records it.
create or replace function public.rate_limit_hit(bucket text, max_hits integer, window_seconds integer)
returns boolean language plpgsql volatile security definer set search_path = public as $$
declare hits integer;
begin
  if length(bucket) > 200 or max_hits < 1 or window_seconds < 1 or window_seconds > 86400 then
    return false;
  end if;
  delete from public.rate_limit_events where at < now() - interval '1 day';
  select count(*) into hits from public.rate_limit_events r
    where r.bucket = rate_limit_hit.bucket and r.at > now() - make_interval(secs => window_seconds);
  if hits >= max_hits then
    return false;
  end if;
  insert into public.rate_limit_events (bucket) values (rate_limit_hit.bucket);
  return true;
end;
$$;
grant execute on function public.rate_limit_hit(text, integer, integer) to anon, authenticated;

-- ─── Professional credential verification ──────────────────────────
alter table counseling.applications
  add column license_verified boolean not null default false,
  add column license_lookup_url text,
  add column identity_checked boolean not null default false,
  add column disciplinary_check_clear boolean not null default false,
  add column insurance_confirmed boolean not null default false,
  add column references_checked boolean not null default false;

-- A licensed clinician cannot be approved until the license is verified
-- against the issuing board (with the lookup recorded) and identity and
-- disciplinary history are checked.
create or replace function counseling.guard_application_approval()
returns trigger language plpgsql security definer set search_path = public, counseling as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    if not new.identity_checked then
      raise exception 'Confirm the applicant''s identity before approval';
    end if;
    if new.professional_type = 'licensed_clinical'
       and not (new.license_verified and new.disciplinary_check_clear and coalesce(new.license_lookup_url, '') <> '') then
      raise exception 'Verify the license with the issuing board (record the lookup) and check disciplinary history before approval';
    end if;
  end if;
  return new;
end;
$$;
create trigger guard_approval before update on counseling.applications for each row execute function counseling.guard_application_approval();

-- ─── Launch readiness checklist (owner-managed) ────────────────────
create table public.launch_checklist (
  key text primary key check (key ~ '^[a-z0-9:_-]{2,60}$'),
  category text not null,
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'done', 'blocked', 'not_applicable')),
  requires_owner_approval boolean not null default false,
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  note text,
  sort_order integer not null default 100,
  updated_at timestamptz not null default now()
);
create trigger touch_checklist before update on public.launch_checklist for each row execute function public.touch_updated_at();
alter table public.launch_checklist enable row level security;
create policy "staff read checklist" on public.launch_checklist for select using (public.has_staff_role(array['owner','admin','finance']::public.staff_role[]));
create policy "owner manages checklist" on public.launch_checklist for all using (public.is_owner()) with check (public.is_owner());

insert into public.launch_checklist (key, category, title, description, requires_owner_approval, sort_order) values
  ('imagery', 'Brand & content', 'Original imagery of diverse adults 40+', 'Licensed photography for In Business, In Life and In Love; regenerate share cards afterwards.', true, 10),
  ('pricing', 'Brand & content', 'Membership pricing approved', 'All experiences, tiers, couples upgrade, add-ons and professional packages priced; then PUBLISH.', true, 20),
  ('legal:terms', 'Legal review', 'Terms of Service reviewed by counsel', null, true, 30),
  ('legal:privacy', 'Legal review', 'Privacy Policy reviewed by counsel', null, true, 31),
  ('legal:membership', 'Legal review', 'Membership Agreement reviewed by counsel', null, true, 32),
  ('legal:community', 'Legal review', 'Community Standards reviewed by counsel', null, true, 33),
  ('legal:professional', 'Legal review', 'Professional Agreement reviewed by counsel', null, true, 34),
  ('legal:refund', 'Legal review', 'Refund & Cancellation Policy reviewed by counsel', null, true, 35),
  ('legal:safety', 'Legal review', 'Safety Policy reviewed by counsel', null, true, 36),
  ('legal:disclaimers', 'Legal review', 'Matchmaking & counseling disclaimers reviewed by counsel', null, true, 37),
  ('legal:clinical-scope', 'Legal review', 'Clinical scope & HIPAA position confirmed', 'Confirm whether any client records will be kept on the platform before enabling professional features.', true, 38),
  ('ops:support', 'Operations', 'Customer support process ready', 'Who answers info@theartofconnect.com, response times, escalation.', false, 50),
  ('ops:moderation', 'Operations', 'Moderation & safety response plan', 'Who reviews reports and safety flags, and how quickly.', false, 51),
  ('ops:credentials', 'Operations', 'Professional credential verification procedure', 'License board lookups, identity checks, disciplinary history, insurance, references.', false, 52),
  ('ops:mfa', 'Security', 'Owner multi-factor authentication enabled', 'Enable MFA for every staff account in Supabase.', false, 60),
  ('ops:backups', 'Security', 'Database backups enabled', 'Supabase Pro daily backups / point-in-time recovery.', false, 61),
  ('ops:test-purchase', 'Payments', 'End-to-end test purchase completed (Stripe test mode)', 'Build a membership, register, pay with a test card, change and cancel.', true, 70),
  ('ops:launch', 'Launch', 'Final launch authorization', 'Release LAUNCH_LOCK and turn on registration and live payments.', true, 99);
