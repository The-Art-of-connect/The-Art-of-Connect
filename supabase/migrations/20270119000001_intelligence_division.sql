-- CONNECT 360 Global Intelligence Division (founder directives 24, 25 and 26), November 26, 2026.
-- Provider-independent research assignment system: every assignment has its own status, stages, requirements, findings,
-- sources, follow-up actions and history. Parallel and Exa jobs run behind Journey; nothing runs until the owner enables
-- the division, each provider, and a budget. Member research is private to the member (no routine staff access).

-- ─── Owner controls (everything off by default) ─────────────────────────────────────────────
create table public.intel_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  parallel_enabled boolean not null default false,
  exa_enabled boolean not null default false,
  emergency_stop boolean not null default false,
  company_monthly_limit_cents integer not null default 0 check (company_monthly_limit_cents >= 0),
  company_daily_limit_cents integer not null default 0 check (company_daily_limit_cents >= 0),
  per_assignment_limit_cents integer not null default 300 check (per_assignment_limit_cents >= 0),
  executive_member_monthly_cents integer not null default 0 check (executive_member_monthly_cents >= 0),
  elite_member_monthly_cents integer not null default 0 check (elite_member_monthly_cents >= 0),
  max_stages integer not null default 3 check (max_stages between 1 and 8),
  executive_concurrent integer not null default 2 check (executive_concurrent between 0 and 20),
  elite_concurrent integer not null default 5 check (elite_concurrent between 0 and 50),
  elite_watchlist_max integer not null default 5 check (elite_watchlist_max between 0 and 50),
  monitor_min_hours integer not null default 168 check (monitor_min_hours between 24 and 2160),
  cache_days integer not null default 14 check (cache_days between 0 and 90),
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);
insert into public.intel_settings (id) values (true) on conflict do nothing;
alter table public.intel_settings enable row level security;
create policy "owner manages intelligence settings" on public.intel_settings for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy "finance and executives read settings" on public.intel_settings for select to authenticated
  using (public.has_staff_role(array['owner', 'finance', 'executive']::public.staff_role[]));

-- Executive Private or Elite (or staff testing): who may commission research.
create or replace function public.intel_level(p uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from public.elite_badges b where b.user_id = p and b.status = 'active') then 'elite'
    when exists (select 1 from public.subscriptions s where s.user_id = p and s.kind = 'member' and s.status in ('active', 'trialing') and s.tier_slug = 'elite-concierge') then 'elite'
    when exists (select 1 from public.subscriptions s where s.user_id = p and s.kind = 'member' and s.status in ('active', 'trialing') and s.tier_slug = 'executive-private') then 'executive'
    when exists (select 1 from public.staff_roles r where r.user_id = p and r.role = 'owner') then 'elite'
    else null end;
$$;
revoke all on function public.intel_level(uuid) from public, anon;
grant execute on function public.intel_level(uuid) to authenticated, service_role;

-- The Safety Shield now also covers research objectives, details and instructions.
create or replace function public.shield_guard()
returns trigger language plpgsql set search_path = public as $$
declare f text[]; j jsonb := to_jsonb(new); txt text;
begin
  txt := concat_ws(' ', j ->> 'body', j ->> 'title', j ->> 'note', j ->> 'headline', j ->> 'bio', j ->> 'objective', j ->> 'detail');
  f := public.shield_findings(txt);
  if cardinality(f) > 0 then
    raise exception 'SAFETY_SHIELD:%', array_to_string(f, ',') using errcode = 'P0001';
  end if;
  return new;
end $$;

-- ─── Assignments ─────────────────────────────────────────────────────────────────────────────
create table public.intel_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160),
  objective text not null check (char_length(objective) between 10 and 6000),
  category text not null check (category in ('sports-ownership', 'leadership-discovery', 'business-acquisition', 'international-expansion',
    'supplier-discovery', 'board-advisory', 'retirement-legacy', 'business-ownership', 'collaboration', 'other')),
  requirements jsonb not null default '{}' check (jsonb_typeof(requirements) = 'object'),
  depth text not null default 'standard' check (depth in ('standard', 'deep')),
  status text not null default 'draft' check (status in ('draft', 'clarifying', 'queued', 'researching', 'verifying', 'needs_member',
    'complete', 'paused', 'cancelled', 'failed')),
  stage integer not null default 0 check (stage between 0 and 8),
  cost_cents integer not null default 0 check (cost_cents >= 0),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index intel_assignments_user on public.intel_assignments (user_id, created_at desc);
create trigger touch_intel_assignments before update on public.intel_assignments for each row execute function public.touch_updated_at();
create trigger shield_intel_assignments before insert or update of title, objective on public.intel_assignments for each row execute function public.shield_guard();

-- Members create, edit (before research begins), pause or cancel their own assignments; research state is set by the service.
create or replace function public.guard_intel_assignment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;  -- service role (the research worker)
  if tg_op = 'INSERT' then
    if public.intel_level(new.user_id) is null then raise exception 'My Intelligence Office is part of Executive Private and Elite Concierge.'; end if;
    if new.status not in ('draft', 'queued') then raise exception 'New assignments start as a draft or queued.'; end if;
    new.stage := 0; new.cost_cents := 0; new.completed_at := null;
    return new;
  end if;
  if new.cost_cents <> old.cost_cents or new.stage <> old.stage or new.completed_at is distinct from old.completed_at then
    raise exception 'Research progress is recorded by the system.';
  end if;
  if new.status <> old.status and not (
       (old.status in ('draft', 'needs_member', 'paused') and new.status = 'queued')
    or (old.status in ('queued', 'researching', 'verifying', 'needs_member') and new.status = 'paused')
    or (old.status not in ('complete', 'cancelled') and new.status = 'cancelled')
    or (old.status = 'complete' and new.status = 'queued')) then  -- request further investigation
    raise exception 'That change isn''t available for this assignment.';
  end if;
  if old.status not in ('draft', 'needs_member', 'paused', 'complete') and (new.objective <> old.objective or new.requirements <> old.requirements) then
    raise exception 'Add instructions while the assignment is paused or waiting for you.';
  end if;
  return new;
end $$;
create trigger guard_intel_assignment before insert or update on public.intel_assignments for each row execute function public.guard_intel_assignment();

-- Provider jobs: each call to Parallel, Exa or Journey, with its cost (the spending ledger).
create table public.intel_jobs (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.intel_assignments (id) on delete cascade,
  stage integer not null default 1,
  provider text not null check (provider in ('parallel', 'exa', 'journey')),
  capability text not null check (char_length(capability) <= 60),
  external_id text check (char_length(external_id) <= 200),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  request jsonb not null default '{}',
  estimated_cents integer not null default 0 check (estimated_cents >= 0),
  cost_cents integer not null default 0 check (cost_cents >= 0),
  attempts integer not null default 0,
  error text check (char_length(error) <= 2000),
  cache_key text check (char_length(cache_key) <= 200),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index intel_jobs_assignment on public.intel_jobs (assignment_id, stage);
create index intel_jobs_month on public.intel_jobs (created_at);

-- Findings with verification state, and the sources behind them.
create table public.intel_findings (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.intel_assignments (id) on delete cascade,
  job_id uuid references public.intel_jobs (id) on delete set null,
  kind text not null check (kind in ('opportunity', 'organization', 'person', 'requirement', 'financial', 'risk', 'regulatory', 'resource', 'note')),
  title text not null check (char_length(title) between 2 and 300),
  detail text check (char_length(detail) <= 8000),
  verification text not null default 'unverified' check (verification in ('confirmed', 'corroborated', 'unverified', 'conflicting', 'outdated', 'suggestion')),
  data jsonb not null default '{}',
  saved boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.intel_sources (
  id uuid primary key default gen_random_uuid(),
  finding_id uuid not null references public.intel_findings (id) on delete cascade,
  url text not null check (url ~ '^https?://' and char_length(url) <= 2000),
  title text check (char_length(title) <= 500),
  publisher text check (char_length(publisher) <= 200),
  published_on date,
  retrieved_at timestamptz not null default now(),
  authoritative boolean not null default false,
  provider text check (provider in ('parallel', 'exa', 'journey', 'member'))
);
-- History and follow-up actions (status changes, member instructions, provider steps, next steps).
create table public.intel_events (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.intel_assignments (id) on delete cascade,
  actor text not null check (actor in ('member', 'journey', 'parallel', 'exa', 'system')),
  action text not null check (char_length(action) <= 60),
  detail text check (char_length(detail) <= 4000),
  created_at timestamptz not null default now()
);
create trigger shield_intel_events before insert on public.intel_events for each row execute function public.shield_guard();
create table public.intel_reports (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.intel_assignments (id) on delete cascade,
  version integer not null default 1,
  summary text not null check (char_length(summary) <= 6000),
  body jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (assignment_id, version)
);

-- Elite: My Global Watchlist (ongoing objectives with scheduled monitoring).
create table public.intel_watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  objective text not null check (char_length(objective) between 5 and 1000),
  region text check (char_length(region) <= 120),
  frequency text not null default 'weekly' check (frequency in ('weekly', 'biweekly', 'monthly')),
  paused boolean not null default false,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz not null default now()
);
create trigger shield_intel_watchlist before insert or update of objective on public.intel_watchlist for each row execute function public.shield_guard();
create or replace function public.guard_intel_watchlist()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if public.intel_level(new.user_id) is distinct from 'elite' then raise exception 'My Global Watchlist is part of Elite Concierge.'; end if;
  if tg_op = 'INSERT' and (select count(*) from public.intel_watchlist where user_id = new.user_id) >= (select elite_watchlist_max from public.intel_settings) then
    raise exception 'Your watchlist is full. Pause or remove an objective to add another.';
  end if;
  if tg_op = 'UPDATE' then new.last_run_at := old.last_run_at; end if;
  return new;
end $$;
create trigger guard_intel_watchlist before insert or update on public.intel_watchlist for each row execute function public.guard_intel_watchlist();

-- ─── Row security: each member sees only their own research ─────────────────────────────────
alter table public.intel_assignments enable row level security;
alter table public.intel_jobs enable row level security;
alter table public.intel_findings enable row level security;
alter table public.intel_sources enable row level security;
alter table public.intel_events enable row level security;
alter table public.intel_reports enable row level security;
alter table public.intel_watchlist enable row level security;
create policy "own assignments" on public.intel_assignments for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own watchlist" on public.intel_watchlist for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own jobs" on public.intel_jobs for select to authenticated using (exists (select 1 from public.intel_assignments a where a.id = assignment_id and a.user_id = auth.uid()));
create policy "own findings" on public.intel_findings for select to authenticated using (exists (select 1 from public.intel_assignments a where a.id = assignment_id and a.user_id = auth.uid()));
create policy "save own findings" on public.intel_findings for update to authenticated using (exists (select 1 from public.intel_assignments a where a.id = assignment_id and a.user_id = auth.uid()));
create policy "own sources" on public.intel_sources for select to authenticated using (exists (select 1 from public.intel_findings f join public.intel_assignments a on a.id = f.assignment_id where f.id = finding_id and a.user_id = auth.uid()));
create policy "own events" on public.intel_events for select to authenticated using (exists (select 1 from public.intel_assignments a where a.id = assignment_id and a.user_id = auth.uid()));
create policy "member instructions" on public.intel_events for insert to authenticated
  with check (actor = 'member' and exists (select 1 from public.intel_assignments a where a.id = assignment_id and a.user_id = auth.uid()));
create policy "own reports" on public.intel_reports for select to authenticated using (exists (select 1 from public.intel_assignments a where a.id = assignment_id and a.user_id = auth.uid()));
revoke all on public.intel_settings, public.intel_assignments, public.intel_jobs, public.intel_findings, public.intel_sources, public.intel_events, public.intel_reports, public.intel_watchlist from public, anon;
grant select, update on public.intel_settings to authenticated;
grant select, insert, update, delete on public.intel_assignments, public.intel_watchlist to authenticated;
grant select on public.intel_jobs, public.intel_sources, public.intel_reports to authenticated;
grant select, update (saved) on public.intel_findings to authenticated;
grant select, insert on public.intel_events to authenticated;
grant all on public.intel_settings, public.intel_assignments, public.intel_jobs, public.intel_findings, public.intel_sources, public.intel_events, public.intel_reports, public.intel_watchlist to service_role;

-- ─── Spending guard: every provider call asks first (service role only) ──────────────────────
create or replace function public.intel_can_spend(p_assignment uuid, p_estimate_cents integer)
returns text language plpgsql security definer set search_path = public as $$
declare s public.intel_settings; a public.intel_assignments; lvl text; member_cap integer; spent_month bigint; spent_day bigint; spent_member bigint; running integer;
begin
  select * into s from public.intel_settings;
  if not s.enabled then return 'refused:division_off'; end if;
  if s.emergency_stop then return 'refused:emergency_stop'; end if;
  select * into a from public.intel_assignments where id = p_assignment;
  if a.id is null or a.status in ('cancelled', 'complete', 'paused', 'failed') then return 'refused:not_active'; end if;
  lvl := public.intel_level(a.user_id);
  if lvl is null then return 'refused:not_entitled'; end if;
  if a.stage > s.max_stages then return 'refused:max_stages'; end if;
  if a.cost_cents + p_estimate_cents > s.per_assignment_limit_cents then return 'refused:assignment_limit'; end if;
  select coalesce(sum(greatest(cost_cents, estimated_cents)), 0) into spent_month from public.intel_jobs where created_at >= date_trunc('month', now());
  if spent_month + p_estimate_cents > s.company_monthly_limit_cents then return 'refused:company_monthly'; end if;
  select coalesce(sum(greatest(cost_cents, estimated_cents)), 0) into spent_day from public.intel_jobs where created_at >= date_trunc('day', now());
  if spent_day + p_estimate_cents > s.company_daily_limit_cents then return 'refused:company_daily'; end if;
  member_cap := case lvl when 'elite' then s.elite_member_monthly_cents else s.executive_member_monthly_cents end;
  select coalesce(sum(greatest(j.cost_cents, j.estimated_cents)), 0) into spent_member from public.intel_jobs j join public.intel_assignments x on x.id = j.assignment_id
    where x.user_id = a.user_id and j.created_at >= date_trunc('month', now());
  if spent_member + p_estimate_cents > member_cap then return 'refused:member_monthly'; end if;
  return 'allowed';
end $$;
revoke all on function public.intel_can_spend(uuid, integer) from public, anon, authenticated;
grant execute on function public.intel_can_spend(uuid, integer) to service_role;

-- Owner analytics: totals only (no assignment contents).
create or replace function public.intel_spend_summary()
returns table (provider text, jobs bigint, month_cents bigint, today_cents bigint, failed bigint)
language sql stable security definer set search_path = public as $$
  select provider, count(*), coalesce(sum(cost_cents) filter (where created_at >= date_trunc('month', now())), 0),
         coalesce(sum(cost_cents) filter (where created_at >= date_trunc('day', now())), 0), count(*) filter (where status = 'failed')
  from public.intel_jobs where public.has_staff_role(array['owner', 'finance', 'executive']::public.staff_role[]) group by provider;
$$;
revoke all on function public.intel_spend_summary() from public, anon;
grant execute on function public.intel_spend_summary() to authenticated;
