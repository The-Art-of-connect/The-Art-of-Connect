-- Love Language Profile — optional, private by default, for singles and couples.
-- Members record how they prefer to receive love, how they naturally express it,
-- what helps them feel connected and what leaves them feeling unappreciated.
-- Love languages are preferences that can change — never fixed types and never
-- the sole measure of compatibility.
-- Sharing is the member's choice: with their partner, and/or with matches they
-- have mutually connected with. Nobody else (including staff) can read it.

create table public.love_language_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  receive_rank text[] not null default '{}' check (receive_rank <@ array['touch','words','time','service','gifts']::text[] and coalesce(array_length(receive_rank, 1), 0) <= 5),
  express_rank text[] not null default '{}' check (express_rank <@ array['touch','words','time','service','gifts']::text[] and coalesce(array_length(express_rank, 1), 0) <= 5),
  feel_connected text check (char_length(feel_connected) <= 2000),
  feel_unappreciated text check (char_length(feel_unappreciated) <= 2000),
  notes text check (char_length(notes) <= 2000),
  share_with_partner boolean not null default false,
  share_with_matches boolean not null default false,
  use_in_journey boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.love_language_profiles enable row level security;
create policy "only the member" on public.love_language_profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger touch_love_language before update on public.love_language_profiles for each row execute function public.touch_updated_at();

-- Partner view: only when the partner chose to share, and only within the couple.
create or replace function public.partner_love_language()
returns table (display_name text, receive_rank text[], express_rank text[], feel_connected text, feel_unappreciated text, updated_at timestamptz)
language sql stable security definer set search_path = public, relationships as $$
  select p.display_name, l.receive_rank, l.express_rank, l.feel_connected, l.feel_unappreciated, l.updated_at
  from relationships.couple_members me
  join relationships.couple_members them on them.couple_id = me.couple_id and them.user_id <> me.user_id
  join public.love_language_profiles l on l.user_id = them.user_id and l.share_with_partner
  join public.profiles p on p.id = them.user_id
  where me.user_id = auth.uid()
  limit 1;
$$;

-- Match view: only between two singles with an accepted connection, and only if that member chose to share.
-- Rankings only — personal notes stay private.
create or replace function public.match_love_language(p_other uuid)
returns table (receive_rank text[], express_rank text[])
language sql stable security definer set search_path = public, relationships as $$
  select l.receive_rank, l.express_rank
  from public.love_language_profiles l
  where l.user_id = p_other and l.share_with_matches and p_other <> auth.uid()
    and exists (select 1 from relationships.connections c
                where c.status = 'accepted'
                  and ((c.requester_id = auth.uid() and c.recipient_id = p_other) or (c.recipient_id = auth.uid() and c.requester_id = p_other)))
    and not public.is_blocked_between(auth.uid(), p_other);
$$;

revoke all on function public.partner_love_language(), public.match_love_language(uuid) from public, anon;
grant execute on function public.partner_love_language(), public.match_love_language(uuid) to authenticated;
revoke all on public.love_language_profiles from public, anon;
grant select, insert, update, delete on public.love_language_profiles to authenticated;
grant all on public.love_language_profiles to service_role;

-- A Library lesson for members (also approved knowledge Journey can draw on).
insert into public.journey_knowledge (mode, title, body, status, kind, art)
select 'all', 'The five love languages', $k$People give and receive love in different ways. Five of the most common are Physical Touch, Words of Affirmation, Quality Time, Acts of Service and Receiving Gifts.

Physical Touch — feeling close through a hand held, an embrace, sitting near each other.
Words of Affirmation — feeling loved through sincere words: appreciation, encouragement, "I'm proud of you."
Quality Time — feeling valued through undivided attention and time that is truly shared.
Acts of Service — feeling cared for when someone lightens your load or follows through.
Receiving Gifts — feeling seen through thoughtful tokens that say "I was thinking of you."

Many of us express love in one way and long to receive it in another. Two people can love each other deeply and still miss each other's signals — not from a lack of love, but from speaking different languages.

Your preferences can change with the seasons of your life. They are not a personality type, and they are never the whole story of a relationship: shared values, honest communication, respect and how you repair after disagreement matter just as much.

Reflect: When did you last feel truly loved? What was happening? And what makes you feel overlooked or unappreciated?$k$, 'approved', 'module', 'love'
where not exists (select 1 from public.journey_knowledge where title = 'The five love languages');
