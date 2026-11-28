-- Business Deal Room meetings (directive 48): host controls, consent before recording, minutes approval, history access.
reset role;
reset request.jwt.claim.sub;
insert into public.test_signups (email) values ('v60-host@example.com'), ('v60-b@example.com'), ('v60-late@example.com'), ('v60-out@example.com');
insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000f601', 'v60-host@example.com', '{"date_of_birth":"1975-01-01","display_name":"Host Test"}'),
  ('00000000-0000-0000-0000-00000000f602', 'v60-b@example.com', '{"date_of_birth":"1975-01-01","display_name":"Bee Test"}'),
  ('00000000-0000-0000-0000-00000000f603', 'v60-late@example.com', '{"date_of_birth":"1975-01-01","display_name":"Late Test"}'),
  ('00000000-0000-0000-0000-00000000f604', 'v60-out@example.com', '{"date_of_birth":"1975-01-01","display_name":"Out Test"}');
insert into public.subscriptions (user_id, status, kind, tier_slug, tier_name, experiences, stripe_subscription_id)
  select id, 'active', 'member', 'executive-private', 'Executive Private', '{business,relationships}', 'sub_test_v60_' || right(id::text, 3) from public.profiles where id::text like '00000000-0000-0000-0000-00000000f60%';
insert into public.experience_access (user_id, experience, status, source) select id, 'business', 'active', 'comp' from public.profiles where id::text like '00000000-0000-0000-0000-00000000f60%';
-- Deal Room invitations follow an accepted business conversation (existing rule).
insert into business.conversations (requester_id, recipient_id, status) values ('00000000-0000-0000-0000-00000000f602', '00000000-0000-0000-0000-00000000f601', 'accepted');
insert into business.conversations (requester_id, recipient_id, status) values ('00000000-0000-0000-0000-00000000f603', '00000000-0000-0000-0000-00000000f601', 'accepted');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f601';
insert into business.deal_rooms (id, owner_id, title, objective) values ('00000000-0000-0000-0000-0000000d0600', auth.uid(), 'Fictional room', 'Fictional objective for testing');
insert into business.room_participants (room_id, user_id, role) values ('00000000-0000-0000-0000-0000000d0600', '00000000-0000-0000-0000-00000000f602', 'principal');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f602';
update business.room_participants set status = 'active' where user_id = auth.uid();
reset role;
reset request.jwt.claim.sub;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f601';
\echo 'v60-1) A participant starts a meeting; recording is off by default (expect t, then off):'
select business.start_meeting('00000000-0000-0000-0000-0000000d0600', 'Weekly planning', 'Plan the next quarter', 'manual') is not null;
select recording_state from business.room_meetings;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f604';
\echo 'v60-2) Someone outside the room cannot start or see meetings (expect error, 0):'
select business.start_meeting('00000000-0000-0000-0000-0000000d0600', 'Intrusion', null, 'manual');
select count(*) from business.room_meetings;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f602';
\echo 'v60-3) Participants join without consenting to recording (expect joined):'
select business.join_meeting((select id from business.room_meetings limit 1), false);
\echo 'v60-4) Only the host controls recording (expect error):'
select business.set_recording((select id from business.room_meetings limit 1), 'recording');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f601';
\echo 'v60-5) Recording stays off until the founder approves a provider (expect error):'
select business.set_recording((select id from business.room_meetings limit 1), 'recording');
reset role;
reset request.jwt.claim.sub;
update public.platform_settings set value = 'true'::jsonb where key = 'meeting_recording_provider_approved';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f601';
\echo 'v60-6) Even then, everyone must consent first (expect error):'
select business.set_recording((select id from business.room_meetings limit 1), 'recording');
reset role;
reset request.jwt.claim.sub;
update public.platform_settings set value = 'false'::jsonb where key = 'meeting_recording_provider_approved';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f601';
\echo 'v60-7) The host writes minutes; drafts are private to the host until approved (expect 1):'
select business.save_minutes((select id from business.room_meetings limit 1), '{"topics":["Fictional topic"],"decisions":[{"text":"Open a second location (fictional)"}],"actions":[{"text":"Draft a budget (fictional)"}],"proposed":["A revenue split to be reviewed by counsel"]}'::jsonb, 'host');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f602';
\echo 'v60-8) Other participants do not see a draft (expect 0):'
select count(*) from business.meeting_minutes;
\echo 'v60-9) Only the host approves (expect error):'
select business.approve_minutes((select id from business.room_meetings limit 1), 1);
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f601';
\echo 'v60-10) Approval publishes the minutes and adds decisions and actions to the room tracker (expect approved|1|1):'
select business.approve_minutes((select id from business.room_meetings limit 1), 1);
select (select count(*) from business.room_items where kind = 'decision' and room_id = '00000000-0000-0000-0000-0000000d0600'), (select count(*) from business.room_items where kind = 'action' and room_id = '00000000-0000-0000-0000-0000000d0600');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f602';
\echo 'v60-11) Participants now see approved minutes (expect 1):'
select count(*) from business.meeting_minutes where status = 'approved';
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f601';
insert into business.room_participants (room_id, user_id, role) values ('00000000-0000-0000-0000-0000000d0600', '00000000-0000-0000-0000-00000000f603', 'principal');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f603';
update business.room_participants set status = 'active' where user_id = auth.uid();
reset role;
reset request.jwt.claim.sub;
-- The newcomer joined after the meeting began (the test clock is a single transaction moment, so make that explicit).
update business.room_participants set joined_at = now() + interval '1 minute' where user_id = '00000000-0000-0000-0000-00000000f603';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f603';
\echo 'v60-12) A participant added later does not see earlier meetings (expect 0):'
select count(*) from business.room_meetings;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f601';
\echo 'v60-13) Unless the host shares that meeting (expect granted, then 1):'
select business.grant_meeting_access((select id from business.room_meetings limit 1), '00000000-0000-0000-0000-00000000f603');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f603';
select count(*) from business.meeting_minutes where status = 'approved';
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f601';
\echo 'v60-14) Every host action is in the room audit history (expect t):'
select (select count(*) from business.room_audit where room_id = '00000000-0000-0000-0000-0000000d0600' and action in ('meeting_started', 'minutes_approved', 'meeting_access_granted')) = 3;
reset role;
reset request.jwt.claim.sub;
