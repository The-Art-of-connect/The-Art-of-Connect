-- Owner-run Intelligence Division self-tests (keys, webhook receivers, spending guard, one fictional search per provider).
-- Results only: never keys, secrets or tokens.
create table public.intel_security_runs (
  id uuid primary key default gen_random_uuid(),
  started_by uuid references public.profiles (id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'complete', 'failed')),
  results jsonb not null default '[]' check (jsonb_typeof(results) = 'array')
);
alter table public.intel_security_runs enable row level security;
create policy "owner reads" on public.intel_security_runs for select to authenticated using (public.is_owner());
grant select on public.intel_security_runs to authenticated;
grant all on public.intel_security_runs to service_role;
