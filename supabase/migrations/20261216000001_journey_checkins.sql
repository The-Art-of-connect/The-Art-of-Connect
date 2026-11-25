-- Journey — Proactive care and personalized check-ins (Master Blueprint §10).
-- Members choose what they receive, when, and how. Everything a member shares
-- in a check-in is private to them: there is no staff or owner read access.
-- External notifications never include personal details unless the member
-- explicitly allows it. Owner controls are global settings only.

create table public.journey_checkin_prefs (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  morning_manifestation boolean not null default false,
  evening_reflection boolean not null default false,
  personal_reminders boolean not null default true,
  wellness boolean not null default false,
  wellness_frequency text not null default 'weekly' check (wellness_frequency in ('weekly', 'biweekly', 'monthly')),
  morning_time time not null default '08:00',
  evening_time time not null default '20:00',
  time_zone text not null default 'America/New_York' check (char_length(time_zone) between 3 and 60),
  quiet_start time not null default '21:30',
  quiet_end time not null default '07:30',
  channel_email boolean not null default false,
  channel_push boolean not null default false,
  channel_sms boolean not null default false,
  show_details boolean not null default false,
  paused_until date,
  updated_at timestamptz not null default now()
);

create table public.journey_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'event' check (kind in ('event', 'interview', 'goal', 'milestone', 'support', 'relationship', 'growth', 'transition', 'wellness')),
  title text not null check (char_length(title) between 2 and 120),
  detail text check (char_length(detail) <= 1000),
  due_at timestamptz not null,
  repeat_yearly boolean not null default false,
  status text not null default 'scheduled' check (status in ('scheduled', 'responded', 'dismissed')),
  response text check (char_length(response) <= 2000),
  responded_at timestamptz,
  emailed_at timestamptz,
  created_by text not null default 'member' check (created_by in ('member', 'journey')),
  created_at timestamptz not null default now()
);
create index journey_checkins_due on public.journey_checkins (status, due_at);
create index journey_checkins_user on public.journey_checkins (user_id, due_at desc);

-- Owner's global controls (no member data).
create table public.journey_checkin_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default true,
  email_enabled boolean not null default false,
  push_enabled boolean not null default false,
  sms_enabled boolean not null default false,
  manifestation_source text not null default 'library' check (manifestation_source in ('library', 'journey')),
  max_emails_per_week integer not null default 3 check (max_emails_per_week between 0 and 21),
  email_subject text not null default 'Journey is thinking of you' check (char_length(email_subject) between 3 and 80),
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);
insert into public.journey_checkin_settings (id) values (true) on conflict do nothing;

alter table public.journey_checkin_prefs enable row level security;
alter table public.journey_checkins enable row level security;
alter table public.journey_checkin_settings enable row level security;

create policy "only the member" on public.journey_checkin_prefs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "only the member" on public.journey_checkins for all using (user_id = auth.uid()) with check (user_id = auth.uid() and created_by = 'member');
create policy "members read settings" on public.journey_checkin_settings for select using (auth.uid() is not null);
create policy "owner manages" on public.journey_checkin_settings for update using (public.is_owner()) with check (public.is_owner());

create trigger touch_checkin_prefs before update on public.journey_checkin_prefs for each row execute function public.touch_updated_at();
create trigger touch_checkin_settings before update on public.journey_checkin_settings for each row execute function public.touch_updated_at();

-- Owner insight without private data: counts only.
create or replace function public.journey_checkin_totals()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.has_staff_role(array['owner','executive']::public.staff_role[]) then jsonb_build_object(
    'members_with_prefs', (select count(*) from public.journey_checkin_prefs),
    'morning', (select count(*) from public.journey_checkin_prefs where morning_manifestation),
    'evening', (select count(*) from public.journey_checkin_prefs where evening_reflection),
    'wellness', (select count(*) from public.journey_checkin_prefs where wellness),
    'email_opt_in', (select count(*) from public.journey_checkin_prefs where channel_email),
    'scheduled', (select count(*) from public.journey_checkins where status = 'scheduled'),
    'responded_30d', (select count(*) from public.journey_checkins where status = 'responded' and responded_at > now() - interval '30 days'),
    'emailed_30d', (select count(*) from public.journey_checkins where emailed_at > now() - interval '30 days')
  ) end;
$$;
revoke all on function public.journey_checkin_totals() from public, anon;
grant execute on function public.journey_checkin_totals() to authenticated;

revoke all on public.journey_checkin_prefs, public.journey_checkins, public.journey_checkin_settings from public, anon;
grant select, insert, update, delete on public.journey_checkin_prefs, public.journey_checkins to authenticated;
grant select, update on public.journey_checkin_settings to authenticated;
grant all on public.journey_checkin_prefs, public.journey_checkins, public.journey_checkin_settings to service_role;
