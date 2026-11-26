-- Assistance Center: members report; only the owner sees all reports and decides.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a002';
\echo 'v40-1) A member reports a problem (expect 1):'
insert into public.site_issues (reporter_id, kind, page_path, description) values ('00000000-0000-0000-0000-00000000a002', 'problem', '/app/connect', 'The share button does nothing');
select count(*) from public.site_issues;
\echo 'v40-2) A member cannot mark their own report fixed or approved (expect 0 rows changed):'
with u as (update public.site_issues set status = 'approved' returning 1) select count(*) from u;
\echo 'v40-3) A member cannot pre-fill Peace''s notes (expect error):'
insert into public.site_issues (reporter_id, kind, description, peace_notes) values ('00000000-0000-0000-0000-00000000a002', 'suggestion', 'Add dark mode', 'approved already');
\echo 'v40-4) Other members cannot see someone else''s report (expect 0):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a003';
select count(*) from public.site_issues;
reset role;
reset request.jwt.claim.sub;
\echo 'v40-5) Critical failures are prioritized automatically (expect critical):'
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a002';
insert into public.site_issues (reporter_id, kind, page_path, description) values ('00000000-0000-0000-0000-00000000a002', 'problem', '/sign-in', 'I can''t sign in, it shows a blank page');
select priority from public.site_issues where description like 'I can%';
\echo 'v40-6) Members cannot claim reports or read the repair log (expect error, then 0):'
select public.assist_claim((select id from public.site_issues limit 1), 'member');
select count(*) from public.site_issue_events;
reset role;
reset request.jwt.claim.sub;
\echo 'v40-7) A report can be claimed once; a second repair is refused (expect claimed|in_progress):'
select public.assist_claim(id, 'run-1') || '|' || public.assist_claim(id, 'run-2') from public.site_issues where description like 'I can%';
\echo 'v40-8) Pausing stops every repair (expect paused):'
update public.assist_settings set repairs_paused = true;
select public.assist_claim(id, 'run-3') from public.site_issues where description like 'The share%';
update public.assist_settings set repairs_paused = false;
\echo 'v40-9) After the attempt limit, the report goes to the owner instead of retrying (expect attempt_limit, then needs_owner):'
update public.site_issues set claimed_at = null, attempts = 2, status = 'failed' where description like 'I can%';
select public.assist_claim(id, 'run-4') from public.site_issues where description like 'I can%';
select status from public.site_issues where description like 'I can%';
