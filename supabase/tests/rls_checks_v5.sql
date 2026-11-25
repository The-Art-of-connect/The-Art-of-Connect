-- Staff MFA checks (v5). Run after the earlier files on the same database.
reset role;
reset request.jwt.claim.sub;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","aal":"aal1"}';
\echo 'v5-1) Owner signed in with password only (aal1) reads the audit log (expect 0):'
select count(*) from public.audit_log;
\echo 'v5-2) Owner with password only tries to change a launch setting (expect 0 rows):'
update public.platform_settings set value = 'true' where key = 'payments_live';
select count(*) from public.platform_settings where key = 'payments_live' and value = 'true';
\echo 'v5-3) Owner with password only reads members (expect only own profile, 1):'
select count(*) from public.profiles;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","aal":"aal2"}';
\echo 'v5-4) Owner after MFA (aal2) reads the audit log (expect more than 0):'
select count(*) > 0 from public.audit_log;
\echo 'v5-5) Owner after MFA still cannot read private journals or dates of birth (expect 0, 0):'
select (select count(*) from counseling.journal_entries), (select count(*) from public.member_private);
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002","aal":"aal1"}';
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
\echo 'v5-6) Ordinary member without MFA still uses their account normally (expect 1 journal):'
select count(*) from counseling.journal_entries;
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
