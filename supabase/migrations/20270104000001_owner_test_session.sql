-- Owner testing session: fictional test accounts created during the owner's private testing session are allowed while
-- public registration is closed, keep every age rule, and are permanently flagged so they stay separate from real members
-- and can be removed before launch. Also: Elite Concierge is not invitation-only.

create table public.test_signups (
  email text primary key check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '1 day'
);
alter table public.test_signups enable row level security;
create policy "owner reads test signups" on public.test_signups for select to authenticated using (public.has_staff_role(array['owner']::public.staff_role[]));
revoke all on public.test_signups from public, anon, authenticated;
grant select on public.test_signups to authenticated;
grant all on public.test_signups to service_role;

alter table public.profiles add column if not exists is_test boolean not null default false;
create index if not exists profiles_is_test on public.profiles (is_test) where is_test;

create or replace function public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}');
  acct text := case when meta ->> 'account_type' = 'professional' then 'professional' else 'member' end;
  allow_listed boolean := exists (select 1 from public.signup_allowlist where email = new.email);
  -- Owner testing session: a fictional test account. Registration may be closed, but every age rule still applies.
  is_test boolean := exists (select 1 from public.test_signups where email = lower(new.email) and expires_at > now());
  dob date;
  min_age integer;
  ref text := nullif(upper(trim(meta ->> 'referral_code')), '');
  referrer uuid;
begin
  if not allow_listed then
    if acct = 'member' and not is_test and not public.setting_enabled('registrations_open') then
      raise exception 'Membership enrollment is not open yet';
    end if;
    if acct = 'professional' and not is_test and not public.setting_enabled('counselor_applications_open') then
      raise exception 'Professional applications are not open yet';
    end if;

    begin
      dob := (meta ->> 'date_of_birth')::date;
    exception when others then
      dob := null;
    end;
    if dob is null then
      raise exception 'A valid date of birth is required';
    end if;
    min_age := case when acct = 'member' then public.setting_int('minimum_member_age', 40)
                    else public.setting_int('minimum_professional_age', 21) end;
    if dob > (current_date - make_interval(years => min_age)) then
      raise exception 'Membership is available to adults % and older', min_age;
    end if;
  end if;

  insert into public.profiles (id, email, display_name, account_type, age_eligible, age_verified_at, referred_by_code, attribution, is_test)
  values (new.id, new.email,
          coalesce(nullif(meta ->> 'display_name', ''), split_part(new.email, '@', 1)),
          case when allow_listed and dob is null then 'staff' else acct end,
          dob is not null, case when dob is not null then now() end,
          ref,
          coalesce(meta -> 'attribution', '{}'), is_test);

  if dob is not null then
    insert into public.member_private (user_id, date_of_birth) values (new.id, dob);
  end if;

  if ref is not null then
    select id into referrer from public.profiles where referral_code = ref and id <> new.id;
    if referrer is not null then
      insert into public.referrals (code, referrer_id, referred_user_id, status) values (ref, referrer, new.id, 'pending');
    end if;
  end if;
  return new;
end;
$function$;

-- Members can't mark or unmark themselves as test accounts.
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
          or new.is_test is distinct from old.is_test
          or (new.primary_society is distinct from old.primary_society and coalesce(current_setting('app.society_transition', true), '') <> 'on')) then
    raise exception 'Not permitted to change these account fields';
  end if;
  return new;
end;
$$;

-- "By invitation" was a label only; every eligible member may choose Elite Concierge.
update public.membership_packages set highlight = 'Our Most Exclusive Experience' where slug = 'elite-concierge' and highlight = 'By invitation';

-- Draft prices are visible to pricing staff, and to the website's own server during an owner testing session
-- (the server decides that from the signed session cookie; browsers can never use the server's role).
create or replace function public.can_preview_pricing()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_staff_role(array['owner','finance','executive']::public.staff_role[])
      or coalesce(auth.jwt() ->> 'role', '') = 'service_role';
$$;
