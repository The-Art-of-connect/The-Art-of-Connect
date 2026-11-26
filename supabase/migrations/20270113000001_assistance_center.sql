-- Assistance Center: members report problems or suggest ideas from any page. The owner receives every report.
-- Problems: Peace investigates, fixes, tests and deploys, then records what was done.
-- Suggestions: Peace writes a proposal; nothing is built until the owner approves it.
create table public.site_issues (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  kind text not null check (kind in ('problem', 'suggestion')),
  page_path text check (char_length(page_path) <= 300),
  description text not null check (char_length(description) between 5 and 4000),
  expected text check (char_length(expected) <= 2000),
  screenshot_path text check (screenshot_path ~ '^issues/[0-9a-f-]{36}/[A-Za-z0-9._-]{8,80}$'),
  device text check (char_length(device) <= 300),
  status text not null default 'new' check (status in (
    'new', 'investigating', 'fixed', 'needs_owner', 'cannot_reproduce', 'proposed', 'approved', 'declined', 'built', 'closed')),
  -- Peace's findings: cause and fix for problems, or the proposal for suggestions.
  peace_notes text check (char_length(peace_notes) <= 8000),
  pr_url text check (pr_url is null or pr_url ~ '^https://github\.com/'),
  owner_note text check (char_length(owner_note) <= 4000),
  member_reply text check (char_length(member_reply) <= 2000),
  decided_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index site_issues_status on public.site_issues (status, created_at);
create trigger touch_site_issues before update on public.site_issues for each row execute function public.touch_updated_at();

alter table public.site_issues enable row level security;
create policy "report an issue" on public.site_issues for insert to authenticated
  with check (reporter_id = auth.uid() and status = 'new' and peace_notes is null and pr_url is null and owner_note is null and member_reply is null);
create policy "see own reports" on public.site_issues for select to authenticated
  using (reporter_id = auth.uid() or public.has_staff_role(array['owner', 'admin']::public.staff_role[]));
create policy "owner manages issues" on public.site_issues for update to authenticated
  using (public.has_staff_role(array['owner', 'admin']::public.staff_role[])) with check (public.has_staff_role(array['owner', 'admin']::public.staff_role[]));
revoke all on public.site_issues from public, anon;
grant select, insert, update on public.site_issues to authenticated;
grant all on public.site_issues to service_role;

-- Optional screenshots, private: the reporter uploads; only the owner and admins can open them.
insert into storage.buckets (id, name, public) values ('site-issues', 'site-issues', false) on conflict (id) do nothing;
create policy "members upload issue screenshots" on storage.objects for insert to authenticated
  with check (bucket_id = 'site-issues' and (storage.foldername(name))[1] = 'issues' and (storage.foldername(name))[2] = auth.uid()::text);
create policy "owner reads issue screenshots" on storage.objects for select to authenticated
  using (bucket_id = 'site-issues' and public.has_staff_role(array['owner', 'admin']::public.staff_role[]));

insert into public.dev_tracker (key, area, title, detail, status, next_step, sort_order, designed, built, tests_passed, merged, deployed, operational, awaiting) values
  ('assistance-center', 'Owner Portal', 'Assistance Center (report a problem, suggest an idea)', 'Members report problems or suggestions from any page; the owner is alerted; Peace fixes problems and proposes suggestions for owner approval on a schedule.', 'deployed', 'Owner: send a test report and approve or decline a suggestion.', 600, true, true, true, true, true, false, 'owner')
on conflict (key) do nothing;
insert into public.qa_features (key, department, title, tracker_key, href, purpose, steps, expected, sort) values
  ('assistance-center', 'admin', 'Assistance Center', 'assistance-center', '/app/assist',
    'Problems get fixed; suggestions wait for the owner''s approval.',
    array['From any member page, open Help & suggestions (profile menu or the link at the bottom of the page).', 'Report a problem with a screenshot, and separately send a suggestion.', 'Open the Assistance Center in the Owner Portal: both appear; you received an email alert.', 'After Peace''s next scheduled check: the problem shows what was fixed; the suggestion shows a proposal with Approve and Decline.']::text[],
    'Every report reaches the owner; nothing suggested is built without approval.', 1700)
on conflict (key) do nothing;
