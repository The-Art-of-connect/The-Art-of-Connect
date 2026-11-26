-- ════════════════════════════════════════════════════════════════════
-- The Art of Connect — Social Ecosystem, phase 1 (Master Blueprint §3–4)
--   Member profiles and photographs · connections with intentions · follows
--   Connection Feed · Connection Circles · The Connect Calendar · conversations
--   Reports and moderation
-- Privacy is enforced HERE (row-level security and storage policies), not only in pages.
-- Reuses public.blocks / is_blocked_between, staff roles, couples and Elite tables.
-- Romance is never part of these networks: singles matchmaking stays separate.
-- ════════════════════════════════════════════════════════════════════

-- ─── Who may take part ────────────────────────────────────────────
create or replace function public.social_member(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = p and status = 'active');
$$;

create or replace function public.social_age(p uuid)
returns integer language sql stable security definer set search_path = public as $$
  select extract(year from age(current_date, date_of_birth))::int from public.member_private where user_id = p;
$$;

-- ─── Profiles ─────────────────────────────────────────────────────
create table public.social_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  headline text check (char_length(headline) <= 120),
  bio text check (char_length(bio) <= 1000),
  city text check (char_length(city) <= 80),
  region text check (char_length(region) <= 80),
  country text check (char_length(country) <= 80),
  show_location boolean not null default false,
  interests text[] not null default '{}' check (cardinality(interests) <= 20),
  -- What the member is available for (directive 11: members control this; mentorship is never required).
  seeking text[] not null default '{}' check (seeking <@ array['friendship', 'business', 'mentorship_seek', 'mentorship_offer', 'peers', 'explore', 'travel', 'hobbies', 'social', 'couples_friendship']::text[]),
  discoverable boolean not null default false,
  avatar_path text,
  updated_at timestamptz not null default now()
);

-- ─── Connections (mutual) and follows (one-way) ───────────────────
create table public.social_connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  -- Never romance: romantic matching lives only in The Personal Society singles experience.
  intention text not null check (intention in ('friendship', 'business', 'mentorship_seek', 'mentorship_offer', 'peers', 'explore', 'travel', 'hobbies', 'social', 'couples_friendship')),
  note text check (char_length(note) <= 300),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);
create unique index social_connections_pair on public.social_connections (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create or replace function public.social_connected(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.social_connections c where c.status = 'accepted'
    and ((c.requester_id = a and c.addressee_id = b) or (c.requester_id = b and c.addressee_id = a)))
    and not public.is_blocked_between(a, b);
$$;

create table public.social_follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

-- ─── Private connection preferences (progressive assessment, directive 11 §6) ───
-- Never readable by other members: recommendations are computed on the server and only the explanation
-- ("You both enjoy…") is shown. Elite-only choices let Elite members keep chosen activities among verified peers.
create table public.social_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  answers jsonb not null default '{}',
  elite_only text[] not null default '{}' check (elite_only <@ array['business', 'peers', 'friendship', 'social', 'travel', 'couples_friendship']::text[]),
  use_art_of_self boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ─── Circle categories (owner-managed, directive 12) ───────────────
create table public.social_circle_categories (
  key text primary key check (key ~ '^[a-z0-9_]{2,40}$'),
  name text not null check (char_length(name) between 2 and 80),
  description text check (char_length(description) <= 400),
  sort integer not null default 100,
  status text not null default 'active' check (status in ('active', 'hidden')),
  created_at timestamptz not null default now()
);
insert into public.social_circle_categories (key, name, sort) values
  ('business', 'Business & entrepreneurship', 10), ('travel', 'Travel & adventure', 20), ('friendships', 'Friendships', 30),
  ('social', 'Social activities', 40), ('dining', 'Dining & entertainment', 50), ('personal_development', 'Personal development', 60),
  ('wellness', 'Fitness & wellness', 70), ('retirement', 'Investing & retirement', 80), ('hobbies', 'Hobbies & culture', 90),
  ('singles', 'Intentional singles', 100), ('couples', 'Couples Connection', 110), ('life', 'Life transitions', 120),
  ('community', 'Community & mentorship', 130), ('local', 'Local, national & international', 140), ('elite', 'Elite Concierge', 150);

-- ─── Circles ──────────────────────────────────────────────────────
create table public.social_circles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  name text not null check (char_length(name) between 3 and 80),
  tagline text check (char_length(tagline) <= 160),
  description text check (char_length(description) <= 2000),
  category text not null references public.social_circle_categories (key) on update cascade,
  -- open: everyone · specialized: an interest or lifestyle focus, still open to every eligible member (never by income) · elite: verified Elite only
  kind text not null default 'open' check (kind in ('open', 'specialized', 'elite')),
  eligibility text not null default 'all' check (eligibility in ('all', 'couples', 'singles', 'elite')),
  interests text[] not null default '{}',
  status text not null default 'active' check (status in ('proposed', 'active', 'archived', 'declined')),
  is_official boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  -- Only explicitly designated Elite circles require Elite membership.
  check ((kind = 'elite') = (eligibility = 'elite'))
);

create or replace function public.social_circle_eligible(p uuid, c public.social_circles)
returns boolean language plpgsql stable security definer set search_path = public, relationships as $$
begin
  if not public.social_member(p) then return false; end if;
  if c.eligibility = 'all' then return true; end if;
  if c.eligibility = 'couples' then
    return exists (select 1 from relationships.couple_members m where m.user_id = p)
        or exists (select 1 from public.profiles where id = p and primary_society = 'couples');
  end if;
  if c.eligibility = 'singles' then
    return exists (select 1 from public.profiles where id = p and primary_society = 'singles')
       and coalesce(public.social_age(p), 0) >= public.setting_int('minimum_singles_age', 30)
       and not exists (select 1 from relationships.couple_members m where m.user_id = p);
  end if;
  if c.eligibility = 'elite' then
    return exists (select 1 from public.elite_badges b where b.user_id = p and b.status = 'active');
  end if;
  return false;
end $$;

create table public.social_circle_members (
  circle_id uuid not null references public.social_circles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'host')),
  notify boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

create or replace function public.social_in_circle(p uuid, c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.social_circle_members m where m.circle_id = c and m.user_id = p);
$$;

-- ─── Events: The Connect Calendar ─────────────────────────────────
create table public.social_events (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles (id) on delete set null,
  -- member_organized: the member organizes it · shared_external: a member shares someone else's event · official: The Art of Connect
  origin text not null check (origin in ('member_organized', 'shared_external', 'official')),
  title text not null check (char_length(title) between 3 and 140),
  description text check (char_length(description) <= 4000),
  category text not null check (category in ('business_networking', 'conference', 'social', 'singles', 'couples', 'travel', 'cruise', 'concert', 'festival', 'education', 'webinar', 'wellness', 'community_service', 'elite')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'America/New_York' check (char_length(timezone) <= 60),
  mode text not null default 'in_person' check (mode in ('in_person', 'virtual', 'hybrid')),
  venue text check (char_length(venue) <= 200),
  city text check (char_length(city) <= 80),
  region text check (char_length(region) <= 80),
  country text check (char_length(country) <= 80),
  is_free boolean not null default true,
  cost_text text check (char_length(cost_text) <= 80),
  url text check (url is null or url ~ '^https://[^\s]{3,500}$'),
  organizer_name text check (char_length(organizer_name) <= 120),
  eligibility text not null default 'all' check (eligibility in ('all', 'couples', 'singles', 'elite')),
  audience text not null default 'members' check (audience in ('members', 'connections', 'circle')),
  circle_id uuid references public.social_circles (id) on delete cascade,
  photo_path text,
  status text not null default 'active' check (status in ('active', 'canceled', 'removed')),
  created_at timestamptz not null default now(),
  check ((audience = 'circle') = (circle_id is not null)),
  check (ends_at is null or ends_at > starts_at)
);
create index social_events_starts on public.social_events (starts_at) where status = 'active';

create or replace function public.social_can_see_event(p uuid, e public.social_events)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare c public.social_circles;
begin
  if p is null then return false; end if;
  if e.created_by = p then return true; end if;
  if e.status <> 'active' or not public.social_member(p) then return false; end if;
  if e.created_by is not null and public.is_blocked_between(p, e.created_by) then return false; end if;
  if e.audience = 'connections' and not public.social_connected(p, e.created_by) then return false; end if;
  if e.audience = 'circle' and not public.social_in_circle(p, e.circle_id) then return false; end if;
  if e.eligibility <> 'all' then
    c.eligibility := e.eligibility;
    if not public.social_circle_eligible(p, c) then return false; end if;
  end if;
  return true;
end $$;

create table public.social_event_rsvps (
  event_id uuid not null references public.social_events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('interested', 'attending', 'info_requested')),
  attend_with boolean not null default false,
  -- Attendance is private unless the member chooses to show it.
  share_attendance boolean not null default false,
  remind boolean not null default false,
  reminded_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- ─── Posts: the Connection Feed ───────────────────────────────────
create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'thought' check (kind in ('thought', 'photo', 'accomplishment', 'life_update', 'education', 'event', 'recommendation')),
  body text check (char_length(body) <= 4000),
  photo_path text,
  audience text not null default 'members' check (audience in ('members', 'connections', 'circle')),
  circle_id uuid references public.social_circles (id) on delete cascade,
  event_id uuid references public.social_events (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'removed')),
  created_at timestamptz not null default now(),
  check ((audience = 'circle') = (circle_id is not null)),
  check (body is not null or photo_path is not null or event_id is not null)
);
create index social_posts_created on public.social_posts (created_at desc) where status = 'active';

create or replace function public.social_can_see_post(p uuid, x public.social_posts)
returns boolean language sql stable security definer set search_path = public as $$
  select p is not null and (x.author_id = p or (
    x.status = 'active' and public.social_member(p) and not public.is_blocked_between(p, x.author_id)
    and case x.audience when 'members' then true
                        when 'connections' then public.social_connected(p, x.author_id)
                        else public.social_in_circle(p, x.circle_id) end));
$$;

create table public.social_reactions (
  post_id uuid not null references public.social_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create table public.social_saves (
  post_id uuid not null references public.social_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create table public.social_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.social_posts (id) on delete cascade,
  event_id uuid references public.social_events (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  status text not null default 'active' check (status in ('active', 'removed')),
  created_at timestamptz not null default now(),
  check ((post_id is null) <> (event_id is null))
);

-- ─── Photographs ──────────────────────────────────────────────────
create table public.social_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  path text not null unique check (path ~ '^u/[0-9a-f-]{36}/[A-Za-z0-9._-]{8,80}$'),
  caption text check (char_length(caption) <= 300),
  visibility text not null default 'members' check (visibility in ('members', 'connections', 'private')),
  status text not null default 'active' check (status in ('active', 'removed')),
  created_at timestamptz not null default now()
);

create or replace function public.social_photo_limit(p uuid)
returns integer language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from public.elite_badges b where b.user_id = p and b.status = 'active') then public.setting_int('social_photo_limit_elite', 30)
    when exists (select 1 from public.subscriptions s where s.user_id = p and s.status in ('active', 'trialing')) then public.setting_int('social_photo_limit_paid', 15)
    else public.setting_int('social_photo_limit_free', 5) end;
$$;

create or replace function public.guard_social_photo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if split_part(new.path, '/', 2) <> new.user_id::text then raise exception 'Photos belong in your own folder'; end if;
  if (select count(*) from public.social_photos where user_id = new.user_id and status = 'active') >= public.social_photo_limit(new.user_id) then
    raise exception 'You have reached your photograph limit for your membership.';
  end if;
  return new;
end $$;
create trigger guard_social_photo before insert on public.social_photos for each row execute function public.guard_social_photo();

create or replace function public.social_can_see_photo(p uuid, ph public.social_photos)
returns boolean language sql stable security definer set search_path = public as $$
  select p is not null and (ph.user_id = p or (
    ph.status = 'active' and public.social_member(p) and not public.is_blocked_between(p, ph.user_id)
    and case ph.visibility when 'members' then true when 'connections' then public.social_connected(p, ph.user_id) else false end));
$$;

-- Storage: a file can be opened only if a photo, post or event that references it is visible to the viewer.
create or replace function public.social_can_open_file(p uuid, file_path text)
returns boolean language sql stable security definer set search_path = public as $$
  select split_part(file_path, '/', 2) = p::text
    or exists (select 1 from public.social_photos ph where ph.path = file_path and public.social_can_see_photo(p, ph))
    or exists (select 1 from public.social_profiles sp where sp.avatar_path = file_path and public.social_member(p) and not public.is_blocked_between(p, sp.user_id))
    or exists (select 1 from public.social_posts x where x.photo_path = file_path and public.social_can_see_post(p, x))
    or exists (select 1 from public.social_events e where e.photo_path = file_path and public.social_can_see_event(p, e));
$$;

-- Private bucket. File type (JPEG, PNG, WebP) and size (10 MB) are checked by the server before upload.
insert into storage.buckets (id, name, public) values ('member-photos', 'member-photos', false) on conflict (id) do nothing;
create policy "members upload own photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'member-photos' and (storage.foldername(name))[1] = 'u' and (storage.foldername(name))[2] = auth.uid()::text);
create policy "members open permitted photos" on storage.objects for select to authenticated
  using (bucket_id = 'member-photos' and (public.social_can_open_file(auth.uid(), name) or public.has_staff_role(array['owner', 'admin', 'moderator']::public.staff_role[])));
create policy "members delete own photos" on storage.objects for delete to authenticated
  using (bucket_id = 'member-photos' and (storage.foldername(name))[2] = auth.uid()::text);

-- ─── Conversations ────────────────────────────────────────────────
create table public.social_conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('direct', 'group', 'event')),
  title text check (char_length(title) <= 120),
  event_id uuid references public.social_events (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.social_conversation_members (
  conversation_id uuid not null references public.social_conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);
create table public.social_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.social_conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index social_messages_convo on public.social_messages (conversation_id, created_at);

create or replace function public.social_in_conversation(p uuid, c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.social_conversation_members m where m.conversation_id = c and m.user_id = p);
$$;

-- Start (or reopen) a private conversation with accepted connections only.
create or replace function public.social_start_conversation(p_members uuid[], p_title text default null, p_event uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); other uuid; cid uuid; others uuid[];
begin
  if me is null or not public.social_member(me) then raise exception 'Please sign in'; end if;
  others := array(select distinct x from unnest(p_members) x where x <> me);
  if cardinality(others) = 0 or cardinality(others) > 30 then raise exception 'Choose who to include'; end if;
  foreach other in array others loop
    if not public.social_connected(me, other) then raise exception 'You can message your connections only'; end if;
  end loop;
  if cardinality(others) = 1 and p_event is null then
    select c.id into cid from public.social_conversations c where c.kind = 'direct'
      and exists (select 1 from public.social_conversation_members m where m.conversation_id = c.id and m.user_id = me)
      and exists (select 1 from public.social_conversation_members m where m.conversation_id = c.id and m.user_id = others[1])
      and (select count(*) from public.social_conversation_members m where m.conversation_id = c.id) = 2 limit 1;
    if cid is not null then return cid; end if;
  end if;
  insert into public.social_conversations (kind, title, event_id, created_by)
    values (case when p_event is not null then 'event' when cardinality(others) = 1 then 'direct' else 'group' end, nullif(trim(p_title), ''), p_event, me)
    returning id into cid;
  insert into public.social_conversation_members (conversation_id, user_id) select cid, u from unnest(others || me) u;
  return cid;
end $$;

-- ─── Reports ──────────────────────────────────────────────────────
create table public.social_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  target_type text not null check (target_type in ('post', 'comment', 'event', 'circle', 'member', 'message', 'photo')),
  target_id uuid not null,
  reason text not null check (reason in ('harassment', 'spam', 'fraud', 'inappropriate', 'misleading', 'safety', 'other')),
  details text check (char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  automatic boolean not null default false,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- Fraud signal: events or posts that ask for direct payments are flagged for review automatically.
create or replace function public.social_flag_payment_requests()
returns trigger language plpgsql security definer set search_path = public as $$
declare txt text;
begin
  txt := lower(coalesce(new.description, '') || ' ' || coalesce(new.title, ''));
  if txt ~ '(cash ?app|venmo|zelle|paypal\.me|wire transfer|western union|gift card|crypto wallet|send (me )?money|pay (me )?directly)' then
    insert into public.social_reports (target_type, target_id, reason, details, automatic)
      values ('event', new.id, 'fraud', 'Automatic: the listing asks for a direct payment. Member events may not collect payments on the platform.', true);
  end if;
  return new;
end $$;
create trigger social_flag_payment_requests after insert or update of title, description on public.social_events
  for each row execute function public.social_flag_payment_requests();

-- ─── Row-level security ───────────────────────────────────────────
alter table public.social_preferences enable row level security;
alter table public.social_circle_categories enable row level security;
create policy "own preferences" on public.social_preferences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "read categories" on public.social_circle_categories for select to authenticated using (status = 'active' or public.has_staff_role(array['owner']::public.staff_role[]));
create policy "owner manages categories" on public.social_circle_categories for all to authenticated
  using (public.has_staff_role(array['owner']::public.staff_role[])) with check (public.has_staff_role(array['owner']::public.staff_role[]));
revoke all on public.social_preferences, public.social_circle_categories from public, anon;
grant select, insert, update, delete on public.social_preferences, public.social_circle_categories to authenticated;
grant all on public.social_preferences, public.social_circle_categories to service_role;
alter table public.social_profiles enable row level security;
alter table public.social_connections enable row level security;
alter table public.social_follows enable row level security;
alter table public.social_circles enable row level security;
alter table public.social_circle_members enable row level security;
alter table public.social_events enable row level security;
alter table public.social_event_rsvps enable row level security;
alter table public.social_posts enable row level security;
alter table public.social_reactions enable row level security;
alter table public.social_saves enable row level security;
alter table public.social_comments enable row level security;
alter table public.social_photos enable row level security;
alter table public.social_conversations enable row level security;
alter table public.social_conversation_members enable row level security;
alter table public.social_messages enable row level security;
alter table public.social_reports enable row level security;

-- Profiles: members see members (not blocked); location only when the member chose to show it (enforced in the view below).
create policy "own profile" on public.social_profiles for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "members read profiles" on public.social_profiles for select to authenticated
  using (public.social_member(auth.uid()) and not public.is_blocked_between(auth.uid(), user_id));

create policy "see own connections" on public.social_connections for select to authenticated using (auth.uid() in (requester_id, addressee_id));
create policy "request connection" on public.social_connections for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending' and public.social_member(auth.uid()) and public.social_member(addressee_id)
              and not public.is_blocked_between(requester_id, addressee_id));
create policy "respond to connection" on public.social_connections for update to authenticated
  using (addressee_id = auth.uid()) with check (addressee_id = auth.uid() and status in ('accepted', 'declined'));
create policy "remove connection" on public.social_connections for delete to authenticated using (auth.uid() in (requester_id, addressee_id));

create policy "see own follows" on public.social_follows for select to authenticated using (auth.uid() in (follower_id, followee_id));
create policy "follow" on public.social_follows for insert to authenticated
  with check (follower_id = auth.uid() and public.social_member(auth.uid()) and not public.is_blocked_between(follower_id, followee_id));
create policy "unfollow" on public.social_follows for delete to authenticated using (follower_id = auth.uid());

create policy "read circles" on public.social_circles for select to authenticated
  using (status = 'active' or created_by = auth.uid() or public.has_staff_role(array['owner', 'admin', 'moderator']::public.staff_role[]));
create policy "propose circle" on public.social_circles for insert to authenticated
  with check (created_by = auth.uid() and status = 'proposed' and not is_official and public.social_member(auth.uid()));
create policy "owner creates circles" on public.social_circles for insert to authenticated
  with check (public.has_staff_role(array['owner']::public.staff_role[]));
create policy "owner manages circles" on public.social_circles for update to authenticated
  using (public.has_staff_role(array['owner']::public.staff_role[])) with check (public.has_staff_role(array['owner']::public.staff_role[]));

create policy "read circle members" on public.social_circle_members for select to authenticated
  using (user_id = auth.uid() or (public.social_in_circle(auth.uid(), circle_id) and not public.is_blocked_between(auth.uid(), user_id))
         or public.has_staff_role(array['owner', 'admin', 'moderator']::public.staff_role[]));
create policy "join eligible circle" on public.social_circle_members for insert to authenticated
  with check (user_id = auth.uid() and role = 'member'
              and exists (select 1 from public.social_circles c where c.id = circle_id and c.status = 'active' and public.social_circle_eligible(auth.uid(), c)));
create policy "own circle settings" on public.social_circle_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "leave circle" on public.social_circle_members for delete to authenticated using (user_id = auth.uid());

create policy "see events" on public.social_events for select to authenticated using (public.social_can_see_event(auth.uid(), social_events));
create policy "create events" on public.social_events for insert to authenticated
  with check (created_by = auth.uid() and origin in ('member_organized', 'shared_external') and status = 'active' and public.social_member(auth.uid())
              and (circle_id is null or public.social_in_circle(auth.uid(), circle_id)));
create policy "edit own events" on public.social_events for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid() and origin in ('member_organized', 'shared_external') and status in ('active', 'canceled'));
create policy "staff manage events" on public.social_events for all to authenticated
  using (public.has_staff_role(array['owner', 'admin', 'moderator']::public.staff_role[])) with check (public.has_staff_role(array['owner', 'admin', 'moderator']::public.staff_role[]));

create policy "own rsvps" on public.social_event_rsvps for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.social_events e where e.id = event_id and public.social_can_see_event(auth.uid(), e)));
create policy "shared attendance" on public.social_event_rsvps for select to authenticated
  using (share_attendance and not public.is_blocked_between(auth.uid(), user_id)
         and exists (select 1 from public.social_events e where e.id = event_id and public.social_can_see_event(auth.uid(), e)));

create policy "see posts" on public.social_posts for select to authenticated using (public.social_can_see_post(auth.uid(), social_posts));
create policy "create posts" on public.social_posts for insert to authenticated
  with check (author_id = auth.uid() and status = 'active' and public.social_member(auth.uid())
              and (circle_id is null or public.social_in_circle(auth.uid(), circle_id))
              and (photo_path is null or split_part(photo_path, '/', 2) = auth.uid()::text));
create policy "delete own posts" on public.social_posts for delete to authenticated using (author_id = auth.uid());
create policy "staff moderate posts" on public.social_posts for update to authenticated
  using (public.has_staff_role(array['owner', 'admin', 'moderator']::public.staff_role[])) with check (public.has_staff_role(array['owner', 'admin', 'moderator']::public.staff_role[]));

create policy "see reactions" on public.social_reactions for select to authenticated
  using (exists (select 1 from public.social_posts x where x.id = post_id and public.social_can_see_post(auth.uid(), x)));
create policy "appreciate" on public.social_reactions for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.social_posts x where x.id = post_id and public.social_can_see_post(auth.uid(), x)));
create policy "unappreciate" on public.social_reactions for delete to authenticated using (user_id = auth.uid());

create policy "own saves" on public.social_saves for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.social_posts x where x.id = post_id and public.social_can_see_post(auth.uid(), x)));

create policy "see comments" on public.social_comments for select to authenticated
  using ((status = 'active' or author_id = auth.uid()) and not public.is_blocked_between(auth.uid(), author_id) and (
    (post_id is not null and exists (select 1 from public.social_posts x where x.id = post_id and public.social_can_see_post(auth.uid(), x)))
    or (event_id is not null and exists (select 1 from public.social_events e where e.id = event_id and public.social_can_see_event(auth.uid(), e)))));
create policy "comment" on public.social_comments for insert to authenticated
  with check (author_id = auth.uid() and status = 'active' and (
    (post_id is not null and exists (select 1 from public.social_posts x where x.id = post_id and public.social_can_see_post(auth.uid(), x)))
    or (event_id is not null and exists (select 1 from public.social_events e where e.id = event_id and public.social_can_see_event(auth.uid(), e)))));
create policy "delete own comments" on public.social_comments for delete to authenticated using (author_id = auth.uid());
create policy "staff moderate comments" on public.social_comments for update to authenticated
  using (public.has_staff_role(array['owner', 'admin', 'moderator']::public.staff_role[])) with check (public.has_staff_role(array['owner', 'admin', 'moderator']::public.staff_role[]));

create policy "see photos" on public.social_photos for select to authenticated using (public.social_can_see_photo(auth.uid(), social_photos));
create policy "add own photos" on public.social_photos for insert to authenticated with check (user_id = auth.uid() and status = 'active');
create policy "edit own photos" on public.social_photos for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and status = 'active');
create policy "delete own photos" on public.social_photos for delete to authenticated using (user_id = auth.uid());
create policy "staff moderate photos" on public.social_photos for update to authenticated
  using (public.has_staff_role(array['owner', 'admin', 'moderator']::public.staff_role[])) with check (public.has_staff_role(array['owner', 'admin', 'moderator']::public.staff_role[]));

create policy "see own conversations" on public.social_conversations for select to authenticated using (public.social_in_conversation(auth.uid(), id));
create policy "see conversation members" on public.social_conversation_members for select to authenticated using (public.social_in_conversation(auth.uid(), conversation_id));
create policy "mark read" on public.social_conversation_members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "leave conversation" on public.social_conversation_members for delete to authenticated using (user_id = auth.uid());
create policy "read messages" on public.social_messages for select to authenticated using (public.social_in_conversation(auth.uid(), conversation_id));
create policy "send messages" on public.social_messages for insert to authenticated
  with check (sender_id = auth.uid() and public.social_in_conversation(auth.uid(), conversation_id)
              and not exists (select 1 from public.social_conversation_members m where m.conversation_id = social_messages.conversation_id and m.user_id <> auth.uid() and public.is_blocked_between(auth.uid(), m.user_id)));

-- Moderators can review reported content wherever it was posted.
create policy "staff read posts" on public.social_posts for select to authenticated using (public.has_staff_role(array['owner', 'admin', 'moderator']::public.staff_role[]));
create policy "staff read comments" on public.social_comments for select to authenticated using (public.has_staff_role(array['owner', 'admin', 'moderator']::public.staff_role[]));
create policy "staff read photos" on public.social_photos for select to authenticated using (public.has_staff_role(array['owner', 'admin', 'moderator']::public.staff_role[]));
create policy "file reports" on public.social_reports for insert to authenticated
  with check (reporter_id = auth.uid() and status = 'open' and not automatic);
create policy "see own reports" on public.social_reports for select to authenticated
  using (reporter_id = auth.uid() or public.has_staff_role(array['owner', 'admin', 'moderator']::public.staff_role[]));
create policy "staff resolve reports" on public.social_reports for update to authenticated
  using (public.has_staff_role(array['owner', 'admin', 'moderator']::public.staff_role[])) with check (public.has_staff_role(array['owner', 'admin', 'moderator']::public.staff_role[]));

revoke all on public.social_profiles, public.social_connections, public.social_follows, public.social_circles, public.social_circle_members,
  public.social_events, public.social_event_rsvps, public.social_posts, public.social_reactions, public.social_saves, public.social_comments,
  public.social_photos, public.social_conversations, public.social_conversation_members, public.social_messages, public.social_reports from public, anon;
-- Members may change only their notification choice on a circle membership (never their role).
grant select, insert, delete on public.social_circle_members to authenticated;
grant update (notify) on public.social_circle_members to authenticated;
grant select, insert, update, delete on public.social_profiles, public.social_connections, public.social_follows,
  public.social_event_rsvps, public.social_reactions, public.social_saves, public.social_comments, public.social_photos,
  public.social_conversation_members to authenticated;
grant select, insert, update on public.social_circles, public.social_events, public.social_reports to authenticated;
grant select, insert, update, delete on public.social_posts to authenticated;
grant select on public.social_conversations to authenticated;
grant select, insert on public.social_messages to authenticated;
grant all on public.social_profiles, public.social_connections, public.social_follows, public.social_circles, public.social_circle_members,
  public.social_events, public.social_event_rsvps, public.social_posts, public.social_reactions, public.social_saves, public.social_comments,
  public.social_photos, public.social_conversations, public.social_conversation_members, public.social_messages, public.social_reports to service_role;

revoke all on function public.social_start_conversation(uuid[], text, uuid) from public, anon;
grant execute on function public.social_start_conversation(uuid[], text, uuid) to authenticated;

-- Member directory: public profile fields only; location only when the member chose to show it; never age, DOB,
-- assessments, journals, finances or counseling.
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
    and (p_ids is not null and p.id = any(p_ids)
         or p_ids is null and sp.discoverable and (p_seeking is null or p_seeking = any(sp.seeking))
            -- Couples friendship is between couples only.
            and (p_seeking is distinct from 'couples_friendship' or (
                 exists (select 1 from relationships.couple_members m where m.user_id = p.id)
                 and exists (select 1 from relationships.couple_members m where m.user_id = (select id from me)))))
  order by 14 desc, 15 desc, p.display_name
  limit least(coalesce(p_limit, 60), 200);
$$;
revoke all on function public.social_directory(uuid[], text, integer) from public, anon;
grant execute on function public.social_directory(uuid[], text, integer) to authenticated;

-- Event attendance counts (numbers only; names only for members who chose to show attendance).
create or replace function public.social_event_counts(p_events uuid[])
returns table (event_id uuid, interested integer, attending integer, attend_with integer)
language sql stable security definer set search_path = public as $$
  select e.id, count(*) filter (where r.status = 'interested')::int, count(*) filter (where r.status = 'attending')::int,
         count(*) filter (where r.attend_with and r.share_attendance)::int
  from public.social_events e left join public.social_event_rsvps r on r.event_id = e.id
  where e.id = any(p_events) and public.social_can_see_event(auth.uid(), e)
  group by e.id;
$$;
revoke all on function public.social_event_counts(uuid[]) from public, anon;
grant execute on function public.social_event_counts(uuid[]) to authenticated;

-- Appreciation counts per post.
create or replace function public.social_post_counts(p_posts uuid[])
returns table (post_id uuid, appreciations integer, comments integer)
language sql stable security definer set search_path = public as $$
  select x.id, (select count(*)::int from public.social_reactions r where r.post_id = x.id),
         (select count(*)::int from public.social_comments c where c.post_id = x.id and c.status = 'active')
  from public.social_posts x where x.id = any(p_posts) and public.social_can_see_post(auth.uid(), x);
$$;
revoke all on function public.social_post_counts(uuid[]) from public, anon;
grant execute on function public.social_post_counts(uuid[]) to authenticated;

-- Owner approves a proposed circle: it goes live and the proposer becomes its host.
create or replace function public.social_approve_circle(p_circle uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare c public.social_circles;
begin
  if not public.has_staff_role(array['owner']::public.staff_role[]) then raise exception 'Not permitted'; end if;
  select * into c from public.social_circles where id = p_circle and status = 'proposed';
  if c.id is null then raise exception 'Not found'; end if;
  update public.social_circles set status = case when p_approve then 'active' else 'declined' end where id = c.id;
  if p_approve and c.created_by is not null then
    insert into public.social_circle_members (circle_id, user_id, role) values (c.id, c.created_by, 'host') on conflict (circle_id, user_id) do update set role = 'host';
  end if;
end $$;
revoke all on function public.social_approve_circle(uuid, boolean) from public, anon;
grant execute on function public.social_approve_circle(uuid, boolean) to authenticated;

insert into public.platform_settings (key, value, description) values
  ('social_photo_limit_free', '5', 'Profile photographs: free members (proposal, owner-configurable)'),
  ('social_photo_limit_paid', '15', 'Profile photographs: paid members (proposal, owner-configurable)'),
  ('social_photo_limit_elite', '30', 'Profile photographs: Elite members (proposal, owner-configurable)')
on conflict (key) do nothing;


-- ─── Seeded circles: Open, Specialized and Verified Elite in every category (directives 08, 10, 12, 13) ─────
-- Ordinary and luxury-interest circles are open to every eligible member regardless of income or status.
-- Only circles of kind 'elite' require verified Elite membership. Couples and singles circles follow
-- relationship-status and age requirements only (couples: linked couples; singles: 30+).
insert into public.social_circles (slug, name, tagline, category, kind, eligibility, interests, is_official) values
  ('entrepreneurs', 'The Visionaries', 'Entrepreneurship, ambition and innovation. Open to everyone building something.', 'business', 'open', 'all', array['entrepreneurship', 'business']::text[], true),
  ('aspiring-entrepreneurs', 'Aspiring Entrepreneurs', 'For those starting out: ideas, first steps and encouragement.', 'business', 'specialized', 'all', array['entrepreneurship', 'business', 'personal_growth']::text[], true),
  ('established-owners', 'Established Business Owners', 'Running a business today: operations, people and growth.', 'business', 'specialized', 'all', array['business', 'leadership']::text[], true),
  ('growth-expansion', 'Growth & Expansion', 'Scaling, new markets and strategic partnerships.', 'business', 'specialized', 'all', array['business', 'entrepreneurship', 'investing']::text[], true),
  ('executive-leadership', 'Executive Leadership', 'Leaders sharing perspective, strategy and support.', 'business', 'specialized', 'all', array['leadership', 'business', 'mentorship']::text[], true),
  ('elite-business', 'Elite Business', 'Verified Elite members: strategic partnerships and introductions.', 'business', 'elite', 'elite', array['business', 'leadership', 'investing']::text[], true),
  ('world-explorers', 'The World Explorers', 'For people who believe life is meant to be experienced.', 'travel', 'open', 'all', array['travel', 'culture', 'outdoors']::text[], true),
  ('affordable-adventures', 'Affordable Adventures', 'Unforgettable trips that respect your budget.', 'travel', 'specialized', 'all', array['travel', 'outdoors']::text[], true),
  ('luxury-travel', 'Luxury Travel', 'Fine hotels, first-class experiences and refined itineraries. Open to everyone who loves them.', 'travel', 'specialized', 'all', array['travel', 'dining', 'wine']::text[], true),
  ('international-explorers', 'International Explorers', 'Cultures, languages and far-away places.', 'travel', 'specialized', 'all', array['travel', 'culture']::text[], true),
  ('cruise-enthusiasts', 'Cruise Enthusiasts', 'Ports, ships and sailing companions.', 'travel', 'specialized', 'all', array['travel', 'social']::text[], true),
  ('solo-travelers', 'Solo Travelers', 'Traveling on your own terms, safely and confidently.', 'travel', 'specialized', 'all', array['travel', 'personal_growth']::text[], true),
  ('elite-travel', 'Elite Travel', 'Verified Elite members: private travel companionship and experiences.', 'travel', 'elite', 'elite', array['travel', 'dining']::text[], true),
  ('friendships-social', 'The Authentic Connections', 'Meaningful friendships with people of every background.', 'friendships', 'open', 'all', array['friendship', 'social']::text[], true),
  ('new-in-town', 'New in Town', 'Building a circle in a new city.', 'friendships', 'specialized', 'all', array['friendship', 'community']::text[], true),
  ('friendships-over-50', 'Friendships Over 50', 'Connection, laughter and wisdom.', 'friendships', 'specialized', 'all', array['friendship', 'wellness']::text[], true),
  ('social-gatherings', 'Social Gatherings', 'Game nights, brunches and get-togethers.', 'social', 'open', 'all', array['social', 'friendship']::text[], true),
  ('social-sophisticates', 'The Social Sophisticates', 'Galas, culture and elegant evenings. Open to everyone.', 'social', 'specialized', 'all', array['social', 'arts', 'wine']::text[], true),
  ('dining-entertainment', 'Dining & Entertainment', 'Restaurants, shows and evenings out.', 'dining', 'open', 'all', array['dining', 'social']::text[], true),
  ('fine-dining-wine', 'Fine Dining & Wine', 'Tasting menus, sommeliers and wine country.', 'dining', 'specialized', 'all', array['dining', 'wine']::text[], true),
  ('home-cooks', 'Home Cooks & Hosts', 'Recipes, dinner parties and hosting.', 'dining', 'specialized', 'all', array['cooking', 'social']::text[], true),
  ('personal-development', 'The Growth Collective', 'Personal development, habits and becoming.', 'personal_development', 'open', 'all', array['personal_growth', 'books']::text[], true),
  ('conscious-living', 'The Conscious Collective', 'Self-awareness, mindfulness and intentional living.', 'personal_development', 'specialized', 'all', array['conscious_living', 'wellness']::text[], true),
  ('manifestations', 'Manifestations & Affirmations', 'Intentions, affirmations and gratitude, shared.', 'personal_development', 'specialized', 'all', array['manifestation', 'conscious_living', 'faith']::text[], true),
  ('faith-purpose', 'Faith & Purpose', 'Living with meaning and conviction.', 'personal_development', 'specialized', 'all', array['faith', 'personal_growth']::text[], true),
  ('fitness-wellness', 'Fitness & Wellness', 'Movement, nutrition and well-being.', 'wellness', 'open', 'all', array['fitness', 'wellness']::text[], true),
  ('active-outdoors', 'Active & Outdoors', 'Hiking, golf, running and the open air.', 'wellness', 'specialized', 'all', array['outdoors', 'fitness', 'golf']::text[], true),
  ('investing-retirement', 'Investing & Retirement Planning', 'Thoughtful conversations about building and preserving wealth. Not financial advice.', 'retirement', 'open', 'all', array['investing']::text[], true),
  ('new-investors', 'New Investors', 'Learning the basics together. Not financial advice.', 'retirement', 'specialized', 'all', array['investing', 'personal_growth']::text[], true),
  ('retirement-living', 'Retirement Living', 'Purpose, travel and community in retirement.', 'retirement', 'specialized', 'all', array['investing', 'travel', 'community']::text[], true),
  ('arts-culture', 'Music, Arts & Culture', 'Concerts, galleries, theatre and the creative life.', 'hobbies', 'open', 'all', array['arts', 'music', 'culture']::text[], true),
  ('book-lovers', 'Book Lovers', 'Reading, discussing and recommending.', 'hobbies', 'specialized', 'all', array['books']::text[], true),
  ('golf-sport', 'Golf & Sport', 'Tee times, games and friendly competition.', 'hobbies', 'specialized', 'all', array['golf', 'fitness']::text[], true),
  ('fashion-style', 'Fashion & Style', 'Style, design and self-expression.', 'hobbies', 'specialized', 'all', array['fashion', 'arts']::text[], true),
  ('life-transitions', 'Life Transitions', 'Support and perspective through change.', 'life', 'open', 'all', array['personal_growth', 'wellness']::text[], true),
  ('empty-nesters', 'Empty Nesters', 'A new chapter: purpose, freedom and connection.', 'life', 'specialized', 'all', array['family', 'travel', 'friendship']::text[], true),
  ('starting-over', 'Starting Over After Divorce', 'Rebuilding with dignity, hope and community.', 'life', 'specialized', 'all', array['personal_growth', 'friendship']::text[], true),
  ('community-involvement', 'Community Involvement', 'Service, philanthropy and giving back.', 'community', 'open', 'all', array['community', 'philanthropy']::text[], true),
  ('professional-mentorship', 'Professional Mentorship', 'Mentors and mentees growing together, by choice.', 'community', 'specialized', 'all', array['mentorship', 'leadership']::text[], true),
  ('local-connections', 'Local, National & International', 'Find members near you and around the world.', 'local', 'open', 'all', array['friendship', 'community', 'travel']::text[], true),
  ('elite-connections', 'Elite Connections', 'The Elite Concierge Society community.', 'elite', 'elite', 'elite', array['leadership', 'philanthropy']::text[], true),
  ('elite-social', 'Elite Social Friendships', 'Verified Elite members: friendships and shared experiences.', 'elite', 'elite', 'elite', array['friendship', 'social']::text[], true),
  ('couples-marriage', 'Couples & Marriage', 'Couples building strong, joyful partnerships.', 'couples', 'open', 'couples', array['family', 'personal_growth']::text[], true),
  ('couples-travel', 'Travel Couples', 'Couples who explore the world together.', 'couples', 'specialized', 'couples', array['travel', 'culture']::text[], true),
  ('newlyweds', 'Newlyweds', 'The first years, together.', 'couples', 'specialized', 'couples', array['family']::text[], true),
  ('entrepreneurial-couples', 'Entrepreneurial Couples', 'Building businesses and a partnership.', 'couples', 'specialized', 'couples', array['entrepreneurship', 'business']::text[], true),
  ('couples-empty-nesters', 'Empty Nester Couples', 'Rediscovering each other and the world.', 'couples', 'specialized', 'couples', array['family', 'travel']::text[], true),
  ('couples-over-50', 'Couples Over 50', 'Connection, adventure and wisdom.', 'couples', 'specialized', 'couples', array['travel', 'wellness']::text[], true),
  ('date-nights', 'Date Nights', 'Ideas, double dates and evenings out.', 'couples', 'specialized', 'couples', array['dining', 'arts', 'social']::text[], true),
  ('marriage-growth', 'Marriage Growth', 'Couples investing in their relationship.', 'couples', 'specialized', 'couples', array['personal_growth', 'family']::text[], true),
  ('local-couples', 'Local Couples', 'Couples connecting close to home.', 'couples', 'specialized', 'couples', array['friendship', 'community']::text[], true),
  ('shared-adventures', 'Shared Adventures', 'Couples who say yes to the next experience.', 'couples', 'specialized', 'couples', array['outdoors', 'travel']::text[], true),
  ('elite-couples', 'Elite Couples', 'Verified Elite couples: friendships and shared travel.', 'couples', 'elite', 'elite', array['travel', 'dining']::text[], true),
  ('intentional-singles', 'Intentional Singles', 'Singles 30+ growing with intention. Friendship and community; romance stays in The Personal Society.', 'singles', 'open', 'singles', array['personal_growth', 'friendship']::text[], true),
  ('singles-social', 'Singles Social', 'Singles 30+ meeting at events and gatherings.', 'singles', 'specialized', 'singles', array['social', 'dining']::text[], true),
  ('singles-travel', 'Singles Who Travel', 'Singles 30+ who love to explore.', 'singles', 'specialized', 'singles', array['travel']::text[], true),
  ('elite-singles', 'Elite Singles', 'Verified Elite singles: private introductions through The Personal Society.', 'singles', 'elite', 'elite', array['leadership', 'travel']::text[], true)
on conflict (slug) do nothing;

-- Privacy helpers used by the policies above (read-only checks; they reveal nothing beyond yes/no).
grant execute on function public.social_member(uuid), public.social_connected(uuid, uuid),
  public.social_circle_eligible(uuid, public.social_circles), public.social_in_circle(uuid, uuid),
  public.social_can_see_event(uuid, public.social_events), public.social_can_see_post(uuid, public.social_posts),
  public.social_photo_limit(uuid), public.social_can_see_photo(uuid, public.social_photos), public.social_can_open_file(uuid, text),
  public.social_in_conversation(uuid, uuid) to authenticated, service_role;
