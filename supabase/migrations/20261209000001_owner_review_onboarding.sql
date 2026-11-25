-- ════════════════════════════════════════════════════════════════════
-- Owner review of every page, Coming Soon switches, saved onboarding
--   • page_reviews: the owner's decision on any page or section while
--     previewing it — approve, needs changes, add more, or coming soon —
--     with notes. Owner and executives only.
--   • section_status: any member page can be switched to "Coming soon"
--     without a code change. Everyone may read it (it only says which
--     pages are open); only the owner and executives change it.
--   • onboarding_answers: The Personal Society phased onboarding. Each
--     answer belongs to its member only; staff cannot read private answers.
-- ════════════════════════════════════════════════════════════════════

create table public.page_reviews (
  id uuid primary key default gen_random_uuid(),
  path text not null check (path ~ '^/[A-Za-z0-9/_-]{0,200}$'),
  decision text not null check (decision in ('approve', 'changes', 'add_more', 'coming_soon')),
  notes text check (length(notes) <= 4000),
  resolved boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index page_reviews_path_idx on public.page_reviews (path, created_at desc);

create table public.section_status (
  path text primary key check (path ~ '^/[A-Za-z0-9/_-]{0,200}$'),
  status text not null default 'live' check (status in ('live', 'coming_soon')),
  member_note text check (length(member_note) <= 300),
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.onboarding_answers (
  user_id uuid not null references public.profiles (id) on delete cascade,
  question_id text not null check (question_id ~ '^q\.[a-z0-9_]{2,60}$'),
  question_version integer not null default 1 check (question_version >= 1),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id),
  check (pg_column_size(value) <= 8000)
);

alter table public.page_reviews enable row level security;
alter table public.section_status enable row level security;
alter table public.onboarding_answers enable row level security;

create policy "owner reviews" on public.page_reviews for all
  using (public.has_staff_role(array['owner','executive']::public.staff_role[]))
  with check (public.has_staff_role(array['owner','executive']::public.staff_role[]) and created_by = auth.uid());

create policy "anyone reads status" on public.section_status for select using (true);
create policy "owner sets status" on public.section_status for all
  using (public.has_staff_role(array['owner','executive']::public.staff_role[]))
  with check (public.has_staff_role(array['owner','executive']::public.staff_role[]));

create policy "own answers" on public.onboarding_answers for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.page_reviews, public.section_status, public.onboarding_answers from anon, authenticated;
grant select, insert, update, delete on public.page_reviews to authenticated;
grant select on public.section_status to anon, authenticated;
grant insert, update, delete on public.section_status to authenticated;
grant select, insert, update, delete on public.onboarding_answers to authenticated;
grant all on public.page_reviews, public.section_status, public.onboarding_answers to service_role;

-- Pages not yet ready for members start as Coming soon; the owner can open each one after review.
insert into public.section_status (path, status, member_note) values
  ('/app/journey/voice', 'coming_soon', 'Talk to Journey is coming soon.'),
  ('/app/journey/sessions', 'coming_soon', 'Journey Private Sessions are coming soon.'),
  ('/app/journey/plus', 'coming_soon', 'Journey Plus is coming soon.'),
  ('/app/journey/memory', 'coming_soon', 'Journey''s personal memory is coming soon.'),
  ('/app/relationships/exclusive', 'coming_soon', 'The Exclusive Connection is coming soon.'),
  ('/app/counseling/professionals', 'coming_soon', 'The Professional Therapy and Counseling Center is coming soon.')
on conflict (path) do nothing;
