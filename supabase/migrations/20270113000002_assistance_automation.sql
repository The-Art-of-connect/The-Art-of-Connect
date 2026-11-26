-- Assistance Center automation: every report is acknowledged at once and processed immediately by Peace
-- (GitHub Actions, event-driven), with a frequent backup sweep. Owner can pause repairs at any time.

create table public.assist_settings (
  id boolean primary key default true check (id),
  repairs_paused boolean not null default false,
  immediate_enabled boolean not null default true,
  max_attempts integer not null default 2 check (max_attempts between 1 and 5),
  daily_run_limit integer not null default 40 check (daily_run_limit between 1 and 500),
  monthly_budget_cents integer not null default 5000 check (monthly_budget_cents >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);
insert into public.assist_settings default values on conflict do nothing;

alter table public.site_issues
  add column priority text not null default 'standard' check (priority in ('critical', 'elite', 'standard')),
  add column attempts integer not null default 0,
  add column claimed_at timestamptz,
  add column claimed_by text check (char_length(claimed_by) <= 200),
  add column acknowledged_at timestamptz,
  add column member_notified_at timestamptz,
  add column dispatched_at timestamptz,
  add column duplicate_of uuid references public.site_issues (id) on delete set null,
  add column rollback_ref text check (char_length(rollback_ref) <= 300);
alter table public.site_issues drop constraint site_issues_status_check;
alter table public.site_issues add constraint site_issues_status_check check (status in (
  'new', 'investigating', 'fixed', 'needs_owner', 'cannot_reproduce', 'proposed', 'approved', 'declined', 'built', 'closed', 'duplicate', 'failed', 'rolled_back'));

-- Priority is decided here (members cannot set it): critical failures first, then Elite members, then everyone else.
-- Every report is processed immediately; priority only orders the queue.
create or replace function public.site_issue_priority()
returns trigger language plpgsql security definer set search_path = public as $$
declare txt text := lower(coalesce(new.description, '') || ' ' || coalesce(new.page_path, ''));
begin
  new.priority := case
    when new.kind = 'problem' and txt ~ '(can.?t (sign|log) ?in|cannot (sign|log) ?in|payment|checkout|charged|error 5|500|site is down|won.?t load|blank page|crash|lost (my )?data|security|hacked)' then 'critical'
    when new.reporter_id is not null and public.social_is_elite(new.reporter_id) then 'elite'
    else 'standard' end;
  return new;
end $$;
create trigger site_issue_priority before insert on public.site_issues for each row execute function public.site_issue_priority();

-- Every action Peace, the owner or the system takes on a report, with AI usage and cost.
create table public.site_issue_events (
  id bigint generated always as identity primary key,
  issue_id uuid references public.site_issues (id) on delete cascade,
  actor text not null check (actor in ('peace', 'owner', 'system')),
  action text not null check (char_length(action) between 2 and 60),
  detail text check (char_length(detail) <= 4000),
  run_url text check (run_url is null or run_url ~ '^https://'),
  ai_cost_cents numeric(10, 2),
  input_tokens integer,
  output_tokens integer,
  duration_seconds integer,
  created_at timestamptz not null default now()
);
create index site_issue_events_issue on public.site_issue_events (issue_id, created_at);

-- Claim a report so no two repairs ever run on it at once; refuses when paused, over the attempt limit,
-- over the daily run limit or over the monthly AI budget. Returns 'claimed' or the reason it was refused.
create or replace function public.assist_claim(p_issue uuid, p_runner text)
returns text language plpgsql security definer set search_path = public as $$
declare s public.assist_settings; i public.site_issues; runs int; spent numeric;
begin
  select * into s from public.assist_settings;
  if s.repairs_paused then return 'paused'; end if;
  select count(*) into runs from public.site_issue_events where action = 'claimed' and created_at >= date_trunc('day', now());
  if runs >= s.daily_run_limit then return 'daily_limit'; end if;
  select coalesce(sum(ai_cost_cents), 0) into spent from public.site_issue_events where created_at >= date_trunc('month', now());
  if spent >= s.monthly_budget_cents then return 'budget'; end if;
  select * into i from public.site_issues where id = p_issue for update skip locked;
  if i.id is null then return 'busy'; end if;
  if i.claimed_at is not null and i.claimed_at > now() - interval '45 minutes' and i.status = 'investigating' then return 'in_progress'; end if;
  if i.status not in ('new', 'approved', 'failed') then return 'not_open'; end if;
  if i.attempts >= s.max_attempts then
    update public.site_issues set status = 'needs_owner', peace_notes = coalesce(peace_notes || E'\n\n', '') || 'Automatic repair stopped after ' || i.attempts || ' attempts. Please review.' where id = i.id;
    insert into public.site_issue_events (issue_id, actor, action, detail) values (i.id, 'system', 'escalated', 'Attempt limit reached');
    return 'attempt_limit';
  end if;
  update public.site_issues set claimed_at = now(), claimed_by = left(p_runner, 200), attempts = attempts + 1,
    status = case when kind = 'problem' or status = 'approved' then 'investigating' else status end where id = i.id;
  insert into public.site_issue_events (issue_id, actor, action, detail) values (i.id, 'peace', 'claimed', left(p_runner, 200));
  return 'claimed';
end $$;

alter table public.assist_settings enable row level security;
alter table public.site_issue_events enable row level security;
create policy "owner reads assist settings" on public.assist_settings for select to authenticated using (public.has_staff_role(array['owner', 'admin']::public.staff_role[]));
create policy "owner changes assist settings" on public.assist_settings for update to authenticated
  using (public.has_staff_role(array['owner']::public.staff_role[])) with check (public.has_staff_role(array['owner']::public.staff_role[]));
create policy "owner reads assist events" on public.site_issue_events for select to authenticated using (public.has_staff_role(array['owner', 'admin']::public.staff_role[]));
create policy "owner logs decisions" on public.site_issue_events for insert to authenticated
  with check (actor = 'owner' and public.has_staff_role(array['owner', 'admin']::public.staff_role[]));
revoke all on public.assist_settings, public.site_issue_events from public, anon;
grant select, update on public.assist_settings to authenticated;
grant select, insert on public.site_issue_events to authenticated;
grant all on public.assist_settings, public.site_issue_events to service_role;
revoke all on function public.assist_claim(uuid, text) from public, anon, authenticated;
grant execute on function public.assist_claim(uuid, text) to service_role;

update public.dev_tracker set detail = 'Members report problems or suggestions from any page; acknowledged at once; processed immediately by Peace (GitHub Actions) with a 15-minute backup sweep; owner approves sensitive changes and suggestions; pause anytime; full action and cost log.',
  status = 'built', deployed = false, next_step = 'Owner: add the Anthropic API key and dispatch token (see Assistance Center → Setup), then run the harmless test.' where key = 'assistance-center';

insert into public.qa_features (key, department, title, tracker_key, href, purpose, steps, expected, sort) values
  ('assistance-immediate', 'admin', 'Immediate technical assistance', 'assistance-center', '/admin/assist',
    'Reports are acknowledged and processed immediately, safely and transparently.',
    array['Complete the one-time setup in the Assistance Center.', 'Send a harmless test problem from Help & suggestions: you receive an acknowledgement email at once.', 'Within minutes the report shows Peace''s activity, a tested change and "Fixed"; you receive the resolution email.', 'Pause repairs and send another report: it stays New until you resume.']::text[],
    'Immediate, tested, logged repairs with costs; pause works; sensitive changes come to you.', 1710)
on conflict (key) do nothing;
