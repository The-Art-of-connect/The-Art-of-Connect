-- My Daily Sanctuary (founder directive 17) and Discover What's Possible (founder directive 18), November 26, 2026.
-- Part of the complimentary Art of Becoming. Free accounts receive approved, prewritten content only: no AI is used.
-- Every member record here is private to its owner (no staff read access to personal entries).

-- ─── Owner-managed content (Curriculum Studio) ─────────────────────────────────────────────
create table public.sanctuary_content (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('manifestation', 'affirmation', 'intention', 'checkin', 'question', 'lesson', 'scenario',
    'gratitude', 'challenge', 'accomplishment', 'evening', 'weekly', 'monthly')),
  topic text check (topic in ('identity', 'self-love', 'emotional-intelligence', 'communication', 'boundaries', 'relationships',
    'work-ethic', 'financial-mindset', 'values', 'confidence', 'intentional-living')),
  title text check (char_length(title) <= 160),
  body text not null check (char_length(body) between 1 and 6000),
  example text check (char_length(example) <= 3000),
  reflection text check (char_length(reflection) <= 1000),
  activity text check (char_length(activity) <= 1500),
  -- Scenarios: [{"key": "a", "label": "...", "insight": "...", "signals": ["communication:direct", "explore:friendship"]}]
  options jsonb check (options is null or jsonb_typeof(options) = 'array'),
  course text check (course ~ '^[a-z0-9-]{2,60}$'),
  course_order integer,
  publish_on date,                                  -- scheduled day; null = part of the daily rotation
  status text not null default 'draft' check (status in ('draft', 'approved', 'published', 'archived')),
  prepared_by text not null default 'owner' check (prepared_by in ('owner', 'peace', 'staff')),
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind <> 'scenario' or jsonb_array_length(coalesce(options, '[]'::jsonb)) between 2 and 6)
);
create index sanctuary_content_live on public.sanctuary_content (kind, status, publish_on);
create trigger touch_sanctuary_content before update on public.sanctuary_content for each row execute function public.touch_updated_at();
alter table public.sanctuary_content enable row level security;
-- Members see only published content whose day has arrived. Drafts and approvals stay in the Curriculum Studio.
create policy "members read published" on public.sanctuary_content for select to authenticated
  using ((status = 'published' and (publish_on is null or publish_on <= current_date)) or public.has_staff_role(array['owner', 'executive']::public.staff_role[]));
create policy "studio edits" on public.sanctuary_content for all to authenticated
  using (public.has_staff_role(array['owner', 'executive']::public.staff_role[]))
  with check (public.has_staff_role(array['owner', 'executive']::public.staff_role[]));
-- Only the owner approves or publishes.
create or replace function public.guard_sanctuary_publish()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('approved', 'published') and (tg_op = 'INSERT' or old.status is distinct from new.status)
     and auth.uid() is not null and not public.is_owner() then
    raise exception 'Only the owner can approve or publish Sanctuary content';
  end if;
  if new.status in ('approved', 'published') and (tg_op = 'INSERT' or old.status not in ('approved', 'published')) then
    new.approved_by := coalesce(auth.uid(), new.approved_by); new.approved_at := now();
  end if;
  return new;
end $$;
create trigger guard_sanctuary_publish before insert or update on public.sanctuary_content for each row execute function public.guard_sanctuary_publish();
revoke all on public.sanctuary_content from public, anon;
grant select, insert, update, delete on public.sanctuary_content to authenticated;
grant all on public.sanctuary_content to service_role;

-- ─── Private member records ────────────────────────────────────────────────────────────────
create table public.sanctuary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null default current_date,
  kind text not null check (kind in ('manifestation', 'affirmation', 'intention', 'checkin', 'question', 'lesson', 'gratitude',
    'challenge', 'accomplishment', 'evening', 'weekly', 'monthly')),
  content_id uuid references public.sanctuary_content (id) on delete set null,
  mood text check (mood in ('joyful', 'calm', 'grateful', 'hopeful', 'tired', 'anxious', 'sad', 'frustrated', 'overwhelmed', 'mixed')),
  response text check (char_length(response) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- One of each daily practice per day; gratitude and accomplishments may be recorded several times.
create unique index sanctuary_entries_daily on public.sanctuary_entries (user_id, day, kind) where kind not in ('gratitude', 'accomplishment');
create index sanctuary_entries_user_day on public.sanctuary_entries (user_id, day desc);
create trigger touch_sanctuary_entries before update on public.sanctuary_entries for each row execute function public.touch_updated_at();

-- Scenario answers: asked once; members may choose to revisit (update) them.
create table public.sanctuary_scenario_answers (
  user_id uuid not null references public.profiles (id) on delete cascade,
  content_id uuid not null references public.sanctuary_content (id) on delete cascade,
  choice text not null check (choice ~ '^[a-z0-9_-]{1,20}$'),
  note text check (char_length(note) <= 2000),
  answered_at timestamptz not null default now(),
  primary key (user_id, content_id)
);

-- Preferences, consent and reminders.
create table public.sanctuary_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  -- Consent: include Sanctuary answers in my private Discovery Portfolio and recommendations. Off until the member turns it on.
  share_with_portfolio boolean not null default false,
  explore_interests text[] not null default '{}' check (cardinality(explore_interests) <= 12),
  reminder_frequency text not null default 'off' check (reminder_frequency in ('off', 'daily', 'weekly', 'monthly')),
  reminder_time time not null default '08:00',
  reminder_weekday integer not null default 1 check (reminder_weekday between 0 and 6),
  reminder_types text[] not null default '{morning}' check (reminder_types <@ array['morning', 'checkin', 'evening', 'weekly', 'monthly']::text[]),
  time_zone text not null default 'America/New_York' check (char_length(time_zone) <= 60),
  last_reminded_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.future_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 8000),
  deliver_on date not null check (deliver_on > '2026-01-01'),
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─── My Vision Board ──────────────────────────────────────────────────────────────────────
create table public.vision_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (category in ('career', 'business', 'financial-freedom', 'relationships', 'travel', 'personal-growth', 'wellness', 'lifestyle')),
  kind text not null check (kind in ('goal', 'intention', 'photo', 'accomplishment')),
  title text not null check (char_length(title) between 1 and 160),
  body text check (char_length(body) <= 2000),
  photo_path text check (photo_path is null or photo_path ~ '^u/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'),
  target_date date,
  achieved_at timestamptz,
  created_at timestamptz not null default now()
);
create or replace function public.vision_item_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.vision_items where user_id = new.user_id) >= 60 then
    raise exception 'Your vision board holds up to 60 items. Remove one to add another.';
  end if;
  if new.photo_path is not null and (select count(*) from public.vision_items where user_id = new.user_id and photo_path is not null) >= 30 then
    raise exception 'Your vision board holds up to 30 photographs.';
  end if;
  if new.photo_path is not null and split_part(new.photo_path, '/', 2) <> new.user_id::text then
    raise exception 'Invalid photograph';
  end if;
  return new;
end $$;
create trigger vision_item_limit before insert on public.vision_items for each row execute function public.vision_item_limit();

-- Private bucket: each member's own folder only. Type and size (5 MB) are also checked by the server before upload.
insert into storage.buckets (id, name, public) values ('vision-board', 'vision-board', false) on conflict (id) do nothing;
do $$ begin
  update storage.buckets set file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'] where id = 'vision-board';
exception when undefined_column then null; end $$;
create policy "vision board: own uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'vision-board' and (storage.foldername(name))[1] = 'u' and (storage.foldername(name))[2] = auth.uid()::text);
create policy "vision board: own files only" on storage.objects for select to authenticated
  using (bucket_id = 'vision-board' and (storage.foldername(name))[2] = auth.uid()::text);
create policy "vision board: own deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'vision-board' and (storage.foldername(name))[2] = auth.uid()::text);

-- Every personal table: the member only. No staff read access.
do $$
declare t text;
begin
  foreach t in array array['sanctuary_entries', 'sanctuary_scenario_answers', 'sanctuary_settings', 'future_letters', 'vision_items'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own only" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('revoke all on public.%I from public, anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;
-- A letter's delivery date cannot be moved once written (members may still delete it).
revoke update on public.future_letters from authenticated;

-- ─── What's Happening Inside Connect: owner-approved previews of genuine activity ──────────
-- Each preview points to a real record (or an official item) and contains no member names, photographs or private content.
create table public.connect_previews (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('event', 'discussion', 'circle', 'webinar', 'business-topic', 'travel', 'singles', 'couples', 'friendship', 'elite')),
  title text not null check (char_length(title) between 3 and 140),
  summary text not null check (char_length(summary) between 3 and 600),
  interests text[] not null default '{}',
  source_type text not null check (source_type in ('event', 'circle', 'post', 'webinar', 'official')),
  source_id uuid,
  starts_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived')),
  show_from date not null default current_date,
  show_until date,
  approved_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  check (source_type = 'official' or source_id is not null)
);
alter table public.connect_previews enable row level security;
create policy "members read approved previews" on public.connect_previews for select to authenticated
  using ((status = 'approved' and show_from <= current_date and (show_until is null or show_until >= current_date))
         or public.has_staff_role(array['owner', 'executive', 'admin', 'moderator']::public.staff_role[]));
create policy "owner curates previews" on public.connect_previews for all to authenticated
  using (public.has_staff_role(array['owner', 'executive']::public.staff_role[]))
  with check (public.has_staff_role(array['owner', 'executive']::public.staff_role[]));
revoke all on public.connect_previews from public, anon;
grant select, insert, update, delete on public.connect_previews to authenticated;
grant all on public.connect_previews to service_role;

-- Genuine, non-identifying community facts for previews: circle sizes are shown only from 10 members up.
create or replace function public.connect_preview_stats()
returns table (slug text, name text, description text, kind text, interests text[], members_band text)
language sql stable security definer set search_path = public as $$
  select c.slug, c.name, c.description, c.kind, c.interests,
    case when n >= 100 then '100+ members' when n >= 50 then '50+ members' when n >= 10 then '10+ members' else null end
  from public.social_circles c
  left join lateral (select count(*) n from public.social_circle_members m where m.circle_id = c.id) x on true
  where c.status = 'active';
$$;
revoke all on function public.connect_preview_stats() from public, anon;
grant execute on function public.connect_preview_stats() to authenticated;

-- ─── Owner Analytics: membership conversions (counts only; no personal details) ─────────────
create or replace function public.membership_conversions(p_months integer default 6)
returns table (month date, new_free_accounts bigint, trials_started bigint, trials_converted bigint, trials_cancelled bigint, direct_purchases bigint)
language sql stable security definer set search_path = public as $$
  with months as (select generate_series(date_trunc('month', now()) - make_interval(months => greatest(1, least(p_months, 24)) - 1), date_trunc('month', now()), interval '1 month')::date m)
  select m,
    (select count(*) from public.profiles p where p.account_type = 'member' and date_trunc('month', p.created_at)::date = m),
    (select count(*) from public.membership_trials t where t.status <> 'pending' and date_trunc('month', coalesce(t.started_at, t.created_at))::date = m),
    (select count(*) from public.membership_trials t where t.status = 'converted' and date_trunc('month', t.ends_at)::date = m),
    (select count(*) from public.membership_trials t where t.status in ('cancelled', 'ended') and date_trunc('month', coalesce(t.ends_at, t.updated_at))::date = m),
    (select count(*) from public.subscriptions s where s.kind = 'member' and s.trial_end is null and date_trunc('month', s.created_at)::date = m)
  from months
  where public.has_staff_role(array['owner', 'executive', 'finance']::public.staff_role[])
  order by m;
$$;
revoke all on function public.membership_conversions(integer) from public, anon;
grant execute on function public.membership_conversions(integer) to authenticated;
