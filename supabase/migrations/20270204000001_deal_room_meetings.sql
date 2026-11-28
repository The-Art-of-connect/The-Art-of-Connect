-- Business Deal Rooms: meeting minutes and recording controls (founder directive 48, November 28, 2026).
-- Audit: Deal Rooms already have participants (with join dates and roles), decision and action items, messages and an
-- audit log. Meetings reuse them: decisions and action items from approved minutes become room items, so outstanding
-- and completed responsibilities are tracked in one place. Recording and transcription need a paid provider; they stay
-- off until the founder approves one (enforced below). Minutes are never a legally binding agreement.

insert into public.platform_settings (key, value) values ('meeting_recording_provider_approved', 'false'::jsonb) on conflict (key) do nothing;

create table if not exists business.room_meetings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references business.deal_rooms(id) on delete cascade,
  host_id uuid not null references public.profiles(id),
  title text not null check (char_length(title) between 3 and 160),
  purpose text check (char_length(purpose) <= 1000),
  minutes_mode text not null default 'manual' check (minutes_mode in ('none', 'manual', 'journey_assisted')),
  recording_state text not null default 'off' check (recording_state in ('off', 'recording', 'paused', 'stopped')),
  status text not null default 'open' check (status in ('open', 'ended')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists room_meetings_room on business.room_meetings (room_id, started_at desc);

-- Who attended, and whether each person consented to recording (never assumed).
create table if not exists business.meeting_attendees (
  meeting_id uuid not null references business.room_meetings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  recording_consent boolean not null default false,
  consented_at timestamptz,
  primary key (meeting_id, user_id)
);

-- Minutes: versioned; Journey may draft; only the host approves. Approved minutes are read-only history.
create table if not exists business.meeting_minutes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references business.room_meetings(id) on delete cascade,
  version integer not null default 1,
  sections jsonb not null default '{}'::jsonb check (jsonb_typeof(sections) = 'object' and octet_length(sections::text) <= 60000),
  drafted_by text not null default 'host' check (drafted_by in ('host', 'journey')),
  status text not null default 'draft' check (status in ('draft', 'approved')),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (meeting_id, version)
);

-- Participants added later do not automatically see earlier meetings; the host may grant access to a specific meeting.
create table if not exists business.meeting_access (
  meeting_id uuid not null references business.room_meetings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  granted_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (meeting_id, user_id)
);

create or replace function business.can_see_meeting(m uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = business, public as $$
  select exists (
    select 1 from business.room_meetings rm
    join business.room_participants p on p.room_id = rm.room_id and p.user_id = uid and p.status = 'active'
    where rm.id = m and (rm.host_id = uid or coalesce(p.joined_at, p.created_at) <= rm.started_at
      or exists (select 1 from business.meeting_attendees a where a.meeting_id = m and a.user_id = uid)
      or exists (select 1 from business.meeting_access x where x.meeting_id = m and x.user_id = uid)));
$$;
grant execute on function business.can_see_meeting(uuid, uuid) to authenticated;

alter table business.room_meetings enable row level security;
alter table business.meeting_attendees enable row level security;
alter table business.meeting_minutes enable row level security;
alter table business.meeting_access enable row level security;
drop policy if exists meetings_read on business.room_meetings;
create policy meetings_read on business.room_meetings for select using (business.can_see_meeting(id));
drop policy if exists attendees_read on business.meeting_attendees;
create policy attendees_read on business.meeting_attendees for select using (business.can_see_meeting(meeting_id));
drop policy if exists minutes_read on business.meeting_minutes;
create policy minutes_read on business.meeting_minutes for select using (
  business.can_see_meeting(meeting_id) and (status = 'approved' or exists (select 1 from business.room_meetings m where m.id = meeting_id and m.host_id = auth.uid())));
drop policy if exists access_read on business.meeting_access;
create policy access_read on business.meeting_access for select using (user_id = auth.uid() or exists (select 1 from business.room_meetings m where m.id = meeting_id and m.host_id = auth.uid()));
grant select on business.room_meetings, business.meeting_attendees, business.meeting_minutes, business.meeting_access to authenticated;

-- ─── Host and participant actions (all checks live here) ───────────────────────────────────────────────────────────────
create or replace function business.start_meeting(p_room uuid, p_title text, p_purpose text, p_mode text)
returns uuid language plpgsql security definer set search_path = business, public as $$
declare mid uuid;
begin
  if business.room_role(p_room) is null then raise exception 'Only Business Deal Room participants can start a meeting.'; end if;
  insert into business.room_meetings (room_id, host_id, title, purpose, minutes_mode) values (p_room, auth.uid(), p_title, nullif(trim(p_purpose), ''), coalesce(p_mode, 'manual'))
    returning id into mid;
  insert into business.meeting_attendees (meeting_id, user_id) values (mid, auth.uid());
  insert into business.room_audit (room_id, actor_id, action, target) values (p_room, auth.uid(), 'meeting_started', mid::text);
  return mid;
end $$;

create or replace function business.join_meeting(p_meeting uuid, p_recording_consent boolean default false)
returns text language plpgsql security definer set search_path = business, public as $$
declare m business.room_meetings;
begin
  select * into m from business.room_meetings where id = p_meeting;
  if m.id is null or business.room_role(m.room_id) is null then raise exception 'Only Business Deal Room participants can join.'; end if;
  if m.status <> 'open' then raise exception 'This meeting has ended.'; end if;
  -- Joining an active recording requires consent; without it, the member can wait until recording pauses or stops.
  if m.recording_state = 'recording' and not p_recording_consent then raise exception 'This meeting is being recorded. Consent to recording to join, or join after recording stops.'; end if;
  insert into business.meeting_attendees (meeting_id, user_id, recording_consent, consented_at)
    values (p_meeting, auth.uid(), p_recording_consent, case when p_recording_consent then now() end)
    on conflict (meeting_id, user_id) do update set recording_consent = excluded.recording_consent or business.meeting_attendees.recording_consent,
      consented_at = coalesce(business.meeting_attendees.consented_at, excluded.consented_at);
  return 'joined';
end $$;

create or replace function business.set_recording(p_meeting uuid, p_state text)
returns text language plpgsql security definer set search_path = business, public as $$
declare m business.room_meetings;
begin
  select * into m from business.room_meetings where id = p_meeting;
  if m.id is null or m.host_id <> auth.uid() then raise exception 'Only the meeting host controls recording.'; end if;
  if p_state not in ('recording', 'paused', 'stopped', 'off') then raise exception 'Unknown recording state.'; end if;
  if p_state = 'recording' then
    -- Paid infrastructure: never on without the founder's approval.
    if not public.setting_enabled('meeting_recording_provider_approved') then raise exception 'Recording is not available yet. Meetings continue without recording.'; end if;
    if exists (select 1 from business.meeting_attendees where meeting_id = p_meeting and not recording_consent) then
      raise exception 'Every participant must consent before recording begins.';
    end if;
  end if;
  update business.room_meetings set recording_state = p_state where id = p_meeting;
  insert into business.room_audit (room_id, actor_id, action, target) values (m.room_id, auth.uid(), 'recording_' || p_state, p_meeting::text);
  return p_state;
end $$;

create or replace function business.save_minutes(p_meeting uuid, p_sections jsonb, p_drafted_by text default 'host')
returns integer language plpgsql security definer set search_path = business, public as $$
declare m business.room_meetings; v integer;
begin
  select * into m from business.room_meetings where id = p_meeting;
  if m.id is null or m.host_id <> auth.uid() then raise exception 'Only the meeting host edits the minutes.'; end if;
  select coalesce(max(version), 0) + 1 into v from business.meeting_minutes where meeting_id = p_meeting;
  insert into business.meeting_minutes (meeting_id, version, sections, drafted_by) values (p_meeting, v, p_sections, coalesce(p_drafted_by, 'host'));
  return v;
end $$;

create or replace function business.approve_minutes(p_meeting uuid, p_version integer)
returns text language plpgsql security definer set search_path = business, public as $$
declare m business.room_meetings; mm business.meeting_minutes; x jsonb;
begin
  select * into m from business.room_meetings where id = p_meeting;
  if m.id is null or m.host_id <> auth.uid() then raise exception 'Only the meeting host approves the minutes.'; end if;
  select * into mm from business.meeting_minutes where meeting_id = p_meeting and version = p_version;
  if mm.id is null then raise exception 'Those minutes were not found.'; end if;
  update business.meeting_minutes set status = 'approved', approved_by = auth.uid(), approved_at = now() where id = mm.id;
  -- Decisions and action items join the room's existing tracker (shared space), so progress carries across meetings.
  for x in select * from jsonb_array_elements(coalesce(mm.sections->'decisions', '[]'::jsonb)) loop
    insert into business.room_items (room_id, space, kind, title, detail, status, created_by)
      values (m.room_id, 'shared', 'decision', left(coalesce(x->>'text', x #>> '{}'), 200), 'From approved meeting minutes: ' || m.title, 'open', auth.uid());
  end loop;
  for x in select * from jsonb_array_elements(coalesce(mm.sections->'actions', '[]'::jsonb)) loop
    insert into business.room_items (room_id, space, kind, title, detail, due_at, assigned_to, status, created_by)
      values (m.room_id, 'shared', 'action', left(coalesce(x->>'text', x #>> '{}'), 200), 'From approved meeting minutes: ' || m.title,
              nullif(x->>'due', '')::timestamptz, nullif(x->>'owner', '')::uuid, 'open', auth.uid());
  end loop;
  insert into business.room_audit (room_id, actor_id, action, target) values (m.room_id, auth.uid(), 'minutes_approved', p_meeting::text || ':v' || p_version);
  return 'approved';
end $$;

create or replace function business.end_meeting(p_meeting uuid)
returns text language plpgsql security definer set search_path = business, public as $$
declare m business.room_meetings;
begin
  select * into m from business.room_meetings where id = p_meeting;
  if m.id is null or m.host_id <> auth.uid() then raise exception 'Only the meeting host ends the meeting.'; end if;
  update business.room_meetings set status = 'ended', ended_at = now(), recording_state = case when recording_state = 'off' then 'off' else 'stopped' end where id = p_meeting;
  insert into business.room_audit (room_id, actor_id, action, target) values (m.room_id, auth.uid(), 'meeting_ended', p_meeting::text);
  return 'ended';
end $$;

create or replace function business.grant_meeting_access(p_meeting uuid, p_user uuid)
returns text language plpgsql security definer set search_path = business, public as $$
declare m business.room_meetings;
begin
  select * into m from business.room_meetings where id = p_meeting;
  if m.id is null or m.host_id <> auth.uid() then raise exception 'Only the meeting host shares earlier minutes.'; end if;
  if business.room_role(m.room_id, p_user) is null then raise exception 'That person is not a participant in this room.'; end if;
  insert into business.meeting_access (meeting_id, user_id, granted_by) values (p_meeting, p_user, auth.uid()) on conflict do nothing;
  insert into business.room_audit (room_id, actor_id, action, target) values (m.room_id, auth.uid(), 'meeting_access_granted', p_meeting::text);
  return 'granted';
end $$;

revoke all on function business.start_meeting(uuid, text, text, text), business.join_meeting(uuid, boolean), business.set_recording(uuid, text),
  business.save_minutes(uuid, jsonb, text), business.approve_minutes(uuid, integer), business.end_meeting(uuid), business.grant_meeting_access(uuid, uuid) from public, anon;
grant execute on function business.start_meeting(uuid, text, text, text), business.join_meeting(uuid, boolean), business.set_recording(uuid, text),
  business.save_minutes(uuid, jsonb, text), business.approve_minutes(uuid, integer), business.end_meeting(uuid), business.grant_meeting_access(uuid, uuid) to authenticated;
