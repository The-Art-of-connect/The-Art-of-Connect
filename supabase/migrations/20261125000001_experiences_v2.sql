-- ════════════════════════════════════════════════════════════════════
-- Experiences v2: In Business · In Life · In Love
--   • Singles and couples are separate paths inside In Love
--   • Couples: individual + shared spaces, secure partner invitations,
--     private reflections that are never shared automatically
--   • In Life: private journal (author-only — not even the owner)
--   • Professional pathway distinguishing licensed clinicians from
--     coaches, mentors and other nonclinical professionals
--   • Consent records
-- Internal schema names are unchanged: relationships = In Love,
-- business = In Business, counseling = In Life (confidential zone).
-- ════════════════════════════════════════════════════════════════════

-- ─── Waitlist: In Love path ────────────────────────────────────────
alter table public.waitlist add column love_track text check (love_track in ('single', 'couple'));

-- ─── Consent records ───────────────────────────────────────────────
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  consent_type text not null check (consent_type in ('terms', 'privacy', 'marketing', 'matchmaking', 'professional_referral', 'partner_sharing')),
  version text not null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  details jsonb not null default '{}'
);
create index consents_user_idx on public.consents (user_id, consent_type);
alter table public.consents enable row level security;
create policy "own consents" on public.consents for select using (user_id = auth.uid() or public.has_staff_role(array['owner','admin']::public.staff_role[]));
create policy "grant own consent" on public.consents for insert with check (user_id = auth.uid());
create policy "revoke own consent" on public.consents for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─── Professional pathway ──────────────────────────────────────────
create type public.professional_type as enum ('licensed_clinical', 'coach', 'mentor', 'other_nonclinical');

-- Pre-launch expressions of interest (no account needed).
create table public.professional_interest (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email citext not null,
  professional_type public.professional_type not null,
  credentials text,
  license_state text,
  specialties text,
  experiences public.experience[] not null default '{}',
  website text,
  message text,
  status text not null default 'new' check (status in ('new', 'contacted', 'invited', 'declined')),
  created_at timestamptz not null default now()
);
alter table public.professional_interest enable row level security;
create policy "anyone expresses interest" on public.professional_interest for insert with check (status = 'new');
create policy "admins read interest" on public.professional_interest for select using (public.has_staff_role(array['owner','admin']::public.staff_role[]));
create policy "admins update interest" on public.professional_interest for update using (public.has_staff_role(array['owner','admin']::public.staff_role[]));
grant insert on public.professional_interest to anon;

-- Full applications: licensed clinicians must give license details;
-- coaches and mentors may instead list certifications.
alter table counseling.applications
  add column professional_type public.professional_type not null default 'licensed_clinical',
  add column certifications text,
  add column website text,
  add column experiences public.experience[] not null default '{counseling}',
  add column years_experience integer check (years_experience between 0 and 80);
alter table counseling.applications
  alter column license_type drop not null,
  alter column license_number drop not null,
  alter column license_state drop not null;
alter table counseling.applications add constraint licensed_requires_license check (
  professional_type <> 'licensed_clinical'
  or (license_type is not null and license_number is not null and license_state is not null)
);

alter table counseling.counselors add column professional_type public.professional_type not null default 'licensed_clinical';

-- ─── In Life: private journal ──────────────────────────────────────
-- Author-only. No staff policy exists, so the owner cannot read entries.
create table counseling.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text,
  body text not null,
  mood text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table counseling.journal_entries enable row level security;
create policy "author only" on counseling.journal_entries for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger touch_journal before update on counseling.journal_entries for each row execute function public.touch_updated_at();

-- ─── In Love: singles vs couples ───────────────────────────────────
alter table relationships.profiles add column track text not null default 'single' check (track in ('single', 'couple'));

-- Matchmaking only ever shows visible SINGLES.
drop policy "members see visible profiles" on relationships.profiles;
create policy "members see visible singles" on relationships.profiles for select
  using (user_id = auth.uid()
         or (is_visible and track = 'single' and public.has_experience('relationships'))
         or public.has_staff_role(array['owner','admin','moderator']::public.staff_role[]));

create table relationships.couples (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table relationships.couple_members (
  couple_id uuid not null references relationships.couples (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id),
  unique (user_id) -- one active couple per member
);

-- Invitations store only a hash of the secret link token.
create table relationships.partner_invitations (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references relationships.couples (id) on delete cascade,
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  invitee_email citext not null,
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);

-- Shared space: visible to both partners.
create table relationships.couple_goals (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references relationships.couples (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  details text,
  status text not null default 'active' check (status in ('active', 'achieved', 'archived')),
  created_at timestamptz not null default now()
);

-- Individual space: never visible to the partner unless the author
-- explicitly copies something into the shared space.
create table relationships.private_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  prompt text,
  body text not null,
  created_at timestamptz not null default now()
);

create or replace function relationships.is_couple_member(cid uuid)
returns boolean language sql stable security definer set search_path = public, relationships as $$
  select exists (select 1 from relationships.couple_members where couple_id = cid and user_id = auth.uid());
$$;

alter table relationships.couples enable row level security;
alter table relationships.couple_members enable row level security;
alter table relationships.partner_invitations enable row level security;
alter table relationships.couple_goals enable row level security;
alter table relationships.private_reflections enable row level security;

create policy "members see couple" on relationships.couples for select using (relationships.is_couple_member(id));

create policy "members see members" on relationships.couple_members for select using (relationships.is_couple_member(couple_id));
-- No insert policies on couples or couple_members: a couple is created only
-- by start_couple(), and a partner joins only by accept_partner_invitation().
create policy "leave couple" on relationships.couple_members for delete using (user_id = auth.uid());

create policy "inviter manages invitations" on relationships.partner_invitations for select using (inviter_id = auth.uid());
create policy "invite partner" on relationships.partner_invitations for insert
  with check (inviter_id = auth.uid() and relationships.is_couple_member(couple_id) and public.has_experience('relationships'));
create policy "revoke invitation" on relationships.partner_invitations for update using (inviter_id = auth.uid());

create policy "partners share goals" on relationships.couple_goals for all
  using (relationships.is_couple_member(couple_id))
  with check (created_by = auth.uid() and relationships.is_couple_member(couple_id));

create policy "author only" on relationships.private_reflections for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Start a couple: creates the couple and adds the caller as its first member.
create or replace function relationships.start_couple()
returns uuid language plpgsql security definer set search_path = public, relationships as $$
declare cid uuid;
begin
  if auth.uid() is null or not public.has_experience('relationships') then
    raise exception 'In Love is not available on this account';
  end if;
  if exists (select 1 from relationships.couple_members where user_id = auth.uid()) then
    raise exception 'You are already in a couple';
  end if;
  insert into relationships.couples (created_by) values (auth.uid()) returning id into cid;
  insert into relationships.couple_members (couple_id, user_id) values (cid, auth.uid());
  return cid;
end;
$$;
revoke execute on function relationships.start_couple() from public, anon;
grant execute on function relationships.start_couple() to authenticated;

-- Accept an invitation with the secret token from the invitation link.
-- Must be signed in with the invited email address.
create or replace function relationships.accept_partner_invitation(token text)
returns uuid language plpgsql security definer set search_path = public, relationships, extensions as $$
declare inv relationships.partner_invitations;
declare me citext;
begin
  select email into me from public.profiles where id = auth.uid();
  select * into inv from relationships.partner_invitations
    where token_hash = encode(digest(token, 'sha256'), 'hex') and status = 'pending'
    for update;
  if inv.id is null or inv.expires_at < now() then
    raise exception 'This invitation is not valid';
  end if;
  if me is null or me <> inv.invitee_email then
    raise exception 'This invitation was sent to a different email address';
  end if;
  insert into relationships.couple_members (couple_id, user_id) values (inv.couple_id, auth.uid());
  update relationships.partner_invitations set status = 'accepted' where id = inv.id;
  update relationships.profiles set track = 'couple', is_visible = false where user_id in (auth.uid(), inv.inviter_id);
  return inv.couple_id;
end;
$$;
revoke execute on function relationships.accept_partner_invitation(text) from public, anon;
grant execute on function relationships.accept_partner_invitation(text) to authenticated;

grant select, insert, update, delete on all tables in schema relationships, counseling to authenticated;
grant all on all tables in schema relationships, counseling to service_role;
