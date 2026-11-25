-- Adaptive Discovery Sessions (paid Journey) and the member's dated, private analyses.
-- Sessions and analyses belong to the member alone: no staff policy exists, by design.
-- Analyses are never shared automatically with matches, partners, connections or providers,
-- and nothing here is read by matchmaking.

create table public.journey_discovery_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null references public.journey_training_categories (key) on update cascade,
  status text not null default 'active' check (status in ('active', 'completed', 'ended')),
  conversation_id uuid references public.journey_conversations (id) on delete set null,
  exchanges integer not null default 0 check (exchanges >= 0),
  skipped integer not null default 0 check (skipped >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create unique index journey_discovery_one_active on public.journey_discovery_sessions (user_id, category) where status = 'active';
create trigger touch_journey_discovery before update on public.journey_discovery_sessions for each row execute function public.touch_updated_at();
alter table public.journey_discovery_sessions enable row level security;
create policy "only the member" on public.journey_discovery_sessions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.discovery_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  scope text not null check (scope ~ '^(portfolio|category:[a-z-]{2,40}|curriculum:[a-z-]{2,60})$'),
  source text not null check (source in ('journey', 'self')),
  content text not null check (char_length(content) between 10 and 20000),
  member_notes text check (char_length(member_notes) <= 4000),
  created_at timestamptz not null default now()
);
create index discovery_analyses_member on public.discovery_analyses (user_id, scope, created_at desc);
alter table public.discovery_analyses enable row level security;
create policy "only the member" on public.discovery_analyses for all using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.journey_discovery_sessions, public.discovery_analyses from public, anon;
grant select, insert, update, delete on public.journey_discovery_sessions, public.discovery_analyses to authenticated;
grant all on public.journey_discovery_sessions, public.discovery_analyses to service_role;
