-- Journey Knowledge & Training Library (Journey Intelligence Center).
-- Structured training entries by category. Each entry separates the founder's
-- approved principles (quoted verbatim) from newly generated interpretation.
-- Only APPROVED entries ever reach Journey's instructions. Entries with an open
-- founder question are never approved in bulk: they wait for the founder.
-- Owner/executive only; members can never read the library.

create table public.journey_training_categories (
  key text primary key check (key ~ '^[a-z-]{2,40}$'),
  title text not null check (char_length(title) between 2 and 80),
  description text not null default '' check (char_length(description) <= 600),
  sort integer not null default 0,
  learning_objectives text[] not null default '{}',
  response_standards text[] not null default '{}',
  founder_decisions text[] not null default '{}',
  status text not null default 'in_review' check (status in ('in_review', 'approved')),
  approved_at timestamptz,
  approved_by uuid references public.profiles (id) on delete set null
);

create table public.journey_training_entries (
  id uuid primary key default gen_random_uuid(),
  category text not null references public.journey_training_categories (key) on update cascade,
  topic text not null check (char_length(topic) between 2 and 200),
  scenario text not null check (char_length(scenario) between 10 and 3000),
  founder_principles text[] not null default '{}',
  interpretation text not null default '' check (char_length(interpretation) <= 3000),
  approach text not null default '' check (char_length(approach) <= 3000),
  example_response text not null check (char_length(example_response) between 10 and 6000),
  follow_ups text[] not null default '{}',
  safety text not null default '' check (char_length(safety) <= 2000),
  origin text not null default 'generated' check (origin in ('founder', 'generated', 'edited')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  founder_question text check (char_length(founder_question) <= 1000),
  reviewer_note text check (char_length(reviewer_note) <= 1000),
  source text not null default 'library' check (source in ('library', 'generator', 'owner')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  check (status <> 'approved' or founder_question is null)
);
create index journey_training_entries_category on public.journey_training_entries (category, status);
create trigger touch_journey_training before update on public.journey_training_entries for each row execute function public.touch_updated_at();

alter table public.journey_training_categories enable row level security;
alter table public.journey_training_entries enable row level security;
create policy "owner manages" on public.journey_training_categories for all
  using (public.has_staff_role(array['owner','executive']::public.staff_role[]))
  with check (public.has_staff_role(array['owner','executive']::public.staff_role[]));
create policy "owner manages" on public.journey_training_entries for all
  using (public.has_staff_role(array['owner','executive']::public.staff_role[]))
  with check (public.has_staff_role(array['owner','executive']::public.staff_role[]));

-- Approve a whole category in one step. Entries waiting on a founder decision stay pending.
create or replace function public.journey_training_approve_category(p_key text)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.has_staff_role(array['owner','executive']::public.staff_role[]) then
    raise exception 'Only the owner can approve training';
  end if;
  update public.journey_training_entries
     set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
   where category = p_key and status = 'pending' and founder_question is null;
  get diagnostics n = row_count;
  update public.journey_training_categories set status = 'approved', approved_at = now(), approved_by = auth.uid() where key = p_key;
  return n;
end $$;

revoke all on function public.journey_training_approve_category(text) from public, anon;
grant execute on function public.journey_training_approve_category(text) to authenticated;
revoke all on public.journey_training_categories, public.journey_training_entries from public, anon;
grant select, insert, update, delete on public.journey_training_categories, public.journey_training_entries to authenticated;
grant all on public.journey_training_categories, public.journey_training_entries to service_role;

insert into public.journey_training_categories (key, title, description, sort) values
  ('love-languages', 'The Five Love Languages', 'How members give, receive and experience love, never as fixed types or a compatibility verdict.', 1),
  ('childhood', 'Childhood & Family Dynamics', 'Learned behaviors and early experiences, explored without assuming trauma or assigning blame.', 2),
  ('emotional-intelligence', 'Emotional Intelligence', 'Awareness, regulation, motivation, empathy and relationship skills.', 3),
  ('dating', 'Dating & Compatibility', 'Intentional dating, discernment, compatibility and self-respect.', 4),
  ('marriage', 'Marriage & Commitment', 'Partnership, reciprocity and growing together.', 5),
  ('communication', 'Communication', 'Delivery, listening and responding with intention.', 6),
  ('boundaries', 'Boundaries & Independence', 'Self-respect, limits and protecting the essence of who you are.', 7),
  ('divorce', 'Divorce & Starting Over', 'Endings, co-parenting, accountability and rebuilding.', 8),
  ('consciousness', 'Consciousness & Awareness', 'The Four Levels of Consciousness as reflective growth concepts.', 9),
  ('manifestations', 'Manifestations & Affirmations', 'Affirmations and intentional living without guaranteed outcomes.', 10),
  ('conflict-resolution', 'Conflict Resolution', 'Disagreements, repair, apology and finding a way forward together.', 12),
  ('financial-mindset', 'Financial Mindset', 'Beliefs about money, independence and shared financial responsibility. Education, never financial advice.', 13),
  ('business-leadership', 'Business & Leadership', 'Leading people, professional relationships and growing a business with integrity.', 14),
  ('personal-development', 'Personal Development', 'Identity, self-love, purpose and growth.', 11);
