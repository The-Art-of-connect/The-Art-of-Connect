-- Every free member selects ONE primary society. The Art of Self is included for everyone;
-- society access comes only from this selection (free) or a paid membership.
alter table public.profiles
  add column if not exists primary_society text check (primary_society in ('business', 'singles', 'couples'));
comment on column public.profiles.primary_society is 'The free member''s selected society: business (21+), singles (30+) or couples (21+ for both partners).';

-- Members can't change their own primary society: it is set by the server at registration (or by the owner/admin).
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
          or new.primary_society is distinct from old.primary_society) then
    raise exception 'Not permitted to change these account fields';
  end if;
  return new;
end;
$$;
