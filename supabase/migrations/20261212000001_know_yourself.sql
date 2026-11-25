-- Know Yourself First: private self-discovery before dating, marriage or work.
-- For each area of life a member records what they value, what they will do,
-- what they won't do, and how they'll express it respectfully.
-- Strictly private: only the member can read or change their answers.
-- There is deliberately no staff, owner or partner access.

create table public.self_discovery (
  user_id uuid not null references public.profiles (id) on delete cascade,
  area text not null check (area in ('self', 'work', 'life', 'love')),
  core_values text check (char_length(core_values) <= 2000),
  will_do text check (char_length(will_do) <= 4000),
  wont_do text check (char_length(wont_do) <= 4000),
  say_it text check (char_length(say_it) <= 4000),
  updated_at timestamptz not null default now(),
  primary key (user_id, area)
);

alter table public.self_discovery enable row level security;
create policy "only the member" on public.self_discovery for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger touch_self_discovery before update on public.self_discovery
  for each row execute function public.touch_updated_at();

revoke all on public.self_discovery from public, anon;
grant select, insert, update, delete on public.self_discovery to authenticated;
grant all on public.self_discovery to service_role;
