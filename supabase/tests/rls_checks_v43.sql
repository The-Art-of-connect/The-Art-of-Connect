-- The Becoming Circle (phase one) and the Safety Shield.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
insert into public.test_signups (email) values ('circ-free@example.com'), ('circ-mod@example.com'), ('circ-other@example.com');
insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000d001', 'circ-free@example.com', '{"date_of_birth":"1980-01-01"}'),
  ('00000000-0000-0000-0000-00000000d002', 'circ-mod@example.com', '{"date_of_birth":"1980-01-01"}'),
  ('00000000-0000-0000-0000-00000000d003', 'circ-other@example.com', '{"date_of_birth":"1980-01-01"}');
insert into public.circle_moderators (user_id, status, training_completed_at) values ('00000000-0000-0000-0000-00000000d002', 'authorized', now());
\echo 'v43-1) Starter topics are drafts awaiting the owner (expect t):'
select count(*) >= 30 from public.circle_topics where source = 'peace' and status = 'draft';
-- The owner approves two topics for the pool (as the service, standing in for the owner's approval in this test).
update public.circle_topics set status = 'approved' where id in (select id from public.circle_topics where source = 'peace' order by title limit 2);
\echo 'v43-2) Approved topics fill the coming four-hour slots automatically (expect 2, then t):'
select public.circle_fill_slots();
select bool_and(extract(epoch from slot_start)::bigint % 14400 = 0) from public.circle_topics where status = 'scheduled';
-- Make one scheduled topic current for the tests.
update public.circle_topics set slot_start = to_timestamp(floor(extract(epoch from now()) / 14400) * 14400) - interval '4 hours'
  where id = (select id from public.circle_topics where status = 'scheduled' order by slot_start limit 1);
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000d001';
\echo 'v43-3) A free member sees scheduled topics but never drafts (expect 2|0):'
select (select count(*) from public.circle_topics where status = 'scheduled') || '|' || (select count(*) from public.circle_topics where status = 'draft');
\echo 'v43-4) A free member can share a perspective in The Becoming Circle (expect 1):'
insert into public.circle_posts (topic_id, author_id, body) select id, '00000000-0000-0000-0000-00000000d001', 'Growing together takes honest conversations.' from public.circle_topics where status = 'scheduled' and slot_start <= now();
select count(*) from public.circle_posts where author_id = '00000000-0000-0000-0000-00000000d001';
\echo 'v43-5) Posting again within 20 seconds is refused (expect error):'
insert into public.circle_posts (topic_id, author_id, body) select id, '00000000-0000-0000-0000-00000000d001', 'Another thought' from public.circle_topics where status = 'scheduled' and slot_start <= now();
\echo 'v43-6) A discussion that has not begun yet is not open (expect error):'
insert into public.circle_posts (topic_id, author_id, body) select id, '00000000-0000-0000-0000-00000000d001', 'Early' from public.circle_topics where status = 'scheduled' and slot_start > now() limit 1;
\echo 'v43-7) A member cannot approve topics or use moderator actions (expect 0, then error):'
with u as (update public.circle_topics set status = 'approved' where status = 'draft' returning 1) select count(*) from u;
select public.circle_moderate('pause', (select id from public.circle_topics where status = 'scheduled' and slot_start <= now()));
reset role;
\echo 'v43-8) The Safety Shield refuses personal information, even if the page is bypassed (expect phone, email, ssn, card, then allowed):'
delete from public.circle_posts;
select public.shield_findings('Call me at (404) 555-1212');
select public.shield_findings('write to jane.doe@gmail.com');
select public.shield_findings('my number is 123-45-6789');
select public.shield_findings('card 4242 4242 4242 4242');
select cardinality(public.shield_findings('Visit theartofconnect.com for details')) = 0;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000d003';
\echo 'v43-9) A comment with a phone number is blocked (expect SAFETY_SHIELD error):'
insert into public.circle_posts (topic_id, author_id, body) select id, '00000000-0000-0000-0000-00000000d003', 'Text me 404-555-1212' from public.circle_topics where status = 'scheduled' and slot_start <= now();
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000d002';
\echo 'v43-10) A moderator removes a participant; the action is recorded (expect ok, then 1):'
select public.circle_moderate('remove_user', (select id from public.circle_topics where status = 'scheduled' and slot_start <= now()), null, '00000000-0000-0000-0000-00000000d003', 'Repeated disrespect');
select count(*) from public.circle_mod_log where action = 'remove_user';
\echo 'v43-11) A moderator creates a poll (expect 1):'
insert into public.circle_polls (topic_id, question, options, created_by) select id, 'Have you grown in a new direction this year?', array['Yes', 'Not yet', 'Unsure'], '00000000-0000-0000-0000-00000000d002' from public.circle_topics where status = 'scheduled' and slot_start <= now();
select count(*) from public.circle_polls;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000d003';
\echo 'v43-12) A removed participant cannot post in that discussion (expect error):'
insert into public.circle_posts (topic_id, author_id, body) select id, '00000000-0000-0000-0000-00000000d003', 'I am back' from public.circle_topics where status = 'scheduled' and slot_start <= now();
\echo 'v43-13) Poll votes are counted without revealing voters (expect 1|0):'
insert into public.circle_poll_votes (poll_id, user_id, option_index) select id, '00000000-0000-0000-0000-00000000d003', 0 from public.circle_polls;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000d001';
select (select votes from public.circle_poll_results((select id from public.circle_polls)) where option_index = 0) || '|' || (select count(*) from public.circle_poll_votes);
\echo 'v43-14) Members cannot read the moderation history (expect 0):'
select count(*) from public.circle_mod_log;
\echo 'v43-15) Who Am I Becoming? is private (expect 1, then 0):'
insert into public.becoming_goals (user_id, horizon, area, title) values ('00000000-0000-0000-0000-00000000d001', '5y', 'business', 'Open my studio');
select count(*) from public.becoming_goals;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000d003';
select count(*) from public.becoming_goals;
reset role;
reset request.jwt.claim.sub;
