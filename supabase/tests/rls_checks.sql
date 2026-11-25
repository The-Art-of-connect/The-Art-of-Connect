-- Security checks for the foundation schema.
-- Run ONLY against a local or throwaway database, never production:
--   psql -f supabase/tests/stub.sql -f supabase/migrations/*.sql -f supabase/tests/rls_checks.sql
-- stub.sql stands in for Supabase's auth/storage schemas on plain Postgres.
-- Each \echo line states the expected result.


\echo '1) Signup while closed, not allow-listed (expect error):'
insert into auth.users(email) values ('stranger@example.com');
\echo '2) Allow-listed signups + owner bootstrap:'
insert into public.signup_allowlist(email) values ('owner@example.com'),('member@example.com'),('counselor@example.com'),('client@example.com');
insert into auth.users(id,email) values
  ('00000000-0000-0000-0000-000000000001','owner@example.com'),
  ('00000000-0000-0000-0000-000000000002','member@example.com'),
  ('00000000-0000-0000-0000-000000000003','counselor@example.com'),
  ('00000000-0000-0000-0000-000000000004','client@example.com');
select public.bootstrap_owner('owner@example.com');
\echo '   second bootstrap (expect error):'
select public.bootstrap_owner('member@example.com');

insert into public.experience_access values ('00000000-0000-0000-0000-000000000002','relationships','active','owner_grant',null,null,now());
-- Singles must be 30+ (member_private holds the date of birth).
insert into public.member_private(user_id, date_of_birth) values ('00000000-0000-0000-0000-000000000002','1980-01-01');
insert into relationships.profiles(user_id,headline,is_visible) values ('00000000-0000-0000-0000-000000000002','hello',true);
insert into counseling.counselors(user_id,professional_name,is_verified,is_listed) values ('00000000-0000-0000-0000-000000000003','Dr C',true,true);
insert into counseling.clients(user_id,preferred_name) values ('00000000-0000-0000-0000-000000000004','Client');
insert into counseling.appointments(id,counselor_id,client_id,starts_at,ends_at,format) values
  ('10000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004',now(),now()+interval '1h','video');
insert into counseling.session_notes(appointment_id,counselor_id,body) values ('10000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000003','confidential');

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
\echo '3) Member with grant, experience not live: own row only (expect 1):'
select count(*) from relationships.profiles;
\echo '4) Member changes own account status (expect error):'
update public.profiles set status='suspended' where id=auth.uid();
\echo '5) Member tries to open registrations (expect false):'
update public.platform_settings set value='true' where key='registrations_open';
select value from public.platform_settings where key='registrations_open';
\echo '6) Member reads counseling notes / appointments (expect 0, 0):'
select (select count(*) from counseling.session_notes),(select count(*) from counseling.appointments);

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
\echo '7) Owner reads clinical session notes (expect 0, confidential):'
select count(*) from counseling.session_notes;
\echo '8) Owner reads counselor listing (expect 1):'
select count(*) from counseling.counselors;
\echo '9) Owner changes a launch setting (expect true):'
update public.platform_settings set value='true' where key='relationships_live';
select value from public.platform_settings where key='relationships_live';

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
\echo '10) Counselor reads own notes, sees own client (expect 1, 1):'
select (select count(*) from counseling.session_notes),(select count(*) from counseling.clients);
\echo '11) Counselor sees dating profiles (expect 0):'
select count(*) from relationships.profiles;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000004';
\echo '12) Client reads session notes (expect 0):'
select count(*) from counseling.session_notes;

reset role;
set role anon;
reset request.jwt.claim.sub;
\echo '13) Anonymous joins waitlist, cannot read it (expect permission denied):'
insert into public.waitlist(email) values ('fan@example.com');
select count(*) from public.waitlist;
