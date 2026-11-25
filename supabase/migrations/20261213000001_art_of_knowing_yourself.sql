-- The Art of Knowing Yourself — "Who Am I?" progressive discovery program.
-- One shared, private discovery profile across Business, Life, Singles and
-- Couples. Entirely optional. Every table is readable and writable only by
-- the member: no staff, owner, partner, match, provider or anonymous access.
-- Answers are never used for diagnosis or to decide relationship suitability.

-- Answers: one row per question, updated in place.
create table public.discovery_answers (
  user_id uuid not null references public.profiles (id) on delete cascade,
  question_key text not null check (question_key ~ '^[a-z0-9_]{2,60}$'),
  answer text check (char_length(answer) <= 4000),
  choices text[] check (coalesce(array_length(choices, 1), 0) <= 12),
  updated_at timestamptz not null default now(),
  primary key (user_id, question_key)
);

-- History: every saved version, so members can see how they've grown.
create table public.discovery_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  question_key text not null,
  answer text,
  choices text[],
  recorded_at timestamptz not null default now()
);
create index discovery_history_user on public.discovery_history (user_id, question_key, recorded_at);

-- Personal development goals and individual growth plan.
create table public.discovery_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  area text not null default 'self' check (area in ('self', 'work', 'life', 'love')),
  title text not null check (char_length(title) between 2 and 200),
  why text check (char_length(why) <= 2000),
  next_step text check (char_length(next_step) <= 1000),
  status text not null default 'active' check (status in ('active', 'achieved', 'paused')),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The member's own choice about participating. "explore_first" and "later"
-- mean we stop prompting them; they can return any time.
create table public.discovery_preference (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  choice text not null check (choice in ('begin', 'explore_first', 'later')),
  updated_at timestamptz not null default now()
);

alter table public.discovery_answers enable row level security;
alter table public.discovery_history enable row level security;
alter table public.discovery_goals enable row level security;
alter table public.discovery_preference enable row level security;

create policy "only the member" on public.discovery_answers for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "only the member reads" on public.discovery_history for select using (user_id = auth.uid());
create policy "only the member erases" on public.discovery_history for delete using (user_id = auth.uid());
create policy "only the member" on public.discovery_goals for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "only the member" on public.discovery_preference for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- History is written only by this trigger (members cannot forge or edit it).
create or replace function public.record_discovery_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.answer is distinct from old.answer or new.choices is distinct from old.choices then
    insert into public.discovery_history (user_id, question_key, answer, choices) values (new.user_id, new.question_key, new.answer, new.choices);
  end if;
  return new;
end;
$$;
revoke execute on function public.record_discovery_history() from public, anon, authenticated;
create trigger discovery_history_on_save after insert or update on public.discovery_answers
  for each row execute function public.record_discovery_history();

create trigger touch_discovery_answers before update on public.discovery_answers for each row execute function public.touch_updated_at();
create trigger touch_discovery_goals before update on public.discovery_goals for each row execute function public.touch_updated_at();
create trigger touch_discovery_preference before update on public.discovery_preference for each row execute function public.touch_updated_at();

revoke all on public.discovery_answers, public.discovery_history, public.discovery_goals, public.discovery_preference from public, anon;
grant select, insert, update, delete on public.discovery_answers, public.discovery_goals, public.discovery_preference to authenticated;
grant select, delete on public.discovery_history to authenticated;
grant all on public.discovery_answers, public.discovery_history, public.discovery_goals, public.discovery_preference to service_role;
