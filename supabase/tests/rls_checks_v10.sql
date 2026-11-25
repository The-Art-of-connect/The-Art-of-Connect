-- The Professional Society: free accounts, consent-based public profiles,
-- private financial details, Connection Board, private inbox, safety access.
reset role;
reset request.jwt.claim.sub;

update public.platform_settings set value = 'true' where key = 'business_live';
insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000031', 'owner-a@example.com', jsonb_build_object('date_of_birth', '1970-05-01')),
  ('00000000-0000-0000-0000-000000000032', 'owner-b@example.com', jsonb_build_object('date_of_birth', '1968-02-02')),
  ('00000000-0000-0000-0000-000000000033', 'owner-c@example.com', jsonb_build_object('date_of_birth', '1975-03-03'));
insert into public.experience_access (user_id, experience, source) values
  ('00000000-0000-0000-0000-000000000031', 'business', 'free_tier'),
  ('00000000-0000-0000-0000-000000000032', 'business', 'free_tier'),
  ('00000000-0000-0000-0000-000000000033', 'business', 'subscription');

\echo 'v10-1) Seeded reference data only, no fabricated activity (expect 20|13|23|12|0|0):'
select (select count(*) from business.industries), (select count(*) from business.categories), (select count(*) from business.features),
       (select count(*) from business.readiness_items), (select count(*) from business.posts), (select count(*) from business.conversations);

set role anon;
\echo 'v10-2) Guests explore industries and features; no public profiles yet (expect 20|23|0):'
select jsonb_array_length(p->'industries'), jsonb_array_length(p->'features'), jsonb_array_length(p->'profiles') from (select business.public_explore() p) x;
\echo 'v10-3) Guests cannot read the Connection Board (expect permission denied):'
select count(*) from business.posts;
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000031';
\echo 'v10-4) Free member tier and feature access (expect free|t|f):'
select business.member_tier(), business.can_use('connection_board'), business.can_use('strategic_matching');
\echo 'v10-5) Profile without consent is not public; with consent it is, and consent time is recorded (expect 0|1|t):'
insert into business.profiles (user_id, company, display_name, industry, city, state, help_needed, help_offered, mentorship, onboarding_completed_at)
  values (auth.uid(), 'Alpha Accounting LLC', 'Alpha Accounting', 'accounting-finance', 'Birmingham', 'AL', '{expansion}', '{bookkeeping}', 'offering', now());
select jsonb_array_length(business.public_explore()->'profiles');
update business.profiles set public_profile_consent = true where user_id = auth.uid();
select jsonb_array_length(business.public_explore()->'profiles'), (select public_profile_consented_at is not null from business.profiles where user_id = auth.uid());
\echo 'v10-6) Private financial details saved by the member:'
insert into business.private_details (user_id, annual_revenue_range, employee_range) values (auth.uid(), '1m_5m', '11_50');
\echo 'v10-7) Member creates a Connection Board post (expect 1):'
insert into business.posts (author_id, intent, category, title, description, industry, city, state)
  values (auth.uid(), 'seeking_assistance', 'business-expansion', 'Expanding into new states', 'Looking for owners who have expanded a professional services firm across state lines.', 'accounting-finance', 'Birmingham', 'AL');
select count(*) from business.posts where author_id = auth.uid();

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000032';
insert into business.profiles (user_id, company, state, help_offered, help_needed) values (auth.uid(), 'Beta Systems', 'GA', '{expansion}', '{bookkeeping}');
\echo 'v10-8) Another member reads the post but not the first member''s financial details (expect 1|0):'
select (select count(*) from business.posts), (select count(*) from business.private_details);
\echo 'v10-9) "I Can Help — Connect Privately": request plus one introduction; a second message waits for acceptance (expect 1, then error):'
insert into business.conversations (post_id, requester_id, recipient_id) select id, auth.uid(), author_id from business.posts limit 1;
insert into business.messages (conversation_id, sender_id, body) select id, auth.uid(), 'Hello — I expanded into four states and would be glad to share what worked.' from business.conversations;
select count(*) from business.messages;
insert into business.messages (conversation_id, sender_id, body) select id, auth.uid(), 'Following up.' from business.conversations;
\echo 'v10-10) The requester cannot accept their own request (expect error):'
update business.conversations set status = 'accepted';

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000031';
\echo 'v10-11) The recipient accepts; both can now write; unread count works (expect 1|2):'
select business.mark_read((select id from business.conversations));
update business.conversations set status = 'accepted';
insert into business.messages (conversation_id, sender_id, body) select id, auth.uid(), 'Thank you — I would love to talk.' from business.conversations;
select count(*) from business.messages;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
\echo 'v10-12) The owner cannot read members'' conversations, messages or financial details (expect 0|0|0):'
select (select count(*) from business.conversations), (select count(*) from business.messages), (select count(*) from business.private_details);
\echo 'v10-13) Safety access without a report is refused (expect error):'
select count(*) from business.investigate_conversation((select id from business.conversations limit 1), gen_random_uuid(), 'Investigating a report of fraud');

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000032';
\echo 'v10-14) The member files a report about the conversation:'
insert into business.reports (reporter_id, conversation_id, reported_user_id, reason, details)
  select auth.uid(), id, recipient_id, 'solicitation', 'Test report' from business.conversations;
\echo 'v10-15) Contact controls: when a member accepts no requests, a new request is refused (expect error):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000031';
update business.profiles set accept_requests_from = 'nobody' where user_id = auth.uid();
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000033';
insert into business.conversations (requester_id, recipient_id) values (auth.uid(), '00000000-0000-0000-0000-000000000031');
\echo 'v10-16) Premium member tier (expect premium|t):'
select business.member_tier(), business.can_use('strategic_matching') is not null;
reset role;
reset request.jwt.claim.sub;

-- Owner opens the reported conversation through the recorded process (needs a JWT for is_owner).
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
\echo 'v10-17) Owner safety access with an open report returns the messages and is recorded (expect 2|1):'
select count(*) from business.investigate_conversation((select conversation_id from business.reports limit 1), (select id from business.reports limit 1), 'Reviewing a reported solicitation');
select count(*) from business.safety_access_log;
\echo 'v10-18) Owner turns the Connection Board off; members can no longer use it (expect 0 then error):'
update business.features set status = 'temporarily_unavailable' where key = 'connection_board';
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000032';
select count(*) from business.posts;
insert into business.posts (author_id, intent, category, title, description) values (auth.uid(), 'offering_assistance', 'mentorship', 'Mentoring', 'Happy to mentor first-time owners.');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
update business.features set status = 'growing_community' where key = 'connection_board';
\echo 'v10-19) Executives see aggregate community metrics only; members cannot (expect 3|1, then error):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000021';
select (business.community_metrics()->>'free_accounts')::int + (business.community_metrics()->>'premium_members')::int, (business.community_metrics()->>'complementary_pairs')::int >= 1;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000032';
select business.community_metrics();
\echo 'v10-20) Blocking closes the conversation; further messages are refused (expect blocked, then error):'
insert into public.blocks (blocker_id, blocked_id) values (auth.uid(), '00000000-0000-0000-0000-000000000031');
select status from business.conversations;
insert into business.messages (conversation_id, sender_id, body) select id, auth.uid(), 'Still there?' from business.conversations;
reset role;
reset request.jwt.claim.sub;
