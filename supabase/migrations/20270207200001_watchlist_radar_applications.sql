-- Directive 51 (implementation clarifications, item 4), built on directives 25, 26, 32 and 33 within CONNECT 360:
--   • My Global Watchlist screen: companies, topics and people in public roles (Elite Concierge, as the existing guard requires).
--   • Opportunity Radar: owner-curated opportunities from official sources, matched only for members who turn matching on
--     (consent before matching), plus the member's own research findings. Members save or dismiss; nothing is fabricated.
--   • Application Center: applications the member is preparing, a status pipeline with append-only history, deadlines,
--     a text-only required-documents checklist (no document storage), notes, an approved résumé, and one Message Center
--     reminder per deadline from the existing 15-minute job.
-- Idempotent. Member records are private to the member (row-level security).

-- ─── My Global Watchlist: what is being watched ─────────────────────────────────────────────────────────────────────────
alter table public.intel_watchlist add column if not exists subject_kind text not null default 'topic'
  check (subject_kind in ('company', 'topic', 'public_role'));
alter table public.intel_watchlist add column if not exists subject text check (char_length(subject) between 2 and 160);

-- ─── Opportunity Radar ──────────────────────────────────────────────────────────────────────────────────────────────────
-- Opportunities are entered by the owner from an official source (never by members, never generated).
create table if not exists public.radar_opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 200),
  organization text not null check (char_length(organization) between 2 and 200),
  category text not null check (category in ('grant', 'funding', 'partnership', 'contract', 'casting', 'employment', 'board', 'speaking', 'other')),
  industries text[] not null default '{}' check (cardinality(industries) <= 20),
  region text check (char_length(region) <= 120),
  summary text not null check (char_length(summary) between 10 and 2000),
  requirements text check (char_length(requirements) <= 4000),
  official_url text not null check (official_url ~ '^https://' and char_length(official_url) <= 1000),
  deadline date,
  verified_on date not null default current_date,
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists radar_opportunities_live on public.radar_opportunities (status, deadline);
drop trigger if exists touch_radar_opportunities on public.radar_opportunities;
create trigger touch_radar_opportunities before update on public.radar_opportunities for each row execute function public.touch_updated_at();
alter table public.radar_opportunities enable row level security;
drop policy if exists "members read published opportunities" on public.radar_opportunities;
create policy "members read published opportunities" on public.radar_opportunities for select to authenticated
  using (status = 'published' and public.intel_level(auth.uid()) is not null);
drop policy if exists "owner manages opportunities" on public.radar_opportunities;
create policy "owner manages opportunities" on public.radar_opportunities for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
revoke all on public.radar_opportunities from public, anon;
grant select, insert, update, delete on public.radar_opportunities to authenticated;
grant all on public.radar_opportunities to service_role;

-- The member's consent and interests for matching (off until the member turns it on).
create table if not exists public.radar_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  opted_in boolean not null default false,
  categories text[] not null default '{}' check (categories <@ array['grant', 'funding', 'partnership', 'contract', 'casting', 'employment', 'board', 'speaking', 'other']::text[]),
  industries text[] not null default '{}' check (cardinality(industries) <= 20),
  keywords text check (char_length(keywords) <= 500),
  updated_at timestamptz not null default now()
);
alter table public.radar_preferences enable row level security;
drop policy if exists "own radar preferences" on public.radar_preferences;
create policy "own radar preferences" on public.radar_preferences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.radar_preferences from public, anon;
grant select, insert, update, delete on public.radar_preferences to authenticated;
grant all on public.radar_preferences to service_role;

-- Saved or dismissed items (an owner-curated opportunity or one of the member's own research findings).
create table if not exists public.radar_marks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  source text not null check (source in ('opportunity', 'finding')),
  item_id uuid not null,
  state text not null check (state in ('saved', 'dismissed')),
  created_at timestamptz not null default now(),
  primary key (user_id, source, item_id)
);
alter table public.radar_marks enable row level security;
drop policy if exists "own radar marks" on public.radar_marks;
create policy "own radar marks" on public.radar_marks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.radar_marks from public, anon;
grant select, insert, update, delete on public.radar_marks to authenticated;
grant all on public.radar_marks to service_role;

-- ─── Application Center ─────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.member_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 200),
  organization text check (char_length(organization) <= 200),
  kind text not null default 'other' check (kind in ('grant', 'funding', 'partnership', 'contract', 'casting', 'employment', 'board', 'speaking', 'other')),
  status text not null default 'preparing' check (status in ('preparing', 'submitted', 'in_review', 'accepted', 'not_selected', 'withdrawn')),
  deadline date,
  submitted_on date,
  official_url text check (official_url ~ '^https://' and char_length(official_url) <= 1000),
  opportunity_id uuid references public.radar_opportunities (id) on delete set null,
  finding_id uuid references public.intel_findings (id) on delete set null,
  resume_id uuid references public.resumes (id) on delete set null,
  checklist jsonb not null default '[]' check (jsonb_typeof(checklist) = 'array' and jsonb_array_length(checklist) <= 40 and octet_length(checklist::text) <= 12000),
  note text check (char_length(note) <= 4000),
  reminded_for date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists member_applications_user on public.member_applications (user_id, updated_at desc);
create index if not exists member_applications_deadline on public.member_applications (status, deadline);
drop trigger if exists touch_member_applications on public.member_applications;
create trigger touch_member_applications before update on public.member_applications for each row execute function public.touch_updated_at();
drop trigger if exists shield_member_applications on public.member_applications;
create trigger shield_member_applications before insert or update of title, note on public.member_applications for each row execute function public.shield_guard();

create or replace function public.guard_member_application()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;  -- the scheduled reminder job
  if new.user_id <> auth.uid() then raise exception 'Not permitted'; end if;
  if tg_op = 'INSERT' and public.intel_level(new.user_id) is null then
    raise exception 'The Application Center is part of Executive Private and Elite Concierge.';
  end if;
  if new.resume_id is not null and (tg_op = 'INSERT' or new.resume_id is distinct from old.resume_id) and not exists (
    select 1 from public.resumes r where r.id = new.resume_id and r.user_id = new.user_id and r.kind = 'resume' and r.status = 'approved') then
    raise exception 'Link a résumé you have approved.';
  end if;
  if new.finding_id is not null and (tg_op = 'INSERT' or new.finding_id is distinct from old.finding_id) and not exists (
    select 1 from public.intel_findings f join public.intel_assignments a on a.id = f.assignment_id where f.id = new.finding_id and a.user_id = new.user_id) then
    raise exception 'Not permitted';
  end if;
  if new.opportunity_id is not null and (tg_op = 'INSERT' or new.opportunity_id is distinct from old.opportunity_id) and not exists (
    select 1 from public.radar_opportunities o where o.id = new.opportunity_id and o.status = 'published') then
    raise exception 'That opportunity is no longer open.';
  end if;
  if new.status = 'submitted' and new.submitted_on is null then new.submitted_on := current_date; end if;
  -- Reminders are recorded by the system; a new deadline earns a new reminder.
  if tg_op = 'INSERT' then new.reminded_for := null;
  elsif new.deadline is distinct from old.deadline then new.reminded_for := null;
  else new.reminded_for := old.reminded_for; end if;
  return new;
end $$;
drop trigger if exists guard_member_application on public.member_applications;
create trigger guard_member_application before insert or update on public.member_applications for each row execute function public.guard_member_application();

-- Append-only status history (directive 45: growth records are history, never erased by an update).
create table if not exists public.member_application_history (
  id bigint generated always as identity primary key,
  application_id uuid not null references public.member_applications (id) on delete cascade,
  status text not null,
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists member_application_history_app on public.member_application_history (application_id, created_at);
create or replace function public.log_member_application()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.member_application_history (application_id, status, changed_by) values (new.id, new.status, auth.uid());
  end if;
  return null;
end $$;
drop trigger if exists log_member_application on public.member_applications;
create trigger log_member_application after insert or update on public.member_applications for each row execute function public.log_member_application();

alter table public.member_applications enable row level security;
alter table public.member_application_history enable row level security;
drop policy if exists "own applications" on public.member_applications;
create policy "own applications" on public.member_applications for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own application history" on public.member_application_history;
create policy "own application history" on public.member_application_history for select to authenticated
  using (exists (select 1 from public.member_applications a where a.id = application_id and a.user_id = auth.uid()));
revoke all on public.member_applications, public.member_application_history from public, anon;
grant select, insert, update, delete on public.member_applications to authenticated;
grant select on public.member_application_history to authenticated;
grant all on public.member_applications, public.member_application_history to service_role;

-- ─── Deadline reminders in the Message Center ───────────────────────────────────────────────────────────────────────────
alter table public.notification_prefs add column if not exists application_deadlines boolean not null default true;
alter table public.member_notices drop constraint if exists member_notices_kind_check;
alter table public.member_notices add constraint member_notices_kind_check check (kind in ('live_qa', 'milestone', 'growth_report', 'system', 'application_deadline'));

-- Runs with the 15-minute job: one notice per application deadline within the next seven days (a changed deadline earns one more).
create or replace function public.application_deadline_tick()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with due as (
    select a.id, a.user_id, a.title, a.deadline from public.member_applications a
    where a.status = 'preparing' and a.deadline between current_date and current_date + 7 and a.reminded_for is distinct from a.deadline
    order by a.deadline limit 500
  ), noted as (
    insert into public.member_notices (user_id, kind, title, body, href, ref_id)
    select d.user_id, 'application_deadline', 'Application deadline: ' || left(d.title, 160),
      case when d.deadline = current_date then 'Due today.' else 'Due ' || to_char(d.deadline, 'FMMonth FMDD, YYYY') || '.' end
        || ' Review your checklist in the Application Center.',
      '/app/connect360/applications/' || d.id, d.id
    from due d
    where coalesce((select p.application_deadlines from public.notification_prefs p where p.user_id = d.user_id), true)
    on conflict (user_id, kind, ref_id) do update set title = excluded.title, body = excluded.body, created_at = now(), read_at = null
    returning ref_id
  )
  update public.member_applications a set reminded_for = d.deadline from due d where a.id = d.id;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.application_deadline_tick() from public, anon, authenticated;
grant execute on function public.application_deadline_tick() to service_role;
