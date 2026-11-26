-- Elite Concierge Society: BY INVITATION ONLY.
-- Three admission pathways (earned, expedited, founder), one distinction. Verification evidence is private to the
-- owner; members see only their own progress. The Elite badge is issued, suspended and revoked only by the system
-- and the owner. Membership checkout for Elite requires a valid invitation (enforced here and on the server).
-- Thresholds other than the approved $500,000 personal income, the $995 expedited fee and the progression
-- milestones are owner-configurable PROPOSALS and the fee stays inactive until the owner approves it.

-- ─── Settings ─────────────────────────────────────────────────────
create table public.elite_settings (
  id boolean primary key default true check (id),
  tagline text not null default 'Distinction. Intention. Influence.',
  -- Each threshold: amount (USD) and whether the owner has approved it.
  thresholds jsonb not null default '{
    "personal_income":   {"amount": 500000,  "approved": true},
    "business_revenue":  {"amount": 5000000, "approved": false},
    "net_worth":         {"amount": 5000000, "approved": false},
    "investable_assets": {"amount": 2000000, "approved": false}
  }',
  require_identity boolean not null default true,
  min_membership_months integer not null default 6 check (min_membership_months between 0 and 60),
  min_discovery_answers integer not null default 20 check (min_discovery_answers between 0 and 500),
  progression_approved boolean not null default false,
  expedited_fee_cents integer not null default 99500 check (expedited_fee_cents >= 0),
  expedited_fee_active boolean not null default false,
  invitation_days integer not null default 30 check (invitation_days between 1 and 365),
  evidence_retention_days integer not null default 90 check (evidence_retention_days between 1 and 3650),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);
insert into public.elite_settings default values on conflict do nothing;

-- ─── Candidates ───────────────────────────────────────────────────
create table public.elite_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles (id) on delete cascade,
  -- Founder invitations for people who aren't members yet.
  invitee_email text check (invitee_email is null or invitee_email = lower(invitee_email)),
  invitee_name text check (char_length(invitee_name) <= 120),
  pathway text not null check (pathway in ('earned', 'expedited', 'founder')),
  qualification text check (qualification in ('personal_income', 'business_owner', 'executive', 'net_worth', 'investor', 'professional', 'retiree', 'founder_selected')),
  status text not null default 'not_started' check (status in (
    'not_started', 'preliminary', 'verification_pending', 'info_required', 'automated_verified', 'owner_verified',
    'manual_review', 'qualification_approved', 'invitation_issued', 'invitation_accepted', 'membership_activated', 'expired', 'revoked')),
  -- Self-screening keeps no amounts: only that the member said they meet the chosen pathway.
  screening_meets boolean,
  fee_waived boolean not null default false,
  fee_paid_at timestamptz,
  invitation_expires_at timestamptz,
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or invitee_email is not null)
);
create unique index elite_candidates_invitee on public.elite_candidates (invitee_email) where user_id is null;

-- Confidential owner notes (reasons for discretionary decisions). Never visible to members.
create table public.elite_owner_notes (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.elite_candidates (id) on delete cascade,
  note text not null check (char_length(note) between 1 and 4000),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.elite_evidence (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.elite_candidates (id) on delete cascade,
  kind text not null check (kind in ('identity', 'business_registration', 'business_financials', 'employment', 'license', 'financial_verification', 'accomplishment', 'other')),
  storage_path text check (storage_path ~ '^elite/[0-9a-f-]{36}/[A-Za-z0-9._-]{4,120}$'),
  description text check (char_length(description) <= 1000),
  status text not null default 'submitted' check (status in ('submitted', 'automated_verified', 'owner_verified', 'rejected', 'needs_info')),
  reviewer_note text check (char_length(reviewer_note) <= 1000),
  reviewed_at timestamptz,
  delete_after timestamptz,
  created_at timestamptz not null default now()
);

create table public.elite_badges (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'suspended', 'revoked', 'expired')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.elite_appeals (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.elite_candidates (id) on delete cascade,
  message text not null check (char_length(message) between 1 and 4000),
  status text not null default 'open' check (status in ('open', 'upheld', 'denied')),
  response text check (char_length(response) <= 4000),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

-- ─── Security ─────────────────────────────────────────────────────
alter table public.elite_settings enable row level security;
alter table public.elite_candidates enable row level security;
alter table public.elite_owner_notes enable row level security;
alter table public.elite_evidence enable row level security;
alter table public.elite_badges enable row level security;
alter table public.elite_appeals enable row level security;

create policy "members read elite settings" on public.elite_settings for select to authenticated using (true);
create policy "owner manages elite settings" on public.elite_settings for update to authenticated using (public.has_staff_role(array['owner']::public.staff_role[])) with check (public.has_staff_role(array['owner']::public.staff_role[]));
create policy "member reads own candidacy" on public.elite_candidates for select to authenticated using (user_id = auth.uid() or public.has_staff_role(array['owner']::public.staff_role[]));
create policy "owner manages candidates" on public.elite_candidates for all to authenticated using (public.has_staff_role(array['owner']::public.staff_role[])) with check (public.has_staff_role(array['owner']::public.staff_role[]));
create policy "owner only notes" on public.elite_owner_notes for all to authenticated using (public.has_staff_role(array['owner']::public.staff_role[])) with check (public.has_staff_role(array['owner']::public.staff_role[]));
create policy "member sees own evidence status" on public.elite_evidence for select to authenticated
  using (public.has_staff_role(array['owner']::public.staff_role[]) or exists (select 1 from public.elite_candidates c where c.id = candidate_id and c.user_id = auth.uid()));
create policy "member submits own evidence" on public.elite_evidence for insert to authenticated
  with check (status = 'submitted' and reviewer_note is null and exists (select 1 from public.elite_candidates c where c.id = candidate_id and c.user_id = auth.uid() and c.status not in ('revoked', 'membership_activated')));
create policy "owner reviews evidence" on public.elite_evidence for update to authenticated using (public.has_staff_role(array['owner']::public.staff_role[])) with check (public.has_staff_role(array['owner']::public.staff_role[]));
create policy "owner deletes evidence" on public.elite_evidence for delete to authenticated using (public.has_staff_role(array['owner']::public.staff_role[]));
create policy "owner manages badges" on public.elite_badges for all to authenticated using (public.has_staff_role(array['owner']::public.staff_role[])) with check (public.has_staff_role(array['owner']::public.staff_role[]));
create policy "member reads own badge" on public.elite_badges for select to authenticated using (user_id = auth.uid());
create policy "member appeals own candidacy" on public.elite_appeals for insert to authenticated
  with check (status = 'open' and response is null and exists (select 1 from public.elite_candidates c where c.id = candidate_id and c.user_id = auth.uid()));
create policy "member reads own appeals" on public.elite_appeals for select to authenticated
  using (public.has_staff_role(array['owner']::public.staff_role[]) or exists (select 1 from public.elite_candidates c where c.id = candidate_id and c.user_id = auth.uid()));
create policy "owner decides appeals" on public.elite_appeals for update to authenticated using (public.has_staff_role(array['owner']::public.staff_role[])) with check (public.has_staff_role(array['owner']::public.staff_role[]));

revoke all on public.elite_settings, public.elite_candidates, public.elite_owner_notes, public.elite_evidence, public.elite_badges, public.elite_appeals from public, anon;
grant select, update on public.elite_settings to authenticated;
grant select, insert, update, delete on public.elite_candidates, public.elite_owner_notes, public.elite_badges to authenticated;
grant select, insert, update, delete on public.elite_evidence to authenticated;
grant select, insert, update on public.elite_appeals to authenticated;
grant all on public.elite_settings, public.elite_candidates, public.elite_owner_notes, public.elite_evidence, public.elite_badges, public.elite_appeals to service_role;

-- Private evidence storage: members upload into their own candidacy folder; only the owner can open files.
insert into storage.buckets (id, name, public) values ('elite-evidence', 'elite-evidence', false) on conflict (id) do nothing;
create policy "member uploads own elite evidence" on storage.objects for insert to authenticated
  with check (bucket_id = 'elite-evidence' and exists (select 1 from public.elite_candidates c where c.user_id = auth.uid() and (storage.foldername(name))[2] = c.id::text));
create policy "owner reads elite evidence" on storage.objects for select to authenticated
  using (bucket_id = 'elite-evidence' and public.has_staff_role(array['owner']::public.staff_role[]));
create policy "owner deletes elite evidence" on storage.objects for delete to authenticated
  using (bucket_id = 'elite-evidence' and public.has_staff_role(array['owner']::public.staff_role[]));

create trigger touch_elite_candidates before update on public.elite_candidates for each row execute function public.touch_updated_at();

-- ─── Public: which of these people hold an active Elite badge (nothing else is revealed) ─────
create or replace function public.elite_badge_holders(p_users uuid[])
returns setof uuid language sql stable security definer set search_path = public as $$
  select user_id from public.elite_badges
  where user_id = any(p_users) and status = 'active' and (expires_at is null or expires_at > now());
$$;
revoke all on function public.elite_badge_holders(uuid[]) from public, anon;
grant execute on function public.elite_badge_holders(uuid[]) to authenticated, service_role;

-- ─── Eligibility evaluation ───────────────────────────────────────
-- Returns each requirement for a member, and issues the invitation automatically when an earned or expedited
-- candidacy satisfies every mandatory requirement. Never upgrades or charges anyone.
create or replace function public.elite_evaluate(p_user uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := coalesce(p_user, auth.uid());
  s public.elite_settings; c public.elite_candidates; p public.profiles;
  identity_ok boolean; qualification_ok boolean; months numeric; answers integer; standing_ok boolean; age_ok boolean;
  progression_ok boolean; fee_ok boolean; ready boolean;
begin
  if uid is null then return null; end if;
  if p_user is not null and p_user <> coalesce(auth.uid(), p_user) and not public.has_staff_role(array['owner']::public.staff_role[]) then
    raise exception 'Not permitted';
  end if;
  select * into s from public.elite_settings;
  select * into p from public.profiles where id = uid;
  select * into c from public.elite_candidates where user_id = uid for update;
  age_ok := coalesce(p.age_eligible, false);
  standing_ok := p.status = 'active';
  identity_ok := not s.require_identity
    or exists (select 1 from public.identity_verifications v where v.user_id = uid and v.status = 'verified')
    or (c.id is not null and exists (select 1 from public.elite_evidence e where e.candidate_id = c.id and e.kind = 'identity' and e.status in ('owner_verified', 'automated_verified')));
  qualification_ok := c.id is not null and (
    c.status in ('qualification_approved', 'invitation_issued', 'invitation_accepted', 'membership_activated')
    or exists (select 1 from public.elite_evidence e where e.candidate_id = c.id and e.kind <> 'identity' and e.status in ('owner_verified', 'automated_verified')));
  select coalesce(max(extract(epoch from (now() - s2.created_at)) / 2629800), 0) into months
    from public.subscriptions s2 where s2.user_id = uid and s2.status in ('active', 'trialing');
  select count(*) into answers from public.discovery_answers d where d.user_id = uid;
  progression_ok := months >= s.min_membership_months and answers >= s.min_discovery_answers;
  fee_ok := c.id is not null and (c.fee_waived or c.fee_paid_at is not null);
  ready := c.id is not null and age_ok and standing_ok and identity_ok and qualification_ok and c.status not in ('revoked', 'expired')
    and case c.pathway when 'earned' then progression_ok when 'expedited' then fee_ok else c.status = 'qualification_approved' end;
  if ready and c.status not in ('invitation_issued', 'invitation_accepted', 'membership_activated') then
    perform set_config('app.elite_system', 'on', true);
    update public.elite_candidates set status = 'invitation_issued', invitation_expires_at = now() + make_interval(days => s.invitation_days) where id = c.id;
    c.status := 'invitation_issued';
  end if;
  return jsonb_build_object(
    'candidate', c.id is not null, 'pathway', c.pathway, 'status', c.status,
    'age', age_ok, 'standing', standing_ok, 'identity', identity_ok, 'qualification', qualification_ok,
    'months', round(months, 1), 'min_months', s.min_membership_months, 'answers', answers, 'min_answers', s.min_discovery_answers,
    'progression', progression_ok, 'fee', fee_ok, 'expedited_available', c.status in ('preliminary', 'verification_pending', 'info_required', 'manual_review') and c.screening_meets,
    'invitation_expires_at', c.invitation_expires_at);
end $$;
revoke all on function public.elite_evaluate(uuid) from public, anon;
grant execute on function public.elite_evaluate(uuid) to authenticated, service_role;

-- A member's private preliminary screening. Stores only the chosen pathway and whether they say they meet it.
create or replace function public.elite_screen(p_qualification text, p_meets boolean, p_pathway text)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c public.elite_candidates;
begin
  if uid is null then raise exception 'Please sign in'; end if;
  if p_pathway not in ('earned', 'expedited') or p_qualification not in ('personal_income', 'business_owner', 'executive', 'net_worth', 'investor', 'professional', 'retiree') then
    raise exception 'Unknown pathway';
  end if;
  select * into c from public.elite_candidates where user_id = uid;
  if c.status in ('revoked') then return 'revoked'; end if;
  if c.status in ('invitation_issued', 'invitation_accepted', 'membership_activated') then return c.status; end if;
  perform set_config('app.elite_system', 'on', true);
  insert into public.elite_candidates (user_id, pathway, qualification, screening_meets, status)
    values (uid, p_pathway, p_qualification, p_meets, case when p_meets then 'preliminary' else 'not_started' end)
  on conflict (user_id) do update set pathway = excluded.pathway, qualification = excluded.qualification, screening_meets = excluded.screening_meets,
    status = case when public.elite_candidates.status in ('qualification_approved', 'owner_verified', 'automated_verified', 'manual_review', 'verification_pending', 'info_required')
                  then public.elite_candidates.status else excluded.status end;
  return case when p_meets then 'preliminary' else 'not_started' end;
end $$;
revoke all on function public.elite_screen(text, boolean, text) from public, anon;
grant execute on function public.elite_screen(text, boolean, text) to authenticated;

-- The member accepts their invitation (this authorizes nothing financial; checkout is a separate, explicit step).
create or replace function public.elite_accept_invitation()
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c public.elite_candidates;
begin
  select * into c from public.elite_candidates where user_id = uid for update;
  if c.id is null or c.status <> 'invitation_issued' then return 'no_invitation'; end if;
  perform set_config('app.elite_system', 'on', true);
  if c.invitation_expires_at is not null and c.invitation_expires_at < now() then
    update public.elite_candidates set status = 'expired' where id = c.id; return 'expired';
  end if;
  update public.elite_candidates set status = 'invitation_accepted' where id = c.id;
  return 'accepted';
end $$;
revoke all on function public.elite_accept_invitation() from public, anon;
grant execute on function public.elite_accept_invitation() to authenticated;

-- Only an accepted, unexpired invitation (or an active Elite member) may check out Elite Concierge.
create or replace function public.elite_checkout_allowed(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.elite_candidates c where c.user_id = p_user and c.status in ('invitation_accepted', 'membership_activated')
                 and (c.invitation_expires_at is null or c.invitation_expires_at > now() or c.status = 'membership_activated'));
$$;
revoke all on function public.elite_checkout_allowed(uuid) from public, anon, authenticated;
grant execute on function public.elite_checkout_allowed(uuid) to service_role;

-- Members can't change their own candidacy decisions. Only the owner, and the system functions in this file
-- (which set a transaction-local flag), can.
create or replace function public.guard_elite_candidate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.has_staff_role(array['owner']::public.staff_role[])
     and coalesce(current_setting('app.elite_system', true), '') <> 'on' then
    raise exception 'Not permitted to change Elite decisions';
  end if;
  if new.status is distinct from old.status and new.status in ('qualification_approved', 'owner_verified', 'revoked') then
    new.decided_by := coalesce(auth.uid(), new.decided_by); new.decided_at := now();
  end if;
  return new;
end $$;
create trigger guard_elite_candidate before update on public.elite_candidates for each row execute function public.guard_elite_candidate();

-- Activation: a paid Elite Concierge subscription for an invited member activates the badge; ending it expires it.
create or replace function public.elite_subscription_sync()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.tier_slug <> 'elite-concierge' then return new; end if;
  perform set_config('app.elite_system', 'on', true);
  if new.status in ('active', 'trialing') and public.elite_checkout_allowed(new.user_id) then
    update public.elite_candidates set status = 'membership_activated' where user_id = new.user_id and status <> 'membership_activated';
    insert into public.elite_badges (user_id, status) values (new.user_id, 'active')
      on conflict (user_id) do update set status = case when public.elite_badges.status in ('suspended', 'revoked') then public.elite_badges.status else 'active' end, updated_at = now();
  elsif new.status in ('canceled', 'incomplete') then
    update public.elite_badges set status = 'expired', updated_at = now() where user_id = new.user_id and status = 'active';
  end if;
  perform set_config('app.elite_system', 'off', true);
  return new;
end $$;
create trigger elite_subscription_sync after insert or update of status, tier_slug on public.subscriptions for each row execute function public.elite_subscription_sync();

-- Elite Concierge is BY INVITATION ONLY.
update public.membership_packages set highlight = 'By Invitation Only', tagline = 'Distinction. Intention. Influence.' where slug = 'elite-concierge';

-- A founder invitation to someone who wasn't a member yet attaches to their account when they join with that email.
create or replace function public.elite_link_invitee()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.elite_system', 'on', true);
  update public.elite_candidates set user_id = new.id, invitee_email = null
    where invitee_email = lower(new.email) and user_id is null
      and not exists (select 1 from public.elite_candidates x where x.user_id = new.id);
  perform set_config('app.elite_system', 'off', true);
  return new;
end $$;
create trigger elite_link_invitee after insert on public.profiles for each row execute function public.elite_link_invitee();
