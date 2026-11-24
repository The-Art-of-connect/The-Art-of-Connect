-- ════════════════════════════════════════════════════════════════════
-- The Art of Connect — Foundation schema
--
-- Data is split into four zones:
--   public        core identity, staff roles, memberships, payments, settings
--   relationships dating profiles & compatibility (Relationships experience)
--   business      professional profiles & connections (Business experience)
--   counseling    counselor marketplace + CONFIDENTIAL client data
--
-- Counseling is deliberately isolated: no table outside the counseling
-- schema references counseling data, counseling client profiles do not
-- reuse dating/business profile data, and clinical session notes are
-- readable ONLY by the counselor who wrote them (not even the owner).
--
-- Every table has row-level security (RLS) enabled. Default = deny.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";
create extension if not exists "citext";

create schema if not exists relationships;
create schema if not exists business;
create schema if not exists counseling;

-- ─── Enums ──────────────────────────────────────────────────────────
create type public.staff_role as enum ('owner', 'admin', 'support', 'moderator', 'finance');
create type public.experience as enum ('relationships', 'business', 'counseling');
create type public.access_status as enum ('active', 'suspended', 'revoked');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'paused');
create type public.plan_audience as enum ('member', 'counselor');
create type public.account_status as enum ('active', 'suspended', 'closed');

-- ─── Core identity ──────────────────────────────────────────────────
-- Minimal, experience-neutral account record. Experience-specific
-- details live in each experience's own schema.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email citext not null unique,
  display_name text,
  status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.staff_role not null,
  granted_by uuid references public.profiles (id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- Per-experience permissions. A member only sees an experience they hold
-- an active grant for. Grants come from a subscription or from the owner.
create table public.experience_access (
  user_id uuid not null references public.profiles (id) on delete cascade,
  experience public.experience not null,
  status public.access_status not null default 'active',
  source text not null check (source in ('subscription', 'owner_grant', 'referral', 'comp')),
  granted_by uuid references public.profiles (id),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, experience)
);

-- ─── Platform settings & launch controls ───────────────────────────
create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (key, value, description) values
  ('registrations_open', 'false', 'Allow the public to create accounts'),
  ('payments_live',      'false', 'Accept real (live-mode) payments'),
  ('relationships_live', 'false', 'Relationships experience open to members'),
  ('business_live',      'false', 'Business experience open to members'),
  ('counseling_live',    'false', 'Counseling marketplace open to clients and counselors'),
  ('counselor_applications_open', 'false', 'Accept counselor provider applications'),
  ('maintenance_mode',   'false', 'Show maintenance notice to non-staff');

-- Emails allowed to create an account while registrations are closed
-- (the owner, staff, invited testers).
create table public.signup_allowlist (
  email citext primary key,
  note text,
  added_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ─── Membership packages, subscriptions, payments ──────────────────
create table public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  audience public.plan_audience not null default 'member',
  description text,
  experiences public.experience[] not null default '{}',
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'usd',
  billing_interval text not null check (billing_interval in ('month', 'year')),
  stripe_price_id text,
  is_active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Draft packages (inactive). The owner sets final prices in the portal.
insert into public.membership_plans (slug, name, audience, description, experiences, price_cents, billing_interval, sort_order) values
  ('connect',     'Connect',          'member',    'One experience of your choice.',               '{}',                                        0, 'month', 1),
  ('signature',   'Signature',        'member',    'Relationships and Business, together.',        '{relationships,business}',                  0, 'month', 2),
  ('atelier',     'Atelier',          'member',    'Every experience, with concierge priority.',   '{relationships,business,counseling}',       0, 'month', 3),
  ('provider',    'Provider',         'counselor', 'Verified counselor listing and scheduling.',   '{counseling}',                              0, 'month', 4),
  ('provider-pro','Provider Premier', 'counselor', 'Featured placement and advanced practice tools.','{counseling}',                            0, 'month', 5);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid not null references public.membership_plans (id),
  status public.subscription_status not null,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  amount_cents integer not null,
  currency text not null default 'usd',
  status text not null,
  livemode boolean not null default false,
  stripe_payment_intent_id text unique,
  stripe_invoice_id text,
  created_at timestamptz not null default now()
);

-- ─── Growth: waitlist, referrals, promotions ───────────────────────
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  full_name text,
  interests public.experience[] not null default '{}',
  is_counselor boolean not null default false,
  source text,
  created_at timestamptz not null default now()
);

-- Owner-controlled cross-experience referrals.
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  referrer_id uuid references public.profiles (id) on delete set null,
  referred_user_id uuid references public.profiles (id) on delete set null,
  from_experience public.experience,
  to_experience public.experience,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'redeemed')),
  reviewed_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  percent_off integer check (percent_off between 1 and 100),
  amount_off_cents integer check (amount_off_cents > 0),
  applies_to uuid[] not null default '{}',
  starts_at timestamptz,
  ends_at timestamptz,
  max_redemptions integer,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  check ((percent_off is null) <> (amount_off_cents is null))
);

-- ─── Support & moderation ──────────────────────────────────────────
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  email citext not null,
  subject text not null,
  body text not null,
  -- Support tickets never carry counseling details; the category tells
  -- staff only which experience the question is about.
  category text not null default 'general' check (category in ('general', 'billing', 'account', 'relationships', 'business', 'counseling', 'safety')),
  status text not null default 'open' check (status in ('open', 'pending', 'resolved', 'closed')),
  assigned_to uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  reported_user_id uuid references public.profiles (id) on delete set null,
  experience public.experience not null check (experience <> 'counseling'),
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'actioned', 'dismissed')),
  resolved_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ─── Audit log (append-only) ───────────────────────────────────────
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_table text,
  target_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ─── Authorization helpers ─────────────────────────────────────────
-- SECURITY DEFINER with a fixed search_path so policies can check roles
-- without recursion and without exposing the role tables.
create or replace function public.has_staff_role(roles public.staff_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.staff_roles
    where user_id = auth.uid() and role = any(roles)
  );
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_staff_role(array['owner']::public.staff_role[]);
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff_roles where user_id = auth.uid());
$$;

create or replace function public.setting_enabled(setting_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select value = 'true'::jsonb from public.platform_settings where key = setting_key), false);
$$;

create or replace function public.has_experience(exp public.experience)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.experience_access a
    join public.profiles p on p.id = a.user_id
    where a.user_id = auth.uid()
      and a.experience = exp
      and a.status = 'active'
      and p.status = 'active'
      and (a.expires_at is null or a.expires_at > now())
  ) and public.setting_enabled(exp::text || '_live');
$$;

-- ─── New-account gate ──────────────────────────────────────────────
-- Runs when Supabase Auth creates a user. While registrations are closed,
-- only allow-listed emails can create an account — even if someone calls
-- the Auth API directly.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.setting_enabled('registrations_open')
     and not exists (select 1 from public.signup_allowlist where email = new.email) then
    raise exception 'Registrations are not open yet';
  end if;

  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- One-time owner bootstrap, run from the Supabase SQL editor:
--   select public.bootstrap_owner('you@example.com');
-- Refuses to run once an owner exists.
create or replace function public.bootstrap_owner(owner_email citext)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if exists (select 1 from public.staff_roles where role = 'owner') then
    raise exception 'An owner already exists';
  end if;
  select id into uid from public.profiles where email = owner_email;
  if uid is null then
    raise exception 'No account found for %. Create the user in Supabase Auth first.', owner_email;
  end if;
  insert into public.staff_roles (user_id, role) values (uid, 'owner');
  insert into public.audit_log (actor_id, action, target_table, target_id) values (uid, 'owner.bootstrap', 'staff_roles', uid::text);
end;
$$;
revoke execute on function public.bootstrap_owner(citext) from public, anon, authenticated;

-- Staff actions are recorded through this function (the audit table
-- itself accepts no direct writes).
create or replace function public.log_admin_action(action text, target_table text default null, target_id text default null, details jsonb default '{}')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'Only staff actions are audited here';
  end if;
  insert into public.audit_log (actor_id, action, target_table, target_id, details)
  values (auth.uid(), action, target_table, target_id, coalesce(details, '{}'));
end;
$$;
revoke execute on function public.log_admin_action(text, text, text, jsonb) from public, anon;
grant execute on function public.log_admin_action(text, text, text, jsonb) to authenticated;

-- updated_at maintenance
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger touch_profiles before update on public.profiles for each row execute function public.touch_updated_at();
create trigger touch_plans before update on public.membership_plans for each row execute function public.touch_updated_at();
create trigger touch_subscriptions before update on public.subscriptions for each row execute function public.touch_updated_at();
create trigger touch_tickets before update on public.support_tickets for each row execute function public.touch_updated_at();

-- Members may edit their own name, but only staff may change account
-- status or email (email changes flow through Supabase Auth).
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and not public.has_staff_role(array['owner','admin']::public.staff_role[])
     and (new.status is distinct from old.status or new.email is distinct from old.email) then
    raise exception 'Not permitted to change account status or email';
  end if;
  return new;
end;
$$;
create trigger guard_profiles before update on public.profiles for each row execute function public.guard_profile_update();

-- ─── RLS: public schema ────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.staff_roles enable row level security;
alter table public.experience_access enable row level security;
alter table public.platform_settings enable row level security;
alter table public.signup_allowlist enable row level security;
alter table public.membership_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.waitlist enable row level security;
alter table public.referrals enable row level security;
alter table public.promotions enable row level security;
alter table public.support_tickets enable row level security;
alter table public.moderation_reports enable row level security;
alter table public.audit_log enable row level security;

create policy "own profile read" on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy "own profile update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "admins manage profiles" on public.profiles for update using (public.has_staff_role(array['owner','admin']::public.staff_role[]));

create policy "staff read roles" on public.staff_roles for select using (user_id = auth.uid() or public.is_owner());
create policy "owner manages roles" on public.staff_roles for all using (public.is_owner()) with check (public.is_owner());

create policy "own access read" on public.experience_access for select using (user_id = auth.uid() or public.is_staff());
create policy "admins manage access" on public.experience_access for all
  using (public.has_staff_role(array['owner','admin']::public.staff_role[]))
  with check (public.has_staff_role(array['owner','admin']::public.staff_role[]));

create policy "anyone reads settings" on public.platform_settings for select using (true);
create policy "owner changes settings" on public.platform_settings for update using (public.is_owner()) with check (public.is_owner());

create policy "owner manages allowlist" on public.signup_allowlist for all using (public.is_owner()) with check (public.is_owner());

create policy "read active plans" on public.membership_plans for select using (is_active or public.is_staff());
create policy "owner manages plans" on public.membership_plans for all
  using (public.has_staff_role(array['owner','finance']::public.staff_role[]))
  with check (public.has_staff_role(array['owner','finance']::public.staff_role[]));

-- Subscriptions and payments are written only by the server (Stripe webhook
-- using the service role), never by browsers.
create policy "own subscriptions" on public.subscriptions for select
  using (user_id = auth.uid() or public.has_staff_role(array['owner','admin','finance','support']::public.staff_role[]));
create policy "own payments" on public.payments for select
  using (user_id = auth.uid() or public.has_staff_role(array['owner','finance']::public.staff_role[]));

create policy "anyone joins waitlist" on public.waitlist for insert with check (true);
create policy "staff read waitlist" on public.waitlist for select using (public.has_staff_role(array['owner','admin']::public.staff_role[]));

create policy "own referrals" on public.referrals for select using (referrer_id = auth.uid() or public.is_staff());
create policy "owner manages referrals" on public.referrals for all
  using (public.has_staff_role(array['owner','admin']::public.staff_role[]))
  with check (public.has_staff_role(array['owner','admin']::public.staff_role[]));

create policy "owner manages promotions" on public.promotions for all
  using (public.has_staff_role(array['owner','admin']::public.staff_role[]))
  with check (public.has_staff_role(array['owner','admin']::public.staff_role[]));

create policy "own tickets" on public.support_tickets for select using (user_id = auth.uid() or public.is_staff());
create policy "create own ticket" on public.support_tickets for insert with check (user_id = auth.uid());
create policy "staff update tickets" on public.support_tickets for update
  using (public.has_staff_role(array['owner','admin','support']::public.staff_role[]));

create policy "file report" on public.moderation_reports for insert with check (reporter_id = auth.uid());
create policy "moderators read reports" on public.moderation_reports for select
  using (reporter_id = auth.uid() or public.has_staff_role(array['owner','admin','moderator']::public.staff_role[]));
create policy "moderators update reports" on public.moderation_reports for update
  using (public.has_staff_role(array['owner','admin','moderator']::public.staff_role[]));

create policy "owner reads audit" on public.audit_log for select using (public.is_owner());
-- No insert/update/delete policies: written only by SECURITY DEFINER
-- functions and the server's service role.

-- ════════════════════════════════════════════════════════════════════
-- Relationships experience
-- ════════════════════════════════════════════════════════════════════
create table relationships.profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  headline text,
  about text,
  birth_year integer check (birth_year >= 1900),
  city text,
  relationship_intent text check (relationship_intent in ('long_term', 'marriage', 'companionship', 'exploring')),
  is_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table relationships.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  assessment_key text not null,
  answers jsonb not null,
  scores jsonb,
  completed_at timestamptz not null default now()
);

create table relationships.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'blocked')),
  compatibility_score numeric(5,2),
  created_at timestamptz not null default now(),
  unique (requester_id, recipient_id),
  check (requester_id <> recipient_id)
);

alter table relationships.profiles enable row level security;
alter table relationships.assessments enable row level security;
alter table relationships.connections enable row level security;

create policy "members see visible profiles" on relationships.profiles for select
  using (user_id = auth.uid()
         or (is_visible and public.has_experience('relationships'))
         or public.has_staff_role(array['owner','admin','moderator']::public.staff_role[]));
create policy "manage own profile" on relationships.profiles for all
  using (user_id = auth.uid() and public.has_experience('relationships'))
  with check (user_id = auth.uid() and public.has_experience('relationships'));

create policy "own assessments" on relationships.assessments for all
  using (user_id = auth.uid() and public.has_experience('relationships'))
  with check (user_id = auth.uid() and public.has_experience('relationships'));

create policy "party to connection" on relationships.connections for select
  using (auth.uid() in (requester_id, recipient_id) or public.has_staff_role(array['owner','admin','moderator']::public.staff_role[]));
create policy "request connection" on relationships.connections for insert
  with check (requester_id = auth.uid() and public.has_experience('relationships'));
create policy "respond to connection" on relationships.connections for update
  using (auth.uid() in (requester_id, recipient_id) and public.has_experience('relationships'));

-- ════════════════════════════════════════════════════════════════════
-- Business experience
-- ════════════════════════════════════════════════════════════════════
create table business.profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  headline text,
  company text,
  industry text,
  stage text check (stage in ('idea', 'early', 'growth', 'established', 'enterprise')),
  seeking text[] not null default '{}',
  offering text[] not null default '{}',
  about text,
  is_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table business.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  purpose text check (purpose in ('partnership', 'referral', 'collaboration', 'mentorship', 'investment', 'networking')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'blocked')),
  compatibility_score numeric(5,2),
  created_at timestamptz not null default now(),
  unique (requester_id, recipient_id),
  check (requester_id <> recipient_id)
);

alter table business.profiles enable row level security;
alter table business.connections enable row level security;

create policy "members see visible profiles" on business.profiles for select
  using (user_id = auth.uid()
         or (is_visible and public.has_experience('business'))
         or public.has_staff_role(array['owner','admin','moderator']::public.staff_role[]));
create policy "manage own profile" on business.profiles for all
  using (user_id = auth.uid() and public.has_experience('business'))
  with check (user_id = auth.uid() and public.has_experience('business'));

create policy "party to connection" on business.connections for select
  using (auth.uid() in (requester_id, recipient_id) or public.has_staff_role(array['owner','admin','moderator']::public.staff_role[]));
create policy "request connection" on business.connections for insert
  with check (requester_id = auth.uid() and public.has_experience('business'));
create policy "respond to connection" on business.connections for update
  using (auth.uid() in (requester_id, recipient_id) and public.has_experience('business'));

-- ════════════════════════════════════════════════════════════════════
-- Counseling experience — CONFIDENTIAL ZONE
-- ════════════════════════════════════════════════════════════════════

-- Provider applications & credential review (owner/admin oversight).
create table counseling.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  legal_name text not null,
  license_type text not null,
  license_number text not null,
  license_state text not null,
  license_expires_on date,
  specialties text[] not null default '{}',
  -- Paths in the private "credentials" storage bucket, not public URLs.
  document_paths text[] not null default '{}',
  status text not null default 'submitted' check (status in ('submitted', 'in_review', 'approved', 'rejected', 'more_info')),
  reviewer_id uuid references public.profiles (id),
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Public-facing counselor listing (shown only once verified).
create table counseling.counselors (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  professional_name text not null,
  credentials text,
  bio text,
  specialties text[] not null default '{}',
  session_formats text[] not null default '{}',
  rate_cents integer check (rate_cents >= 0),
  is_verified boolean not null default false,
  is_listed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A client's counseling identity is separate from their dating or business
-- persona. Counselors see only this record, never the other profiles.
create table counseling.clients (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  preferred_name text not null,
  pronouns text,
  created_at timestamptz not null default now()
);

create table counseling.availability (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references counseling.counselors (user_id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  timezone text not null,
  check (end_time > start_time)
);

create table counseling.appointments (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references counseling.counselors (user_id) on delete restrict,
  client_id uuid not null references counseling.clients (user_id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  format text not null check (format in ('video', 'phone', 'in_person')),
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'completed', 'canceled', 'no_show')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- Clinical notes: visible ONLY to the authoring counselor. No staff policy
-- exists, so not even the owner can read them through the API.
create table counseling.session_notes (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references counseling.appointments (id) on delete cascade,
  counselor_id uuid not null references counseling.counselors (user_id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Counselors edit their listing, but only owner/admin can verify them.
create or replace function counseling.guard_counselor_update()
returns trigger language plpgsql security definer set search_path = public, counseling as $$
begin
  if auth.uid() is not null
     and not public.has_staff_role(array['owner','admin']::public.staff_role[])
     and new.is_verified is distinct from old.is_verified then
    raise exception 'Only the platform can verify a counselor';
  end if;
  return new;
end;
$$;
create trigger guard_counselors before update on counseling.counselors for each row execute function counseling.guard_counselor_update();
create trigger touch_counselors before update on counseling.counselors for each row execute function public.touch_updated_at();
create trigger touch_session_notes before update on counseling.session_notes for each row execute function public.touch_updated_at();
create trigger touch_rel_profiles before update on relationships.profiles for each row execute function public.touch_updated_at();
create trigger touch_biz_profiles before update on business.profiles for each row execute function public.touch_updated_at();

alter table counseling.applications enable row level security;
alter table counseling.counselors enable row level security;
alter table counseling.clients enable row level security;
alter table counseling.availability enable row level security;
alter table counseling.appointments enable row level security;
alter table counseling.session_notes enable row level security;

create policy "applicant reads own" on counseling.applications for select
  using (user_id = auth.uid() or public.has_staff_role(array['owner','admin']::public.staff_role[]));
create policy "apply when open" on counseling.applications for insert
  with check (user_id = auth.uid() and public.setting_enabled('counselor_applications_open'));
create policy "admins review" on counseling.applications for update
  using (public.has_staff_role(array['owner','admin']::public.staff_role[]));

create policy "listed counselors visible" on counseling.counselors for select
  using (user_id = auth.uid()
         or (is_verified and is_listed and public.has_experience('counseling'))
         or public.has_staff_role(array['owner','admin']::public.staff_role[]));
create policy "counselor edits own listing" on counseling.counselors for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "admins verify counselors" on counseling.counselors for all
  using (public.has_staff_role(array['owner','admin']::public.staff_role[]))
  with check (public.has_staff_role(array['owner','admin']::public.staff_role[]));

create policy "client manages own record" on counseling.clients for all
  using (user_id = auth.uid() and public.has_experience('counseling'))
  with check (user_id = auth.uid() and public.has_experience('counseling'));
create policy "counselor sees own clients" on counseling.clients for select
  using (exists (select 1 from counseling.appointments a where a.client_id = counseling.clients.user_id and a.counselor_id = auth.uid()));

create policy "availability readable" on counseling.availability for select using (public.has_experience('counseling') or counselor_id = auth.uid());
create policy "counselor manages availability" on counseling.availability for all using (counselor_id = auth.uid()) with check (counselor_id = auth.uid());

create policy "parties see appointment" on counseling.appointments for select
  using (auth.uid() in (counselor_id, client_id));
create policy "client requests appointment" on counseling.appointments for insert
  with check (client_id = auth.uid() and status = 'requested' and public.has_experience('counseling'));
create policy "parties update appointment" on counseling.appointments for update
  using (auth.uid() in (counselor_id, client_id));

create policy "author only" on counseling.session_notes for all
  using (counselor_id = auth.uid())
  with check (counselor_id = auth.uid()
              and exists (select 1 from counseling.appointments a where a.id = appointment_id and a.counselor_id = auth.uid()));

-- ─── Grants ────────────────────────────────────────────────────────
-- RLS decides row visibility; these grants only let the API roles reach
-- the schemas at all.
grant usage on schema relationships, business, counseling to authenticated, service_role;
grant select, insert, update, delete on all tables in schema relationships, business, counseling to authenticated;
grant all on all tables in schema relationships, business, counseling to service_role;
grant select on public.platform_settings, public.membership_plans to anon;
grant insert on public.waitlist to anon;

-- ─── Private storage for counselor credential documents ───────────
insert into storage.buckets (id, name, public) values ('credentials', 'credentials', false)
on conflict (id) do nothing;

create policy "applicant uploads own credentials" on storage.objects for insert to authenticated
  with check (bucket_id = 'credentials' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "applicant and admins read credentials" on storage.objects for select to authenticated
  using (bucket_id = 'credentials'
         and ((storage.foldername(name))[1] = auth.uid()::text
              or public.has_staff_role(array['owner','admin']::public.staff_role[])));
