-- In Love experience (founder directive 38, November 28, 2026). Reuses the existing In Love rules: only eligible, visible
-- singles are discoverable; interest needs both members to be matchmaking-eligible; blocked members never see each other;
-- couples data is visible only to the two partners; each partner keeps individual privacy.

-- ─── Singles: discovery ────────────────────────────────────────────────────────────────────────────────────────────────
-- Exactly the members the existing profile policy lets the viewer see, minus anyone they already have a connection with,
-- with plain-language reasons drawn only from information both members chose to share.
create or replace function relationships.discover(p_limit integer default 24)
returns table (user_id uuid, first_name text, age integer, city text, intent text, headline text, about text,
               reasons text[], distinction text, identity_verified boolean)
language sql stable security definer set search_path = public, relationships as $$
  with me as (select auth.uid() id),
  mine as (select rp.city, rp.relationship_intent from relationships.profiles rp where rp.user_id = (select id from me)),
  my_interests as (select coalesce((select sp.interests from public.social_profiles sp where sp.user_id = (select id from me)), '{}'::text[]) i)
  select rp.user_id,
    nullif(split_part(coalesce(p.display_name, ''), ' ', 1), ''),
    case when rp.birth_year is not null then extract(year from now())::int - rp.birth_year end,
    rp.city, rp.relationship_intent, rp.headline, rp.about,
    array_remove(array[
      case when rp.relationship_intent is not null and rp.relationship_intent = (select relationship_intent from mine) then 'You want the same kind of relationship' end,
      case when rp.city is not null and lower(rp.city) = lower((select city from mine)) then 'You live in the same city' end,
      case when exists (select 1 from unnest(coalesce(sp.interests, '{}'::text[])) x, my_interests mi where x = any(mi.i))
           then 'You share interests' end,
      case when exists (select 1 from relationships.assessments a where a.user_id = rp.user_id) then 'Completed relationship readiness' end
    ], null),
    public.membership_distinction(rp.user_id),
    p.identity_verified_at is not null
  from relationships.profiles rp
  join public.profiles p on p.id = rp.user_id and p.status = 'active'
  left join public.social_profiles sp on sp.user_id = rp.user_id
  where rp.user_id <> (select id from me)
    and rp.is_visible and rp.track = 'single'
    and public.has_experience('relationships')
    and public.matchmaking_eligible((select id from me)) and public.matchmaking_eligible(rp.user_id)
    and not public.is_blocked_between((select id from me), rp.user_id)
    and not exists (select 1 from relationships.connections c
                    where (c.requester_id = (select id from me) and c.recipient_id = rp.user_id)
                       or (c.recipient_id = (select id from me) and c.requester_id = rp.user_id))
  order by p.identity_verified_at is null, rp.updated_at desc
  limit least(coalesce(p_limit, 24), 60);
$$;
revoke all on function relationships.discover(integer) from public, anon;
grant execute on function relationships.discover(integer) to authenticated;

-- Names and marks for the viewer's own In Love connections (either party), never anyone else.
create or replace function relationships.my_connections()
returns table (connection_id uuid, other_id uuid, first_name text, status text, direction text, created_at timestamptz,
               distinction text, identity_verified boolean)
language sql stable security definer set search_path = public, relationships as $$
  select c.id, o.id, nullif(split_part(coalesce(o.display_name, ''), ' ', 1), ''), c.status,
    case when c.requester_id = auth.uid() then 'sent' else 'received' end, c.created_at,
    public.membership_distinction(o.id), o.identity_verified_at is not null
  from relationships.connections c
  join public.profiles o on o.id = case when c.requester_id = auth.uid() then c.recipient_id else c.requester_id end
  where auth.uid() in (c.requester_id, c.recipient_id) and c.status in ('pending', 'accepted')
    and not public.is_blocked_between(c.requester_id, c.recipient_id)
  order by c.created_at desc;
$$;
revoke all on function relationships.my_connections() from public, anon;
grant execute on function relationships.my_connections() to authenticated;

-- ─── Singles: private messaging for mutual connections ─────────────────────────────────────────────────────────────────
create or replace function relationships.start_love_conversation(p_other uuid)
returns uuid language plpgsql security definer set search_path = public, relationships as $$
declare me uuid := auth.uid(); cid uuid;
begin
  if me is null or not public.has_experience('relationships') then raise exception 'In Love membership required'; end if;
  if public.is_blocked_between(me, p_other) or not exists (
    select 1 from relationships.connections c where c.status = 'accepted'
      and ((c.requester_id = me and c.recipient_id = p_other) or (c.requester_id = p_other and c.recipient_id = me))) then
    raise exception 'You can message a connection you have both accepted.';
  end if;
  select c.id into cid from public.social_conversations c where c.kind = 'direct'
    and exists (select 1 from public.social_conversation_members m where m.conversation_id = c.id and m.user_id = me)
    and exists (select 1 from public.social_conversation_members m where m.conversation_id = c.id and m.user_id = p_other)
    and (select count(*) from public.social_conversation_members m where m.conversation_id = c.id) = 2 limit 1;
  if cid is not null then return cid; end if;
  insert into public.social_conversations (kind, created_by) values ('direct', me) returning id into cid;
  insert into public.social_conversation_members (conversation_id, user_id) values (cid, me), (cid, p_other);
  return cid;
end $$;
revoke all on function relationships.start_love_conversation(uuid) from public, anon;
grant execute on function relationships.start_love_conversation(uuid) to authenticated;

-- ─── Couples: daily check-ins (private unless shared) ──────────────────────────────────────────────────────────────────
create table if not exists relationships.couple_checkins (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references relationships.couples(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null default current_date,
  mood text not null check (mood in ('connected', 'grateful', 'calm', 'hopeful', 'stretched', 'distant', 'tender')),
  note text check (char_length(note) <= 1000),
  shared boolean not null default false,
  created_at timestamptz not null default now(),
  unique (couple_id, user_id, day)
);
alter table relationships.couple_checkins enable row level security;
drop policy if exists "own check-ins" on relationships.couple_checkins;
create policy "own check-ins" on relationships.couple_checkins for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and relationships.is_couple_member(couple_id) and public.has_experience('relationships'));
drop policy if exists "partner sees shared check-ins" on relationships.couple_checkins;
create policy "partner sees shared check-ins" on relationships.couple_checkins for select
  using (shared and relationships.is_couple_member(couple_id));
grant select, insert, update, delete on relationships.couple_checkins to authenticated;

-- ─── Singles to Couples: both partners consent ─────────────────────────────────────────────────────────────────────────
-- After an accepted Exclusive Connection (which already pauses Singles discovery), each partner chooses "Become a couple".
-- When both have chosen, a shared couple space opens. Each account, its history and personal development stay their own.
create table if not exists relationships.couple_consents (
  user_id uuid not null references public.profiles(id) on delete cascade,
  partner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, partner_id)
);
alter table relationships.couple_consents enable row level security;
drop policy if exists "parties see consent" on relationships.couple_consents;
create policy "parties see consent" on relationships.couple_consents for select using (auth.uid() in (user_id, partner_id));
grant select on relationships.couple_consents to authenticated;

create or replace function relationships.become_couple(p_partner uuid)
returns text language plpgsql security definer set search_path = public, relationships as $$
declare me uuid := auth.uid(); cid uuid;
begin
  if me is null or not public.has_experience('relationships') then raise exception 'In Love membership required'; end if;
  if not exists (select 1 from relationships.exclusive_requests r where r.status = 'accepted'
                   and ((r.requester_id = me and r.recipient_id = p_partner) or (r.requester_id = p_partner and r.recipient_id = me))) then
    raise exception 'Becoming a couple starts with an accepted Exclusive Connection.';
  end if;
  if exists (select 1 from relationships.couple_members where user_id in (me, p_partner)) then
    raise exception 'One of you is already in a couple space.';
  end if;
  insert into relationships.couple_consents (user_id, partner_id) values (me, p_partner) on conflict do nothing;
  if not exists (select 1 from relationships.couple_consents where user_id = p_partner and partner_id = me) then
    return 'waiting';
  end if;
  insert into relationships.couples (created_by) values (me) returning id into cid;
  insert into relationships.couple_members (couple_id, user_id) values (cid, me), (cid, p_partner);
  update relationships.profiles set track = 'couple', is_visible = false where user_id in (me, p_partner);
  delete from relationships.couple_consents where (user_id, partner_id) in ((me, p_partner), (p_partner, me));
  return 'couple';
end $$;
revoke all on function relationships.become_couple(uuid) from public, anon;
grant execute on function relationships.become_couple(uuid) to authenticated;

create or replace function relationships.withdraw_couple_consent(p_partner uuid)
returns void language sql security definer set search_path = public, relationships as $$
  delete from relationships.couple_consents where user_id = auth.uid() and partner_id = p_partner;
$$;
revoke all on function relationships.withdraw_couple_consent(uuid) from public, anon;
grant execute on function relationships.withdraw_couple_consent(uuid) to authenticated;
