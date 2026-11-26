-- Elite throughout the platform: advanced privacy, priority support, and a profile visibility model
-- enforced by the database (not just hidden on screen).

create or replace function public.social_is_elite(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.elite_badges b where b.user_id = p and b.status = 'active' and (b.expires_at is null or b.expires_at > now()));
$$;
grant execute on function public.social_is_elite(uuid) to authenticated, service_role;

-- Profile visibility: all members · my connections · Elite members only (Elite privacy option).
alter table public.social_profiles add column profile_visibility text not null default 'members' check (profile_visibility in ('members', 'connections', 'elite'));

create or replace function public.social_profile_visible(viewer uuid, owner uuid, vis text)
returns boolean language sql stable security definer set search_path = public as $$
  select viewer = owner or vis = 'members'
    or (vis = 'connections' and public.social_connected(viewer, owner))
    or (vis = 'elite' and (public.social_is_elite(viewer) or public.social_connected(viewer, owner)));
$$;
grant execute on function public.social_profile_visible(uuid, uuid, text) to authenticated, service_role;

create or replace function public.guard_social_profile_visibility()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.profile_visibility = 'elite' and not public.social_is_elite(new.user_id) then
    raise exception 'The Elite-only visibility option is part of Elite Concierge.';
  end if;
  return new;
end $$;
create trigger guard_social_profile_visibility before insert or update of profile_visibility on public.social_profiles
  for each row execute function public.guard_social_profile_visibility();

drop policy "members read profiles" on public.social_profiles;
create policy "members read profiles" on public.social_profiles for select to authenticated
  using (public.social_member(auth.uid()) and not public.is_blocked_between(auth.uid(), user_id)
         and public.social_profile_visible(auth.uid(), user_id, profile_visibility));

create or replace function public.social_directory(p_ids uuid[] default null, p_seeking text default null, p_limit integer default 60)
returns table (user_id uuid, display_name text, headline text, bio text, city text, region text, country text, interests text[], seeking text[],
               avatar_path text, elite boolean, connection_status text, connection_direction text, shared_interests integer, shared_circles integer)
language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() id)
  select p.id, p.display_name, sp.headline, sp.bio,
    case when sp.show_location then sp.city end, case when sp.show_location then sp.region end, case when sp.show_location then sp.country end,
    sp.interests, sp.seeking, sp.avatar_path,
    exists (select 1 from public.elite_badges b where b.user_id = p.id and b.status = 'active'),
    (select c.status from public.social_connections c where least(c.requester_id, c.addressee_id) = least(p.id, (select id from me)) and greatest(c.requester_id, c.addressee_id) = greatest(p.id, (select id from me))),
    (select case when c.requester_id = (select id from me) then 'sent' else 'received' end from public.social_connections c where least(c.requester_id, c.addressee_id) = least(p.id, (select id from me)) and greatest(c.requester_id, c.addressee_id) = greatest(p.id, (select id from me))),
    (select count(*)::int from unnest(sp.interests) x where x = any(coalesce((select s2.interests from public.social_profiles s2 where s2.user_id = auth.uid()), '{}'::text[]))),
    (select count(*)::int from public.social_circle_members a join public.social_circle_members b on a.circle_id = b.circle_id where a.user_id = p.id and b.user_id = (select id from me))
  from public.profiles p join public.social_profiles sp on sp.user_id = p.id
  where public.social_member((select id from me)) and p.status = 'active' and p.id <> (select id from me)
    and not public.is_blocked_between((select id from me), p.id)
    and public.social_profile_visible((select id from me), p.id, sp.profile_visibility)
    and (p_ids is not null and p.id = any(p_ids)
         or p_ids is null and sp.discoverable and (p_seeking is null or p_seeking = any(sp.seeking))
            -- Couples friendship is between couples only.
            and (p_seeking is distinct from 'couples_friendship' or (
                 exists (select 1 from relationships.couple_members m where m.user_id = p.id)
                 and exists (select 1 from relationships.couple_members m where m.user_id = (select id from me)))))
  order by 14 desc, 15 desc, p.display_name
  limit least(coalesce(p_limit, 60), 200);
$$;

-- Priority support: Elite members' requests are flagged automatically and answered first.
alter table public.support_tickets add column priority text not null default 'standard' check (priority in ('standard', 'elite'));
create or replace function public.support_ticket_priority()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.priority := case when new.user_id is not null and public.social_is_elite(new.user_id) then 'elite' else 'standard' end;
  return new;
end $$;
create trigger support_ticket_priority before insert on public.support_tickets for each row execute function public.support_ticket_priority();
