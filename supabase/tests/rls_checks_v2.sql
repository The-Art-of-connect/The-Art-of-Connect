-- Security checks for experiences v2. Run after rls_checks.sql on the same
-- throwaway database (it reuses the users created there).
reset role; -- start as the database owner, whatever ran before
reset request.jwt.claim.sub;

-- Setup as superuser: open In Love for testing, two partners + a single.
update public.platform_settings set value = 'true' where key = 'relationships_live';
insert into public.signup_allowlist(email) values ('partner@example.com'), ('single2@example.com');
insert into auth.users(id,email) values
  ('00000000-0000-0000-0000-000000000005','partner@example.com'),
  ('00000000-0000-0000-0000-000000000006','single2@example.com');
insert into public.experience_access(user_id, experience, source) values
  ('00000000-0000-0000-0000-000000000005','relationships','owner_grant'),
  ('00000000-0000-0000-0000-000000000006','relationships','owner_grant');
insert into public.member_private(user_id, date_of_birth) values
  ('00000000-0000-0000-0000-000000000005','1978-06-01'), ('00000000-0000-0000-0000-000000000006','1982-09-09');
insert into relationships.profiles(user_id, headline, is_visible) values
  ('00000000-0000-0000-0000-000000000005','partner',true),
  ('00000000-0000-0000-0000-000000000006','single two',true);

set role authenticated;
-- Member 2 (member@example.com) starts a couple and invites partner@example.com
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
\echo 'v2-0) Start a couple (expect a couple id), then try a second one (expect error):'
select relationships.start_couple() as couple_id \gset
select :'couple_id' is not null;
select relationships.start_couple();
\echo '     Try to insert a couple directly (expect error):'
insert into relationships.couples(created_by) values ('00000000-0000-0000-0000-000000000002');
insert into relationships.partner_invitations(couple_id, inviter_id, invitee_email, token_hash)
  values (:'couple_id','00000000-0000-0000-0000-000000000002','partner@example.com', '930bbdc51b6aed5c2a5678fd6e28dee7a05e8a4b643cfc0b4427c3efb86c0d94'); -- sha256 of 'secret-token' (the app computes this server-side)
insert into relationships.private_reflections(user_id, body) values ('00000000-0000-0000-0000-000000000002','my private thought');
insert into counseling.journal_entries(user_id, body) values ('00000000-0000-0000-0000-000000000002','dear diary');

\echo 'v2-1) Single sees other visible singles before couple forms (expect 3: own + partner + single2):'
select count(*) from relationships.profiles;

\echo 'v2-2) Wrong person tries to accept the invitation (expect error):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000006';
select relationships.accept_partner_invitation('secret-token') is not null;
\echo 'v2-3) Bad token (expect error):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000005';
select relationships.accept_partner_invitation('wrong-token');
\echo 'v2-4) Invited partner accepts (expect couple id):'
select relationships.accept_partner_invitation('secret-token') is not null;
\echo 'v2-5) Partner sees couple members (expect 2):'
select count(*) from relationships.couple_members;
\echo 'v2-6) Partner reads the other partner private reflections (expect 0):'
select count(*) from relationships.private_reflections;
\echo 'v2-7) Partner adds and sees a shared goal (expect 1):'
insert into relationships.couple_goals(couple_id, created_by, title) values (:'couple_id','00000000-0000-0000-0000-000000000005','Weekly check-in');
select count(*) from relationships.couple_goals;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000006';
\echo 'v2-8) A single no longer sees the couple in matchmaking (expect 1: own only):'
select count(*) from relationships.profiles;
\echo 'v2-9) Outsider sees the couple shared goals (expect 0):'
select count(*) from relationships.couple_goals;
\echo 'v2-10) Outsider tries to join the couple directly (expect error):'
insert into relationships.couple_members(couple_id, user_id) values (:'couple_id','00000000-0000-0000-0000-000000000006');

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
\echo 'v2-11) OWNER reads private journals and reflections (expect 0, 0):'
select (select count(*) from counseling.journal_entries), (select count(*) from relationships.private_reflections);
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
\echo 'v2-12) Author reads own journal (expect 1):'
select count(*) from counseling.journal_entries;

reset role;
set role anon;
reset request.jwt.claim.sub;
\echo 'v2-13) Anonymous professional interest: insert ok, cannot read (expect permission denied):'
insert into public.professional_interest(full_name, email, professional_type) values ('Coach C','coach@example.com','coach');
select count(*) from public.professional_interest;
reset role;
\echo 'v2-14) Licensed application without license (expect error):'
insert into counseling.applications(user_id, legal_name, professional_type) values ('00000000-0000-0000-0000-000000000003','Dr C','licensed_clinical');
\echo 'v2-15) Coach application without license (expect ok, 1):'
insert into counseling.applications(user_id, legal_name, professional_type, certifications) values ('00000000-0000-0000-0000-000000000003','Coach C','coach','ICF PCC');
select count(*) from counseling.applications where professional_type = 'coach';
