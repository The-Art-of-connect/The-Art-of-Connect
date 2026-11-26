-- Membership access v2 (founder directive 14, November 26, 2026). Supersedes earlier free-membership decisions.
--   • Complimentary: The Art of Becoming, including The Art of Self and standard self-guided content, safety resources
--     and access to seek professional counseling.
--   • Paid membership or an active 15-day trial: social and professional networking, singles, couples, communities,
--     events, messaging, member discovery and personalized Journey.
--   • A society choice at sign-up records interest only; it no longer grants free society access.

-- ─── Retire packages that included the now-free Art of Becoming ───────────────────────────
update public.membership_packages set is_active = false
  where slug in ('art-of-becoming', 'business-life', 'life-love', 'complete-society');

-- ─── Free society access ends (there are no member accounts with it today) ────────────────
delete from public.experience_access where source = 'free_tier';

-- ─── Experience checks ─────────────────────────────────────────────────────────────────
-- The Art of Becoming (counseling experience) is complimentary for every active account. Business and
-- relationships require a paid membership, trial, comp or owner grant (never the retired free tier).
create or replace function public.has_experience(exp public.experience)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when exp = 'counseling' then exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active')
    else exists (
      select 1 from public.experience_access a
      join public.profiles p on p.id = a.user_id
      where a.user_id = auth.uid() and a.experience = exp and a.status = 'active' and a.source <> 'free_tier'
        and p.status = 'active' and (a.expires_at is null or a.expires_at > now()))
  end and public.setting_enabled(exp::text || '_live');
$$;

-- A paid membership or active trial (any paid experience), comp or owner grant; staff keep access to moderate.
create or replace function public.has_paid_membership(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles pr where pr.id = p and pr.status = 'active') and (
    exists (select 1 from public.experience_access a where a.user_id = p and a.status = 'active' and a.source <> 'free_tier'
              and a.experience in ('business', 'relationships') and (a.expires_at is null or a.expires_at > now()))
    or exists (select 1 from public.staff_roles s where s.user_id = p));
$$;
revoke all on function public.has_paid_membership(uuid) from public, anon;
grant execute on function public.has_paid_membership(uuid) to authenticated, service_role;

-- The social ecosystem: only members with a paid membership or active trial take part, or appear to others.
create or replace function public.social_member(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_paid_membership(p);
$$;

-- Defence in depth: every social table is closed to accounts without paid access (restrictive policies are ANDed
-- with the existing ones). Circle and category descriptions stay readable so free members can learn what's included.
-- Reports stay open so anyone can raise a safety concern.
do $$
declare t text;
begin
  foreach t in array array['social_profiles', 'social_connections', 'social_follows', 'social_preferences', 'social_circle_members',
    'social_events', 'social_event_rsvps', 'social_posts', 'social_reactions', 'social_saves', 'social_comments', 'social_photos',
    'social_conversations', 'social_conversation_members', 'social_messages'] loop
    execute format('create policy "paid membership or trial" on public.%I as restrictive for all to authenticated
      using (public.social_member(auth.uid())) with check (public.social_member(auth.uid()))', t);
  end loop;
end $$;
create policy "member photos need paid membership or trial" on storage.objects as restrictive for insert to authenticated
  with check (bucket_id <> 'member-photos' or public.social_member(auth.uid()));

-- ─── Society change: records interest only ──────────────────────────────────────────────
create or replace function public.change_primary_society(p_to text)
returns text language plpgsql security definer set search_path = public, relationships as $$
declare
  uid uuid := auth.uid();
  cur text; st text; dob date; yrs int; recent int;
begin
  if uid is null then raise exception 'Please sign in.'; end if;
  if p_to not in ('business', 'singles', 'couples') then raise exception 'Unknown society.'; end if;
  select primary_society, status into cur, st from public.profiles where id = uid for update;
  if st is distinct from 'active' then raise exception 'Your account is not active.'; end if;
  if cur = p_to then raise exception 'You are already in that society.'; end if;
  select count(*) into recent from public.society_transitions where user_id = uid and created_at > now() - interval '30 days';
  if recent >= 3 then raise exception 'You have changed societies several times recently. Please contact us if you need help.'; end if;

  select date_of_birth into dob from public.member_private where user_id = uid;
  if dob is null then raise exception 'We need your verified date of birth before changing societies.'; end if;
  yrs := date_part('year', age(current_date, dob))::int;
  if yrs < public.setting_int('minimum_member_age', 21) then raise exception 'The Art of Connect is for adults % and older.', public.setting_int('minimum_member_age', 21); end if;
  if p_to = 'singles' and yrs < public.setting_int('minimum_singles_age', 30) then
    raise exception 'The Personal Society singles experience is for members % and older.', public.setting_int('minimum_singles_age', 30);
  end if;
  if p_to = 'singles' and exists (select 1 from relationships.couple_members where user_id = uid) then
    raise exception 'Your account is linked to a partner. Please end the couple link before joining singles.';
  end if;

  -- Membership access v2: a society choice records interest only. Society access comes from a paid membership or trial.
  delete from public.experience_access where user_id = uid and source = 'free_tier';

  -- Couples are never in singles matchmaking; returning to singles starts hidden until the member chooses to be visible.
  update relationships.profiles set track = case when p_to = 'couples' then 'couple' else 'single' end, is_visible = false
    where user_id = uid and p_to in ('singles', 'couples');

  perform set_config('app.society_transition', 'on', true);
  update public.profiles set primary_society = p_to where id = uid;
  perform set_config('app.society_transition', 'off', true);
  insert into public.society_transitions (user_id, from_society, to_society) values (uid, cur, p_to);
  return p_to;
end $$;
revoke all on function public.change_primary_society(text) from public, anon;
grant execute on function public.change_primary_society(text) to authenticated;

-- ─── 15-day trial: once per member, every paid membership except Elite ─────────────────────
alter table public.subscriptions add column if not exists trial_end timestamptz;
create table public.membership_trials (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  package_slug text not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'converted', 'cancelled', 'ended')),
  checkout_session text,
  stripe_subscription_id text unique,
  started_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.membership_trials enable row level security;
create policy "member sees own trial; owner audits" on public.membership_trials for select
  using (user_id = auth.uid() or public.has_staff_role(array['owner', 'finance']::public.staff_role[]));
revoke all on public.membership_trials from public, anon;
grant select on public.membership_trials to authenticated;
grant all on public.membership_trials to service_role;

-- Whether a member may still start a trial: never used one, and never had a membership.
create or replace function public.trial_available(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.membership_trials t where t.user_id = p and t.status <> 'pending')
     and not exists (select 1 from public.subscriptions s where s.user_id = p and s.kind = 'member');
$$;
revoke all on function public.trial_available(uuid) from public, anon;
grant execute on function public.trial_available(uuid) to authenticated, service_role;

-- Reserves the trial for one checkout. A pending reservation can be replaced (abandoned checkout); a used trial cannot.
create or replace function public.trial_reserve(p uuid, p_package text, p_session text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_package = 'elite-concierge' or not public.trial_available(p) then return false; end if;
  insert into public.membership_trials (user_id, package_slug, checkout_session) values (p, p_package, p_session)
    on conflict (user_id) do update set package_slug = excluded.package_slug, checkout_session = excluded.checkout_session, updated_at = now()
    where public.membership_trials.status = 'pending';
  return true;
end $$;
revoke all on function public.trial_reserve(uuid, text, text) from public, anon, authenticated;
grant execute on function public.trial_reserve(uuid, text, text) to service_role;

-- Journey: members on an active trial may use their membership's Journey allowance (all existing budget caps apply).
update public.journey_settings set entitled_statuses = array['active', 'trialing'] where not ('trialing' = any(entitled_statuses));

-- ─── Tracker and QA (honest stages; nothing is marked operational or owner-approved) ─────────
insert into public.dev_tracker (key, area, title, detail, status, next_step, sort_order, designed, built, tests_passed, merged, deployed, operational, awaiting) values
  ('membership-access-v2', 'Membership', 'Membership access v2: Becoming free, everything interactive paid',
   'The Art of Becoming (with The Art of Self, self-guided content, safety resources and counseling access) is complimentary. Social, professional, singles, couples, circles, events, messaging, member discovery and personalized Journey require a paid membership or active trial: enforced in navigation, pages, server actions and database policies. Retired bundles that included Becoming.',
   'deployed', 'Owner: review as a free test account and as a trial test account.', 440, true, true, true, true, true, false, 'owner'),
  ('membership-trial', 'Membership', '15-day trial with card on file',
   'One trial per member, every paid membership except Elite. Card required at checkout; terms, the first charge date and price, and how to cancel are shown before enrollment. Reminder email before the trial ends. Cancelling before day 16 means no charge. A failed payment pauses paid access (The Art of Becoming stays) until the account is current.',
   'deployed', 'Owner: start a trial in Stripe Sandbox with a test account, cancel one, and let one convert using a test clock.', 441, true, true, true, true, true, false, 'owner')
on conflict (key) do nothing;

insert into public.qa_features (key, department, title, tracker_key, href, purpose, steps, expected, sort) values
  ('membership-access-v2', 'account', 'Only The Art of Becoming is free', 'membership-access-v2', '/membership',
    'Free accounts get The Art of Becoming; every interactive experience needs a paid membership or trial.',
    array['Open Membership: The Art of Becoming shows FREE; the three retired bundles are gone.', 'As a free test account: The Art of Self, Wellness, Safety and Counseling open.', 'As a free test account: Connect, Relationships, Professional and Journey show the membership/trial invitation instead of the page.', 'Menu tags read Free or Paid membership as appropriate.']::text[],
    'Free accounts can learn about paid features but cannot take part until they start a membership or trial.', 440),
  ('membership-trial', 'financial', '15-day trial (Sandbox)', 'membership-trial', '/membership#build',
    'A card is required, one trial per member, Elite excluded, clear terms before enrollment.',
    array['As a new test account, build a membership: the summary shows 15 days free, the first charge date and amount, and cancel-anytime terms.', 'Complete Stripe Sandbox checkout with a test card: status shows Trial and paid pages open.', 'Try a second trial on the same account: checkout charges normally (no second trial).', 'Cancel during the trial: no charge; access ends on the trial end date.', 'Use test card 4000 0000 0000 0341 and let the trial convert: payment fails and only The Art of Becoming remains until paid.']::text[],
    'Trials behave exactly as disclosed; no real charges (Sandbox only).', 441)
on conflict (key) do nothing;
