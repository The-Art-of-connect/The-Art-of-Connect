-- Counseling & Wellness Center: universal access, counselor-controlled pricing, private support preferences.
-- Counseling is available to every registered member regardless of society or membership.
-- The Art of Connect never sets human counseling fees: each counselor (in-house or independent) sets their own.
-- Clinical services stay CLOSED until the owner turns on 'counseling_center_open' (after legal, licensing and privacy review).

insert into public.platform_settings (key, value, description) values
  ('counseling_center_open', 'false', 'Allow members to request counseling appointments (clinical services; keep off until legal, licensing and privacy review is complete)')
on conflict (key) do nothing;

-- Counselor profile details that members see before booking.
alter table counseling.counselors
  add column if not exists provider_type text not null default 'independent' check (provider_type in ('in_house', 'independent')),
  add column if not exists licensed_states text[] not null default '{}',
  add column if not exists languages text[] not null default '{}',
  add column if not exists gender_identity text check (char_length(gender_identity) <= 60),
  add column if not exists accepts_insurance boolean not null default false,
  add column if not exists insurance_notes text check (char_length(insurance_notes) <= 1000),
  add column if not exists cancellation_policy text check (char_length(cancellation_policy) <= 2000),
  add column if not exists offers_virtual boolean not null default true,
  add column if not exists offers_in_person boolean not null default false,
  add column if not exists office_locations text[] not null default '{}';

-- Only the platform may classify a counselor as in-house (that relationship needs legal review and owner approval).
create or replace function counseling.guard_counselor_update()
returns trigger language plpgsql security definer set search_path = public, counseling as $$
begin
  if auth.uid() is not null
     and not public.has_staff_role(array['owner','admin']::public.staff_role[])
     and (new.is_verified is distinct from old.is_verified or new.provider_type is distinct from old.provider_type) then
    raise exception 'Only the platform can verify a counselor or change their provider type';
  end if;
  return new;
end;
$$;

-- Each counselor's own fee schedule (never set by The Art of Connect).
create table counseling.fees (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references counseling.counselors (user_id) on delete cascade,
  service text not null check (service in ('individual', 'couples', 'family', 'initial_consultation', 'specialized')),
  service_label text check (char_length(service_label) <= 120),
  format text not null default 'any' check (format in ('virtual', 'in_person', 'any')),
  duration_minutes integer not null check (duration_minutes between 10 and 240),
  fee_cents integer not null check (fee_cents between 0 and 10000000),
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger touch_counseling_fees before update on counseling.fees for each row execute function public.touch_updated_at();
alter table counseling.fees enable row level security;
create policy "counselor manages own fees" on counseling.fees for all using (counselor_id = auth.uid()) with check (counselor_id = auth.uid());
create policy "members see listed counselors' fees" on counseling.fees for select
  using (auth.uid() is not null and exists (select 1 from counseling.counselors c where c.user_id = counselor_id and c.is_verified and c.is_listed));

-- Universal access: any signed-in member can see verified, listed counselors and their availability.
drop policy if exists "listed counselors visible" on counseling.counselors;
create policy "listed counselors visible" on counseling.counselors for select
  using (user_id = auth.uid()
         or (is_verified and is_listed and auth.uid() is not null)
         or public.has_staff_role(array['owner','admin']::public.staff_role[]));
drop policy if exists "availability readable" on counseling.availability;
create policy "availability readable" on counseling.availability for select using (auth.uid() is not null or counselor_id = auth.uid());
drop policy if exists "client manages own record" on counseling.clients;
create policy "client manages own record" on counseling.clients for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Appointment requests open only when the owner opens the center (Coming Soon until then).
drop policy if exists "client requests appointment" on counseling.appointments;
create policy "client requests appointment" on counseling.appointments for insert
  with check (client_id = auth.uid() and status = 'requested' and public.setting_enabled('counseling_center_open'));

-- A member's private support preferences for matching. No staff policy: not even the owner can read them.
create table counseling.support_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  concerns text[] not null default '{}',
  meeting text not null default 'either' check (meeting in ('virtual', 'in_person', 'either')),
  provider_preference text not null default 'both' check (provider_preference in ('in_house', 'independent', 'both')),
  language text check (char_length(language) <= 40),
  counselor_gender text check (counselor_gender in ('woman', 'man', 'nonbinary', 'no_preference')),
  cultural_notes text check (char_length(cultural_notes) <= 500),
  state text check (char_length(state) <= 40),
  budget text check (char_length(budget) <= 60),
  uses_insurance boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table counseling.support_preferences enable row level security;
create policy "only the member" on counseling.support_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on counseling.fees, counseling.support_preferences to authenticated;
grant all on counseling.fees, counseling.support_preferences to service_role;
