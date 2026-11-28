-- Live Q&A in The Becoming Circle and the Message Center (founder directive 43, November 28, 2026).
-- Audit: The Becoming Circle already has topics, written discussion, polls, moderators, reports, bans, the Safety Shield
-- and a moderation log. A Live Q&A session reuses all of that: each session is a Becoming Circle topic in "audio" (live)
-- mode with its own distinct topic, plus a schedule the owner controls without a deployment. Live audio itself needs a
-- paid streaming provider and stays off until the founder approves one (text Q&A and listening to the discussion work now).

-- Live sessions start at any owner-chosen time; written topics keep their four-hour grid.
alter table public.circle_topics drop constraint if exists circle_topics_slot_start_check;
alter table public.circle_topics add constraint circle_topics_slot_start_check
  check (slot_start is null or mode = 'audio' or ((extract(epoch from slot_start))::bigint % 14400) = 0);

-- One written topic per four-hour slot still holds; live sessions are separate and may share a time.
drop index if exists public.circle_one_topic_per_slot;
create unique index circle_one_topic_per_slot on public.circle_topics (slot_start) where room = 'becoming' and status = 'scheduled' and mode = 'text';

-- ─── Owner controls (one row) ──────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.circle_live_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default true,
  start_times text[] not null default '{10:00,19:00}' check (cardinality(start_times) between 1 and 6),
  timezone text not null default 'America/New_York',
  duration_minutes integer not null default 60 check (duration_minutes between 15 and 240),
  eligibility text not null default 'all_members' check (eligibility in ('all_members', 'paid_members')),
  popup_invitations boolean not null default true,
  message_center_invitations boolean not null default true,
  default_host uuid references public.profiles(id) on delete set null,
  live_audio_enabled boolean not null default false,
  audio_provider text,
  -- Live audio is paid infrastructure: it can only be on with a provider the founder has approved.
  constraint live_audio_needs_provider check (not live_audio_enabled or audio_provider is not null),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.circle_live_settings (id) values (true) on conflict do nothing;
alter table public.circle_live_settings enable row level security;
drop policy if exists live_settings_read on public.circle_live_settings;
create policy live_settings_read on public.circle_live_settings for select using (auth.uid() is not null);
drop policy if exists live_settings_owner on public.circle_live_settings;
create policy live_settings_owner on public.circle_live_settings for update using (public.has_staff_role(array['owner']::public.staff_role[]))
  with check (public.has_staff_role(array['owner']::public.staff_role[]) and (not live_audio_enabled or audio_provider is not null));
grant select, update on public.circle_live_settings to authenticated;

-- ─── Sessions and attendance ───────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.circle_live_sessions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.circle_topics(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  host_id uuid references public.profiles(id) on delete set null,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'ended', 'canceled')),
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (starts_at)
);
alter table public.circle_live_sessions enable row level security;
drop policy if exists live_sessions_read on public.circle_live_sessions;
create policy live_sessions_read on public.circle_live_sessions for select using (auth.uid() is not null);
drop policy if exists live_sessions_staff on public.circle_live_sessions;
create policy live_sessions_staff on public.circle_live_sessions for all using (public.has_staff_role(array['owner', 'admin', 'moderator']::public.staff_role[]))
  with check (public.has_staff_role(array['owner', 'admin', 'moderator']::public.staff_role[]));
grant select, insert, update on public.circle_live_sessions to authenticated;

create table if not exists public.circle_live_attendance (
  session_id uuid not null references public.circle_live_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null default 'participate' check (mode in ('participate', 'listen')),
  joined_at timestamptz not null default now(),
  primary key (session_id, user_id)
);
alter table public.circle_live_attendance enable row level security;
drop policy if exists live_attendance_own on public.circle_live_attendance;
create policy live_attendance_own on public.circle_live_attendance for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists live_attendance_staff on public.circle_live_attendance;
create policy live_attendance_staff on public.circle_live_attendance for select using (public.has_staff_role(array['owner', 'admin', 'moderator']::public.staff_role[]));
grant select, insert, update on public.circle_live_attendance to authenticated;

-- ─── Message Center and notification preferences ───────────────────────────────────────────────────────────────────────
create table if not exists public.member_notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('live_qa', 'milestone', 'growth_report', 'system')),
  title text not null check (char_length(title) <= 200),
  body text check (char_length(body) <= 2000),
  href text check (href ~ '^/app(/|$)'),
  ref_id uuid,
  popup_seen_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref_id)
);
create index if not exists member_notices_user on public.member_notices (user_id, created_at desc);
alter table public.member_notices enable row level security;
drop policy if exists notices_own_read on public.member_notices;
create policy notices_own_read on public.member_notices for select using (user_id = auth.uid());
drop policy if exists notices_own_update on public.member_notices;
create policy notices_own_update on public.member_notices for update using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, update (read_at, popup_seen_at) on public.member_notices to authenticated;

create table if not exists public.notification_prefs (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  live_qa_popup boolean not null default true,
  live_qa_message boolean not null default true,
  milestones boolean not null default true,
  growth_reports boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.notification_prefs enable row level security;
drop policy if exists prefs_own on public.notification_prefs;
create policy prefs_own on public.notification_prefs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.notification_prefs to authenticated;

-- ─── The schedule tick (runs every 15 minutes with the existing scheduled job) ─────────────────────────────────────────
-- Creates today's and tomorrow's sessions from the owner's settings (each with a distinct approved topic), marks sessions
-- live or ended, and delivers one Message Center invitation per eligible member when a session goes live.
create or replace function public.circle_live_tick()
returns integer language plpgsql security definer set search_path = public as $$
declare s public.circle_live_settings; d date; t text; at timestamptz; pick public.circle_topics; tid uuid; n integer := 0; sess public.circle_live_sessions;
begin
  select * into s from public.circle_live_settings where id;
  if s.id is null or not s.enabled then return 0; end if;
  for d in select generate_series((now() at time zone s.timezone)::date, (now() at time zone s.timezone)::date + 1, interval '1 day')::date loop
    foreach t in array s.start_times loop
      at := (d::text || ' ' || t)::timestamp at time zone s.timezone;
      continue when at < now() - make_interval(mins => s.duration_minutes) or exists (select 1 from public.circle_live_sessions where starts_at = at);
      -- A distinct topic: the least recently used owner-approved topic (never repeating today's).
      select * into pick from public.circle_topics c where c.status in ('approved', 'scheduled') and c.mode = 'text'
        and not exists (select 1 from public.circle_topics x join public.circle_live_sessions l on l.topic_id = x.id where x.title = c.title and l.starts_at > now() - interval '2 days')
        order by c.updated_at asc limit 1;
      insert into public.circle_topics (title, prompt, category, room, slot_start, status, source, mode, open_hours, moderator_id)
        values (coalesce(pick.title, 'Open Q&A: what is on your mind today?'),
                coalesce(pick.prompt, 'Join today''s live Q&A. Ask questions, share your perspective or simply listen.'),
                coalesce(pick.category, 'personal-development'), 'becoming', at, 'scheduled', 'owner', 'audio',
                greatest(4, ceil(s.duration_minutes / 60.0)::int), s.default_host)
        returning id into tid;
      insert into public.circle_live_sessions (topic_id, starts_at, ends_at, host_id) values (tid, at, at + make_interval(mins => s.duration_minutes), s.default_host);
      n := n + 1;
    end loop;
  end loop;
  update public.circle_live_sessions set status = 'ended' where status in ('scheduled', 'live') and ends_at <= now();
  update public.circle_live_sessions set status = 'live' where status = 'scheduled' and starts_at <= now() and ends_at > now();
  -- One Message Center invitation per eligible member per live session (never repeated).
  for sess in select * from public.circle_live_sessions where status = 'live' and notified_at is null loop
    if s.message_center_invitations or s.popup_invitations then
      insert into public.member_notices (user_id, kind, title, body, href, ref_id)
        select p.id, 'live_qa', 'Live now in The Becoming Circle: ' || c.title, 'Join today''s live Q&A. Ask questions, share your perspective or simply listen.',
               '/app/circle/' || c.id, sess.id
        from public.profiles p join public.circle_topics c on c.id = sess.topic_id
        left join public.notification_prefs np on np.user_id = p.id
        where p.status = 'active' and p.account_type = 'member'
          and (coalesce(np.live_qa_message, true) or coalesce(np.live_qa_popup, true))
          and (s.eligibility = 'all_members' or exists (select 1 from public.experience_access a where a.user_id = p.id and a.status = 'active' and a.experience in ('business', 'relationships')))
        on conflict do nothing;
    end if;
    update public.circle_live_sessions set notified_at = now() where id = sess.id;
  end loop;
  return n;
end $$;
revoke all on function public.circle_live_tick() from public, anon, authenticated;
grant execute on function public.circle_live_tick() to service_role;

-- The pop-up invitation for the signed-in member: once per session, only while live, only if they allow pop-ups.
create or replace function public.live_invitation()
returns table (notice_id uuid, session_id uuid, topic_id uuid, title text, prompt text, host text, ends_at timestamptz)
language sql stable security definer set search_path = public as $$
  select n.id, l.id, c.id, c.title, c.prompt, coalesce(nullif(split_part(h.display_name, ' ', 1), ''), 'The Becoming Circle host'), l.ends_at
  from public.member_notices n
  join public.circle_live_sessions l on l.id = n.ref_id and l.status = 'live'
  join public.circle_topics c on c.id = l.topic_id
  left join public.profiles h on h.id = l.host_id
  left join public.notification_prefs np on np.user_id = n.user_id
  where n.user_id = auth.uid() and n.kind = 'live_qa' and n.popup_seen_at is null and coalesce(np.live_qa_popup, true)
    and (select popup_invitations from public.circle_live_settings where id)
    and not exists (select 1 from public.circle_live_attendance a where a.session_id = l.id and a.user_id = auth.uid())
  order by l.starts_at desc limit 1;
$$;
revoke all on function public.live_invitation() from public, anon;
grant execute on function public.live_invitation() to authenticated;
