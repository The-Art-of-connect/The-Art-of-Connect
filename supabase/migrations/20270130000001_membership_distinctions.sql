-- Executive & Elite membership distinctions (founder directive 39, November 28, 2026).
-- A member's distinction comes ONLY from their actual entitlements and changes automatically with their membership:
--   elite     — an active, unexpired Elite badge (issued by the owner or by an active Elite Concierge membership)
--   executive — an active or trialing Executive Private membership
-- Members cannot assign, buy separately or edit a distinction: badges and subscriptions are owner/system-written only.
-- Identity verification is a separate mark and never implied by membership.

create or replace function public.membership_distinction(p uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when public.social_is_elite(p) then 'elite'
    when exists (select 1 from public.subscriptions s where s.user_id = p and s.kind = 'member'
                   and s.status in ('active', 'trialing') and s.tier_slug = 'executive-private') then 'executive'
  end;
$$;
revoke all on function public.membership_distinction(uuid) from public, anon, authenticated;

-- Whether the viewer may already see this member somewhere: a visible profile, or something they share.
create or replace function public.member_visible_to(viewer uuid, target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select viewer is not null and target is not null and (viewer = target or (
    exists (select 1 from public.profiles p where p.id = target and p.status = 'active')
    and not public.is_blocked_between(viewer, target)
    and (
      exists (select 1 from public.social_profiles sp where sp.user_id = target and public.social_profile_visible(viewer, target, sp.profile_visibility))
      or exists (select 1 from business.profiles bp where bp.user_id = target and bp.is_visible)
      or exists (select 1 from relationships.profiles rp where rp.user_id = target and rp.is_visible)
      or exists (select 1 from public.social_connections c where (c.requester_id = viewer and c.addressee_id = target) or (c.requester_id = target and c.addressee_id = viewer))
      or exists (select 1 from public.social_conversation_members a join public.social_conversation_members b on a.conversation_id = b.conversation_id where a.user_id = viewer and b.user_id = target)
      or exists (select 1 from public.social_circle_members a join public.social_circle_members b on a.circle_id = b.circle_id where a.user_id = viewer and b.user_id = target)
      or exists (select 1 from business.conversations c where (c.requester_id = viewer and c.recipient_id = target) or (c.requester_id = target and c.recipient_id = viewer))
      or exists (select 1 from business.room_participants a join business.room_participants b on a.room_id = b.room_id where a.user_id = viewer and b.user_id = target and a.left_at is null)
    )));
$$;
revoke all on function public.member_visible_to(uuid, uuid) from public, anon, authenticated;

-- The marks shown next to a member's name: membership distinction and (separately) identity verification.
-- Members the viewer cannot otherwise see return no row.
create or replace function public.member_marks(p_ids uuid[])
returns table (user_id uuid, distinction text, identity_verified boolean)
language sql stable security definer set search_path = public as $$
  select t, public.membership_distinction(t), (select p.identity_verified_at is not null from public.profiles p where p.id = t)
  from unnest(coalesce(p_ids, '{}'::uuid[])) with ordinality u(t, n)
  where u.n <= 200 and public.member_visible_to(auth.uid(), t);
$$;
revoke all on function public.member_marks(uuid[]) from public, anon;
grant execute on function public.member_marks(uuid[]) to authenticated;

-- Badge integrity: the directory's Elite flag now honors badge expiry, like everywhere else.
create or replace function public.social_directory(p_ids uuid[] DEFAULT NULL::uuid[], p_seeking text DEFAULT NULL::text, p_limit integer DEFAULT 60)
 RETURNS TABLE(user_id uuid, display_name text, headline text, bio text, city text, region text, country text, interests text[], seeking text[], avatar_path text, elite boolean, connection_status text, connection_direction text, shared_interests integer, shared_circles integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with me as (select auth.uid() id)
  select p.id, p.display_name, sp.headline, sp.bio,
    case when sp.show_location then sp.city end, case when sp.show_location then sp.region end, case when sp.show_location then sp.country end,
    sp.interests, sp.seeking, sp.avatar_path,
    public.social_is_elite(p.id),
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
$function$;
