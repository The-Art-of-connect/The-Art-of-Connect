-- Quality Assurance Center: the owner's private, systematic test plan for every feature, linked to the
-- Development Tracker. Peace records technical test evidence first; the owner then tests, records results,
-- uploads screenshots and approves. A failed or "needs changes" result automatically opens a correction task.
-- Owner approval can only be recorded by the owner.

create table public.qa_features (
  key text primary key check (key ~ '^[a-z0-9-]{2,60}$'),
  department text not null check (department in ('account', 'art-of-self', 'journey', 'professional', 'singles', 'couples', 'counseling', 'financial', 'admin', 'security')),
  title text not null check (char_length(title) between 2 and 140),
  tracker_key text references public.dev_tracker (key) on update cascade on delete set null,
  href text check (href is null or href ~ '^/[A-Za-z0-9/_?=&#.-]*$'),
  purpose text not null default '' check (char_length(purpose) <= 1000),
  steps text[] not null default '{}',
  expected text not null default '' check (char_length(expected) <= 2000),
  sort integer not null default 0,
  -- Peace's technical testing (recorded before the owner is asked to review)
  peace_status text not null default 'not_tested' check (peace_status in ('not_tested', 'passed', 'failed', 'blocked')),
  peace_evidence text check (char_length(peace_evidence) <= 4000),
  peace_tested_at timestamptz,
  -- The owner's review
  owner_status text not null default 'not_started' check (owner_status in ('not_started', 'in_progress', 'passed', 'failed', 'needs_changes')),
  actual_result text check (char_length(actual_result) <= 4000),
  owner_comments text check (char_length(owner_comments) <= 4000),
  retest_required boolean not null default false,
  owner_approved boolean not null default false,
  approved_at timestamptz,
  owner_updated_at timestamptz,
  created_at timestamptz not null default now(),
  check (not owner_approved or owner_status = 'passed')
);
create index qa_features_department on public.qa_features (department, sort);

create table public.qa_corrections (
  id uuid primary key default gen_random_uuid(),
  feature_key text not null references public.qa_features (key) on update cascade on delete cascade,
  reported text not null check (char_length(reported) between 1 and 8000),
  status text not null default 'open' check (status in ('open', 'in_progress', 'fixed', 'closed')),
  resolution text check (char_length(resolution) <= 4000),
  created_at timestamptz not null default now(),
  fixed_at timestamptz,
  closed_at timestamptz
);
create index qa_corrections_feature on public.qa_corrections (feature_key, status);

create table public.qa_screenshots (
  id uuid primary key default gen_random_uuid(),
  feature_key text not null references public.qa_features (key) on update cascade on delete cascade,
  path text not null unique check (path ~ '^qa/[a-z0-9-]{2,60}/[A-Za-z0-9._-]{4,120}$'),
  note text check (char_length(note) <= 500),
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.qa_owner_state (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  last_feature text,
  last_department text,
  updated_at timestamptz not null default now()
);

-- Owner results drive the workflow: failures open corrections; approval is owner-only and requires a pass.
create or replace function public.qa_feature_workflow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.owner_approved is distinct from old.owner_approved or new.owner_status is distinct from old.owner_status
      or new.actual_result is distinct from old.actual_result or new.owner_comments is distinct from old.owner_comments)
     and auth.uid() is not null and not public.has_staff_role(array['owner']::public.staff_role[]) then
    raise exception 'Only the owner can record owner test results or approval';
  end if;
  if new.owner_status in ('failed', 'needs_changes') and new.owner_status is distinct from old.owner_status then
    insert into public.qa_corrections (feature_key, reported)
      values (new.key, coalesce(nullif(trim(concat_ws(E'\n', new.actual_result, new.owner_comments)), ''), 'Reported by the owner without details.'));
    new.owner_approved := false; new.approved_at := null; new.retest_required := true;
  end if;
  if new.owner_approved and not old.owner_approved then new.approved_at := now(); new.retest_required := false; end if;
  -- A pass after a fix closes the fixed corrections.
  if new.owner_status = 'passed' and old.owner_status is distinct from 'passed' then
    update public.qa_corrections set status = 'closed' where feature_key = new.key and status = 'fixed';
  end if;
  if not new.owner_approved then new.approved_at := null; end if;
  if new.owner_status is distinct from old.owner_status or new.actual_result is distinct from old.actual_result or new.owner_comments is distinct from old.owner_comments then
    new.owner_updated_at := now();
  end if;
  return new;
end $$;
create trigger qa_feature_workflow before update on public.qa_features for each row execute function public.qa_feature_workflow();

-- When a correction is marked fixed, the feature returns to the owner's queue for retesting.
create or replace function public.qa_correction_workflow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'fixed' and old.status is distinct from 'fixed' then
    new.fixed_at := now();
    update public.qa_features set retest_required = true where key = new.feature_key;
  end if;
  if new.status = 'closed' and old.status is distinct from 'closed' then new.closed_at := now(); end if;
  return new;
end $$;
create trigger qa_correction_workflow before update on public.qa_corrections for each row execute function public.qa_correction_workflow();

alter table public.qa_features enable row level security;
alter table public.qa_corrections enable row level security;
alter table public.qa_screenshots enable row level security;
alter table public.qa_owner_state enable row level security;
create policy "owner reads qa" on public.qa_features for select to authenticated using (public.has_staff_role(array['owner']::public.staff_role[]));
create policy "owner records qa" on public.qa_features for update to authenticated using (public.has_staff_role(array['owner']::public.staff_role[])) with check (public.has_staff_role(array['owner']::public.staff_role[]));
create policy "owner reads corrections" on public.qa_corrections for select to authenticated using (public.has_staff_role(array['owner']::public.staff_role[]));
create policy "owner manages screenshots" on public.qa_screenshots for all to authenticated using (public.has_staff_role(array['owner']::public.staff_role[])) with check (public.has_staff_role(array['owner']::public.staff_role[]));
create policy "owner keeps own place" on public.qa_owner_state for all to authenticated using (user_id = auth.uid() and public.has_staff_role(array['owner']::public.staff_role[])) with check (user_id = auth.uid() and public.has_staff_role(array['owner']::public.staff_role[]));
revoke all on public.qa_features, public.qa_corrections, public.qa_screenshots, public.qa_owner_state from public, anon;
grant select, update on public.qa_features to authenticated;
grant select on public.qa_corrections to authenticated;
grant select, insert, delete on public.qa_screenshots to authenticated;
grant select, insert, update on public.qa_owner_state to authenticated;
grant all on public.qa_features, public.qa_corrections, public.qa_screenshots, public.qa_owner_state to service_role;

-- Private screenshot storage: owner only.
insert into storage.buckets (id, name, public) values ('qa-evidence', 'qa-evidence', false) on conflict (id) do nothing;
create policy "owner uploads qa evidence" on storage.objects for insert to authenticated
  with check (bucket_id = 'qa-evidence' and public.has_staff_role(array['owner']::public.staff_role[]));
create policy "owner reads qa evidence" on storage.objects for select to authenticated
  using (bucket_id = 'qa-evidence' and public.has_staff_role(array['owner']::public.staff_role[]));
create policy "owner deletes qa evidence" on storage.objects for delete to authenticated
  using (bucket_id = 'qa-evidence' and public.has_staff_role(array['owner']::public.staff_role[]));
