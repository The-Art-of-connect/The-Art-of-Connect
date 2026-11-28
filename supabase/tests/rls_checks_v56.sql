-- QA fictional cast: realm isolation, test-only verification, preferences, and the QA-only participant console.
reset role;
reset request.jwt.claim.sub;
update public.platform_settings set value = 'false'::jsonb where key = 'relationships_live';
insert into public.test_signups (email) values ('v56-qa@example.com'), ('v56-p1@example.com'), ('v56-p2@example.com'), ('v56-p3@example.com'), ('v56-real@example.com');
insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000f561', 'v56-qa@example.com', '{"date_of_birth":"1975-01-01","display_name":"Quinn QA"}'),
  ('00000000-0000-0000-0000-00000000f562', 'v56-p1@example.com', '{"date_of_birth":"1972-01-01","display_name":"Marcus Fictional"}'),
  ('00000000-0000-0000-0000-00000000f563', 'v56-p2@example.com', '{"date_of_birth":"1980-01-01","display_name":"Elena Fictional"}'),
  ('00000000-0000-0000-0000-00000000f564', 'v56-p3@example.com', '{"date_of_birth":"1969-01-01","display_name":"Theo Fictional"}');
-- A real (non-test) member in the same city, for isolation (created through the test sign-up path, then marked real).
insert into auth.users(id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-00000000f565', 'v56-real@example.com', '{"date_of_birth":"1970-01-01","display_name":"Real Member"}')
  on conflict do nothing;
update public.profiles set is_test = false, identity_verified_at = now() where id = '00000000-0000-0000-0000-00000000f565';
update public.profiles set test_identity_verified = true where id in ('00000000-0000-0000-0000-00000000f561', '00000000-0000-0000-0000-00000000f562', '00000000-0000-0000-0000-00000000f563');
insert into public.experience_access (user_id, experience, status, source) select id, 'relationships', 'active', 'comp' from public.profiles where id::text like '00000000-0000-0000-0000-00000000f56%';
insert into public.qa_switchers (user_id) values ('00000000-0000-0000-0000-00000000f561');
insert into public.qa_participants (user_id, persona) values ('00000000-0000-0000-0000-00000000f562', 'compatible'), ('00000000-0000-0000-0000-00000000f563', 'incompatible preferences'), ('00000000-0000-0000-0000-00000000f564', 'not verified');
insert into relationships.profiles (user_id, headline, city, relationship_intent, is_visible, track, birth_year, gender, seeking) values
  ('00000000-0000-0000-0000-00000000f561', 'QA', 'Charlotte', 'long_term', true, 'single', 1975, 'woman', '{man}'),
  ('00000000-0000-0000-0000-00000000f562', 'Fictional', 'Charlotte', 'long_term', true, 'single', 1972, 'man', '{woman}'),
  ('00000000-0000-0000-0000-00000000f563', 'Fictional', 'Charlotte', 'long_term', true, 'single', 1980, 'woman', '{woman}'),
  ('00000000-0000-0000-0000-00000000f564', 'Fictional', 'Charlotte', 'long_term', true, 'single', 1969, 'man', '{woman}'),
  ('00000000-0000-0000-0000-00000000f565', 'Real', 'Charlotte', 'long_term', true, 'single', 1970, 'man', '{woman}');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f561';
\echo 'v56-1) The QA account sees only the compatible, test-verified fictional participant: never real members, incompatible preferences or unverified accounts (expect Marcus|f|t):'
select first_name, identity_verified, test_verified from relationships.discover();
\echo 'v56-2) The QA account cannot reach a real member (expect error):'
insert into relationships.connections (requester_id, recipient_id) values (auth.uid(), '00000000-0000-0000-0000-00000000f565');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f565';
\echo 'v56-3) A real member never sees fictional participants (expect 0):'
select count(*) from relationships.profiles where user_id::text like '00000000-0000-0000-0000-00000000f56%' and user_id <> auth.uid();
\echo 'v56-4) Only the QA account may act for a participant (expect error):'
select public.qa_act('00000000-0000-0000-0000-00000000f562', 'express_interest');
\echo 'v56-5) Members cannot give themselves test verification (expect error):'
update public.profiles set test_identity_verified = true where id = auth.uid();
reset role;
reset request.jwt.claim.sub;
\echo 'v56-6) Test verification never helps a real account (expect f):'
update public.profiles set identity_verified_at = null, test_identity_verified = true where id = '00000000-0000-0000-0000-00000000f565';
select public.matchmaking_eligible('00000000-0000-0000-0000-00000000f565');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f561';
\echo 'v56-7) The QA account cannot act as a real member (expect error):'
select public.qa_act('00000000-0000-0000-0000-00000000f565', 'express_interest');
\echo 'v56-8) A participant expresses interest; the QA account sees it (expect ok|Marcus|pending|received):'
select public.qa_act('00000000-0000-0000-0000-00000000f562', 'express_interest');
select first_name, status, direction from relationships.my_connections();
\echo 'v56-9) The QA account accepts, the participant writes, the QA account receives it (expect ok|1):'
update relationships.connections set status = 'accepted' where recipient_id = auth.uid();
select public.qa_act('00000000-0000-0000-0000-00000000f562', 'send_message', 'Hello from a fictional participant');
select count(*) from public.social_messages m join public.social_conversation_members c on c.conversation_id = m.conversation_id where c.user_id = auth.uid() and m.sender_id = '00000000-0000-0000-0000-00000000f562';
\echo 'v56-10) The participant invites the QA account to The Exclusive Connection; the QA account accepts; both choose to become a couple (expect ok|accepted|waiting|couple):'
select public.qa_act('00000000-0000-0000-0000-00000000f562', 'request_exclusive');
select relationships.respond_exclusive((select id from relationships.exclusive_requests where recipient_id = auth.uid() and status = 'pending'), true);
select public.qa_act('00000000-0000-0000-0000-00000000f562', 'become_couple');
select relationships.become_couple('00000000-0000-0000-0000-00000000f562');
\echo 'v56-11) Shared goals and calendar from the partner; the partner''s private check-in stays private (expect t, then 1|1|0):'
select public.qa_act('00000000-0000-0000-0000-00000000f562', 'add_goal') = 'ok' and public.qa_act('00000000-0000-0000-0000-00000000f562', 'add_event') = 'ok' and public.qa_act('00000000-0000-0000-0000-00000000f562', 'checkin_private') = 'ok';
select (select count(*) from relationships.couple_goals), (select count(*) from relationships.couple_events), (select count(*) from relationships.couple_checkins where user_id <> auth.uid());
\echo 'v56-12) A shared check-in reaches the QA account (expect 1):'
select public.qa_act('00000000-0000-0000-0000-00000000f562', 'checkin_shared') = 'ok';
select count(*) from relationships.couple_checkins where user_id <> auth.uid();
\echo 'v56-13) Blocking and reporting by the participant (expect t|1):'
select public.qa_act('00000000-0000-0000-0000-00000000f562', 'block') = 'ok' and public.qa_act('00000000-0000-0000-0000-00000000f562', 'report') = 'ok';
reset role;
reset request.jwt.claim.sub;
select public.is_blocked_between('00000000-0000-0000-0000-00000000f561', '00000000-0000-0000-0000-00000000f562'), (select count(*) from public.moderation_reports where reported_user_id = '00000000-0000-0000-0000-00000000f561');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f561';
\echo 'v56-14) Reset returns both to single, unblocked and unconnected, so scenarios can be repeated (expect ok|f|0|0|Marcus):'
select public.qa_act('00000000-0000-0000-0000-00000000f562', 'reset');
reset role;
reset request.jwt.claim.sub;
select public.is_blocked_between('00000000-0000-0000-0000-00000000f561', '00000000-0000-0000-0000-00000000f562'),
  (select count(*) from relationships.connections where '00000000-0000-0000-0000-00000000f561' in (requester_id, recipient_id)),
  (select count(*) from relationships.couple_members where user_id = '00000000-0000-0000-0000-00000000f561');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f561';
select first_name from relationships.discover();
reset role;
reset request.jwt.claim.sub;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f561';
\echo 'v56-15) The QA console lists the fictional participants for the QA account (expect 3):'
select count(*) from public.qa_participant_status();
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f565';
\echo 'v56-16) Anyone else gets nothing (expect 0):'
select count(*) from public.qa_participant_status();
reset role;
reset request.jwt.claim.sub;
