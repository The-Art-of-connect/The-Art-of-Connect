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
