-- Secure primary-society transitions (e.g., Singles → Couples) in the same account.
-- Members never edit permissions directly: this function checks eligibility, moves only FREE society
-- access (paid memberships are untouched), keeps every Art of Self record, and logs the change.

create table public.society_transitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  from_society text check (from_society in ('business', 'singles', 'couples')),
  to_society text not null check (to_society in ('business', 'singles', 'couples')),
  created_at timestamptz not null default now()
);
alter table public.society_transitions enable row level security;
create policy "member sees own; owner and admin audit" on public.society_transitions for select
  using (user_id = auth.uid() or public.has_staff_role(array['owner','admin']::public.staff_role[]));
revoke all on public.society_transitions from public, anon;
grant select on public.society_transitions to authenticated;
grant all on public.society_transitions to service_role;

-- The profile guard lets this function (and only this function) change primary_society.
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
          or new.referred_by_code is distinct from old.referred_by_code
          or (new.primary_society is distinct from old.primary_society and coalesce(current_setting('app.society_transition', true), '') <> 'on')) then
    raise exception 'Not permitted to change these account fields';
  end if;
  return new;
end;
$$;

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

  -- Move only FREE society access; paid access is never removed here.
  if cur = 'business' then
    delete from public.experience_access where user_id = uid and experience = 'business' and source = 'free_tier';
  end if;
  if cur in ('singles', 'couples') and p_to = 'business' then
    delete from public.experience_access where user_id = uid and experience = 'relationships' and source = 'free_tier';
  end if;
  insert into public.experience_access (user_id, experience, status, source)
    values (uid, case when p_to = 'business' then 'business' else 'relationships' end::public.experience, 'active', 'free_tier')
    on conflict (user_id, experience) do nothing;

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
