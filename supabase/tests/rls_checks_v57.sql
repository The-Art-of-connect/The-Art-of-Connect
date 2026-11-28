-- Live Q&A (directive 43): owner schedule, distinct topics, one invitation per session, preferences, attendance.
reset role;
reset request.jwt.claim.sub;
insert into public.test_signups (email) values ('v57-a@example.com'), ('v57-b@example.com');
insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000f571', 'v57-a@example.com', '{"date_of_birth":"1975-01-01","display_name":"Ada Test"}'),
  ('00000000-0000-0000-0000-00000000f572', 'v57-b@example.com', '{"date_of_birth":"1975-01-01","display_name":"Bo Test"}');
insert into public.notification_prefs (user_id, live_qa_popup, live_qa_message) values ('00000000-0000-0000-0000-00000000f572', false, true);
insert into public.circle_topics (title, prompt, category, room, status, source, mode, open_hours) values
  ('Understanding Your Worth', 'What does knowing your worth look like in everyday choices?', 'personal-development', 'becoming', 'approved', 'owner', 'text', 4),
  ('Boundaries with Kindness', 'How do you say no without guilt, and with care for the other person?', 'communication-ei', 'becoming', 'approved', 'owner', 'text', 4);
-- Two sessions a day, the first started ten minutes ago (UTC for a predictable test).
update public.circle_live_settings set timezone = 'UTC', start_times = array[to_char(now() at time zone 'UTC' - interval '10 minutes', 'HH24:MI'), to_char(now() at time zone 'UTC' + interval '6 hours', 'HH24:MI')];
\echo 'v57-1) The schedule creates the owner-chosen number of sessions per day, each with a distinct topic (expect t|t):'
select public.circle_live_tick() >= 2, (select count(distinct c.title) = count(*) from public.circle_live_sessions l join public.circle_topics c on c.id = l.topic_id where l.starts_at::date = (now() at time zone 'UTC')::date);
\echo 'v57-2) Running it again never duplicates sessions (expect 0):'
select public.circle_live_tick();
\echo 'v57-3) The started session is live and each member got one Message Center invitation (expect 1|t):'
select count(*), bool_and(n.href like '/app/circle/%') from public.member_notices n where n.user_id = '00000000-0000-0000-0000-00000000f571' and n.kind = 'live_qa';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f571';
\echo 'v57-4) The member sees the pop-up invitation while live (expect 1):'
select count(*) from public.live_invitation();
update public.member_notices set popup_seen_at = now() where user_id = auth.uid() and kind = 'live_qa';
\echo 'v57-5) After Maybe later it never shows again for that session (expect 0):'
select count(*) from public.live_invitation();
\echo 'v57-6) Joining records attendance; listening is allowed (expect 1):'
insert into public.circle_live_attendance (session_id, user_id, mode) select id, auth.uid(), 'listen' from public.circle_live_sessions where status = 'live';
select count(*) from public.circle_live_attendance where user_id = auth.uid();
\echo 'v57-7) Members cannot change the schedule (expect 0 rows changed):'
update public.circle_live_settings set start_times = '{01:00}';
select count(*) from public.circle_live_settings where start_times = '{01:00}';
\echo 'v57-8) Nor record attendance for someone else (expect error):'
insert into public.circle_live_attendance (session_id, user_id) select id, '00000000-0000-0000-0000-00000000f572' from public.circle_live_sessions where status = 'live';
\echo 'v57-9) Nor read anyone else''s Message Center (expect 0):'
select count(*) from public.member_notices where user_id <> auth.uid();
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f572';
\echo 'v57-10) A member who turned pop-ups off still has the Message Center invitation, but no pop-up (expect 1|0):'
select (select count(*) from public.member_notices where user_id = auth.uid() and kind = 'live_qa'), (select count(*) from public.live_invitation());
reset role;
reset request.jwt.claim.sub;
\echo 'v57-11) Live audio cannot be switched on without an approved provider (expect error):'
update public.circle_live_settings set live_audio_enabled = true;
select 1 from public.circle_live_settings where live_audio_enabled;
