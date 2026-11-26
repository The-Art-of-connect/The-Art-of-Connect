-- Quality Assurance Center: owner-only, failures open corrections, approval requires a pass.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
\echo 'v31-1) The test plan covers all ten departments (expect 10):'
select count(distinct department) from public.qa_features;
\echo 'v31-2) "Needs changes" opens a correction and requires a retest (expect 1|t|f):'
update public.qa_features set owner_status = 'needs_changes', actual_result = 'The save button did nothing.' where key = 'boundaries';
select (select count(*) from public.qa_corrections where feature_key = 'boundaries' and status = 'open'), retest_required, owner_approved from public.qa_features where key = 'boundaries';
\echo 'v31-3) Approval is refused without a pass (expect error):'
update public.qa_features set owner_approved = true where key = 'boundaries';
\echo 'v31-4) Fixing the correction returns it for retest; a pass then allows approval (expect t|t|f):'
update public.qa_corrections set status = 'fixed', resolution = 'Button reconnected.' where feature_key = 'boundaries';
update public.qa_features set owner_status = 'passed' where key = 'boundaries';
update public.qa_features set owner_approved = true where key = 'boundaries';
select owner_approved, approved_at is not null, retest_required from public.qa_features where key = 'boundaries';
\echo 'v31-5) A member sees none of the test plan or corrections (expect 0|0):'
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000081';
select (select count(*) from public.qa_features), (select count(*) from public.qa_corrections);
\echo 'v31-6) A member cannot record results (expect 0 rows changed):'
with u as (update public.qa_features set owner_status = 'passed' where key = 'public-site' returning 1) select count(*) from u;
reset role;
reset request.jwt.claim.sub;
