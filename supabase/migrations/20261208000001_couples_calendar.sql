-- ════════════════════════════════════════════════════════════════════
-- Couples calendar — "Just us"
--   • Shared couple events (date nights, trips, anniversaries): both
--     partners see and edit them; nobody else can, including staff.
--   • Private busy times: entered by hand or read from a linked Google,
--     Apple (iCloud) or Outlook calendar. Only the owner sees what they are.
--     A partner sees only that a time is unavailable — never why.
--   • Linked calendars keep only start and end times. Event titles,
--     locations and attendees from a member's calendar are never stored.
--   • Booking a shared event over either partner's busy time is refused
--     with the same neutral message, whatever the reason.
--   • A private subscription link lets each partner add the shared
--     calendar to any phone or computer (Apple, Google, Outlook).
-- ════════════════════════════════════════════════════════════════════

create table relationships.couple_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references relationships.couples (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'date_night' check (kind in ('date_night', 'trip', 'anniversary', 'activity', 'other')),
  title text not null check (length(title) between 1 and 120),
  location text check (length(location) <= 200),
  notes text check (length(notes) <= 2000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at and ends_at - starts_at <= interval '31 days')
);
create index couple_events_couple_idx on relationships.couple_events (couple_id, starts_at);
create trigger touch_couple_events before update on relationships.couple_events for each row execute function public.touch_updated_at();

create table relationships.calendar_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null check (provider in ('google', 'apple', 'outlook')),
  -- The member's private calendar address. Read by the server only; never returned to the browser.
  url text not null check (url ~ '^https://' and length(url) <= 2000),
  last_synced_at timestamptz,
  last_error text check (length(last_error) <= 300),
  created_at timestamptz not null default now(),
  unique (user_id, url)
);

create table relationships.busy_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source text not null default 'manual' check (source in ('manual', 'google', 'apple', 'outlook')),
  link_id uuid references relationships.calendar_links (id) on delete cascade,
  -- Private label, visible only to its owner (e.g. "Work"). Linked calendars never fill it in.
  label text check (length(label) <= 80),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index busy_blocks_user_idx on relationships.busy_blocks (user_id, starts_at);

create table relationships.calendar_feed_tokens (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now()
);

-- ─── Row-level security ────────────────────────────────────────────
alter table relationships.couple_events enable row level security;
alter table relationships.calendar_links enable row level security;
alter table relationships.busy_blocks enable row level security;
alter table relationships.calendar_feed_tokens enable row level security;

create policy "partners share events" on relationships.couple_events for select
  using (relationships.is_couple_member(couple_id));
create policy "partners add events" on relationships.couple_events for insert
  with check (created_by = auth.uid() and relationships.is_couple_member(couple_id) and public.has_experience('relationships'));
create policy "partners edit events" on relationships.couple_events for update
  using (relationships.is_couple_member(couple_id)) with check (relationships.is_couple_member(couple_id));
create policy "partners remove events" on relationships.couple_events for delete
  using (relationships.is_couple_member(couple_id));

-- Busy times and links: the owner only. No partner or staff policy exists, by design.
create policy "owner only" on relationships.busy_blocks for all
  using (user_id = auth.uid()) with check (user_id = auth.uid() and source = 'manual' and link_id is null);
create policy "owner reads links" on relationships.calendar_links for select using (user_id = auth.uid());
create policy "owner removes links" on relationships.calendar_links for delete using (user_id = auth.uid());
-- Links are added through the server (which validates the address), so there is no member insert policy.

revoke all on relationships.couple_events, relationships.calendar_links, relationships.busy_blocks, relationships.calendar_feed_tokens from anon, authenticated;
grant select, insert, update, delete on relationships.couple_events, relationships.busy_blocks to authenticated;
grant select, delete on relationships.calendar_links to authenticated;
revoke select on relationships.calendar_links from authenticated;
grant select (id, user_id, provider, last_synced_at, last_error, created_at) on relationships.calendar_links to authenticated;
grant all on relationships.couple_events, relationships.calendar_links, relationships.busy_blocks, relationships.calendar_feed_tokens to service_role;

-- ─── Availability without details ──────────────────────────────────
/**
 * Busy times for the caller and their partner in a window. The caller's own
 * rows are marked mine = true. The partner's rows carry only start and end:
 * no label, no source, no event details.
 */
create or replace function relationships.couple_availability(p_from timestamptz, p_to timestamptz)
returns table (starts_at timestamptz, ends_at timestamptz, mine boolean)
language sql stable security definer set search_path = public, relationships as $$
  with me as (select couple_id from relationships.couple_members where user_id = auth.uid())
  select b.starts_at, b.ends_at, b.user_id = auth.uid()
  from relationships.busy_blocks b
  join relationships.couple_members m on m.user_id = b.user_id
  join me on me.couple_id = m.couple_id
  where b.starts_at < p_to and b.ends_at > p_from and p_to - p_from <= interval '400 days'
  order by b.starts_at;
$$;
revoke all on function relationships.couple_availability(timestamptz, timestamptz) from public, anon;
grant execute on function relationships.couple_availability(timestamptz, timestamptz) to authenticated;

/** 'available' or 'unavailable' for a proposed time — never the reason. */
create or replace function relationships.check_couple_time(p_start timestamptz, p_end timestamptz)
returns text language sql stable security definer set search_path = public, relationships as $$
  select case when exists (
    select 1 from relationships.couple_availability(p_start, p_end)
  ) then 'unavailable' else 'available' end;
$$;
revoke all on function relationships.check_couple_time(timestamptz, timestamptz) from public, anon;
grant execute on function relationships.check_couple_time(timestamptz, timestamptz) to authenticated;

-- A shared event cannot be placed over either partner's busy time.
create or replace function relationships.guard_couple_event()
returns trigger language plpgsql security definer set search_path = public, relationships as $$
begin
  if (tg_op = 'INSERT' or new.starts_at <> old.starts_at or new.ends_at <> old.ends_at)
     and exists (
       select 1 from relationships.busy_blocks b
       join relationships.couple_members m on m.user_id = b.user_id and m.couple_id = new.couple_id
       where b.starts_at < new.ends_at and b.ends_at > new.starts_at) then
    raise exception 'That time doesn''t work. Please choose another date.' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' then new.created_by := old.created_by; new.couple_id := old.couple_id; end if;
  return new;
end $$;
create trigger guard_couple_event before insert or update on relationships.couple_events
  for each row execute function relationships.guard_couple_event();

-- Leaving a couple removes access to shared events automatically (membership is checked on every read).
