-- Security checks for trust, safety & launch readiness (v4). Run after
-- rls_checks.sql, _v2 and _v3 on the same throwaway database.
reset role;
reset request.jwt.claim.sub;

-- Setup: two visible singles (6 and 8) in In Love.
insert into public.experience_access(user_id, experience, source) values ('00000000-0000-0000-0000-000000000008','relationships','owner_grant')
  on conflict (user_id, experience) do update set status = 'active';
insert into relationships.profiles(user_id, headline, is_visible) values ('00000000-0000-0000-0000-000000000008','forty',true)
  on conflict (user_id) do update set is_visible = true, track = 'single';

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000006';
\echo 'v4-1) Singles see each other before any block (expect 2):'
select count(*) from relationships.profiles;
\echo 'v4-2) Single 6 blocks 8; 6 sees only own profile (expect 1):'
insert into public.blocks(blocker_id, blocked_id) values ('00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000008');
select count(*) from relationships.profiles;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000008';
\echo 'v4-3) Blocked member no longer sees the blocker either (expect 1):'
select count(*) from relationships.profiles;
\echo 'v4-4) Blocked member tries to send a connection request (expect error):'
insert into relationships.connections(requester_id, recipient_id) values ('00000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000006');
\echo 'v4-5) Blocked member reads the block list (expect 0):'
select count(*) from public.blocks;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000006';
delete from public.blocks where blocked_id = '00000000-0000-0000-0000-000000000008';
reset role;
reset request.jwt.claim.sub;

\echo 'v4-6) Owner requires verified identity: unverified singles see only themselves (expect 1):'
update public.platform_settings set value = 'true' where key = 'require_identity_for_matchmaking';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000006';
select count(*) from relationships.profiles;
\echo 'v4-7) Member tries to mark themselves identity-verified (expect error):'
update public.profiles set identity_verified_at = now() where id = auth.uid();
\echo 'v4-8) Member tries to write a verification result (expect error):'
insert into public.identity_verifications(user_id, provider_session_id, status) values (auth.uid(), 'vs_fake', 'verified');
reset role;
reset request.jwt.claim.sub;
-- the provider webhook (service role) records verified results for both
update public.profiles set identity_verified_at = now() where id in ('00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000008');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000006';
\echo 'v4-9) Both verified: they see each other again (expect 2):'
select count(*) from relationships.profiles;
reset role;
reset request.jwt.claim.sub;

\echo 'v4-10) Three reports against member 8 automatically open a safety flag (expect 1):'
insert into public.moderation_reports(reporter_id, reported_user_id, experience, reason) values
  ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000008','relationships','harassment'),
  ('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000008','relationships','harassment'),
  ('00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000008','relationships','fake profile');
select count(*) from public.safety_flags where user_id = '00000000-0000-0000-0000-000000000008' and status = 'open';
\echo 'v4-11) Same person reports the same member twice in a day (expect error):'
insert into public.moderation_reports(reporter_id, reported_user_id, experience, reason) values ('00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000008','relationships','again');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000006';
\echo 'v4-12) Flagged member hidden from matchmaking (expect 1):'
select count(*) from relationships.profiles;
\echo 'v4-13) Member reads safety flags (expect 0):'
select count(*) from public.safety_flags;
reset role;
reset request.jwt.claim.sub;
update public.safety_flags set status = 'dismissed' where user_id = '00000000-0000-0000-0000-000000000008';

\echo 'v4-14) Daily connection cap of 1: first request ok, second refused (expect 1 then error):'
update public.platform_settings set value = '1' where key = 'max_daily_connection_requests';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000006';
insert into relationships.connections(requester_id, recipient_id) values ('00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000008');
select count(*) from relationships.connections where requester_id = auth.uid();
insert into relationships.connections(requester_id, recipient_id) values ('00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000002');
\echo 'v4-15) Blocking closes the existing connection (expect blocked):'
insert into public.blocks(blocker_id, blocked_id) values ('00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000008');
select status from relationships.connections where requester_id = auth.uid();
reset role;
reset request.jwt.claim.sub;

set role anon;
reset request.jwt.claim.sub;
\echo 'v4-16) Rate limit 2 per minute: allowed, allowed, refused (expect t t f):'
select public.rate_limit_hit('test:ip', 2, 60), public.rate_limit_hit('test:ip', 2, 60), public.rate_limit_hit('test:ip', 2, 60);
\echo 'v4-17) Anonymous reads rate-limit records (expect permission denied):'
select count(*) from public.rate_limit_events;
reset role;
reset request.jwt.claim.sub;

-- Professional approval guard (application 'Coach C' from v2 tests)
insert into counseling.applications(id, user_id, legal_name, professional_type, license_type, license_number, license_state)
  values ('30000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000003','Dr C','licensed_clinical','LMFT','123','GA');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
\echo 'v4-18) Approve licensed clinician without verification (expect error):'
update counseling.applications set status = 'approved' where id = '30000000-0000-0000-0000-000000000000';
\echo 'v4-19) Approve after identity, license lookup and disciplinary check (expect approved):'
update counseling.applications set identity_checked = true, license_verified = true, disciplinary_check_clear = true,
  license_lookup_url = 'https://board.example.gov/lookup/123', status = 'approved' where id = '30000000-0000-0000-0000-000000000000';
select status from counseling.applications where id = '30000000-0000-0000-0000-000000000000';
\echo 'v4-20) Owner updates the launch checklist (expect done):'
update public.launch_checklist set status = 'done', approved_by = auth.uid(), approved_at = now() where key = 'imagery';
select status from public.launch_checklist where key = 'imagery';
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000007';
\echo 'v4-21) Finance reads the checklist but cannot change it (expect 28 rows, then 0 updated):'
select count(*) from public.launch_checklist;
update public.launch_checklist set status = 'done' where key = 'pricing';
select count(*) from public.launch_checklist where key = 'pricing' and status = 'done';
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
\echo 'v4-22) Member reads the checklist (expect 0); records a versioned consent (expect 1):'
select count(*) from public.launch_checklist;
insert into public.consents(user_id, consent_type, version) values (auth.uid(), 'community_standards', '2026-11-draft');
select count(*) from public.consents where user_id = auth.uid() and consent_type = 'community_standards';
reset role;
reset request.jwt.claim.sub;
