-- Social Ecosystem phase 1: privacy and consent are enforced by the database.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
insert into public.test_signups (email) values ('soc-a@example.com'), ('soc-b@example.com'), ('soc-c@example.com');
insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000a001', 'soc-a@example.com', '{"date_of_birth":"1985-01-01"}'),
  ('00000000-0000-0000-0000-00000000a002', 'soc-b@example.com', '{"date_of_birth":"1986-01-01"}'),
  ('00000000-0000-0000-0000-00000000a003', 'soc-c@example.com', '{"date_of_birth":"1987-01-01"}');
-- Membership access v2: the social ecosystem needs a paid membership or trial.
insert into public.experience_access (user_id, experience, status, source) values
  ('00000000-0000-0000-0000-00000000a001', 'business', 'active', 'subscription'), ('00000000-0000-0000-0000-00000000a002', 'business', 'active', 'subscription'), ('00000000-0000-0000-0000-00000000a003', 'business', 'active', 'subscription')
  on conflict (user_id, experience) do update set status = 'active', source = 'subscription';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a001';
insert into public.social_profiles (user_id, headline, city, show_location, interests, seeking, discoverable) values ('00000000-0000-0000-0000-00000000a001', 'Founder', 'Atlanta', false, array['travel','business'], array['friendship','travel'], true);
\echo 'v38-1) Location stays hidden unless the member chooses to show it (expect Founder|null):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a002';
insert into public.social_profiles (user_id, interests, seeking, discoverable) values ('00000000-0000-0000-0000-00000000a002', array['travel'], array['travel'], true);
select headline, coalesce(city, 'null') from public.social_directory(null, 'travel', 10) where user_id = '00000000-0000-0000-0000-00000000a001';
\echo 'v38-2) Connections never carry romance (expect error):'
insert into public.social_connections (requester_id, addressee_id, intention) values ('00000000-0000-0000-0000-00000000a002', '00000000-0000-0000-0000-00000000a001', 'romance');
\echo 'v38-3) A member cannot accept their own request (expect 0 rows changed):'
insert into public.social_connections (requester_id, addressee_id, intention) values ('00000000-0000-0000-0000-00000000a002', '00000000-0000-0000-0000-00000000a001', 'travel');
with u as (update public.social_connections set status = 'accepted' returning 1) select count(*) from u;
\echo 'v38-4) Messaging requires an accepted connection (expect error):'
select public.social_start_conversation(array['00000000-0000-0000-0000-00000000a001'::uuid]);
\echo 'v38-5) A connections-only post is hidden from someone not connected (expect 0):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a001';
insert into public.social_posts (author_id, body, audience) values ('00000000-0000-0000-0000-00000000a001', 'Just for my connections', 'connections');
insert into public.social_posts (author_id, body, audience) values ('00000000-0000-0000-0000-00000000a001', 'Hello members', 'members');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a002';
select count(*) from public.social_posts where body = 'Just for my connections';
\echo 'v38-6) After the member accepts, it becomes visible and messaging opens (expect 1|t):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a001';
update public.social_connections set status = 'accepted', responded_at = now() where addressee_id = '00000000-0000-0000-0000-00000000a001';
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a002';
select count(*), public.social_start_conversation(array['00000000-0000-0000-0000-00000000a001'::uuid]) is not null from public.social_posts where body = 'Just for my connections';
\echo 'v38-7) Someone outside the conversation cannot read it (expect 0):'
insert into public.social_messages (conversation_id, sender_id, body) select conversation_id, '00000000-0000-0000-0000-00000000a002', 'Private hello' from public.social_conversation_members where user_id = '00000000-0000-0000-0000-00000000a002' limit 1;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a003';
select count(*) from public.social_messages;
\echo 'v38-8) Couples circles are for couples only (expect error):'
insert into public.social_circle_members (circle_id, user_id) select id, '00000000-0000-0000-0000-00000000a003' from public.social_circles where slug = 'couples-travel';
\echo 'v38-9) Anyone eligible may join an open circle, and circle posts stay inside it (expect 1|0, then 0):'
insert into public.social_circle_members (circle_id, user_id) select id, '00000000-0000-0000-0000-00000000a003' from public.social_circles where slug = 'world-explorers';
insert into public.social_posts (author_id, body, audience, circle_id) select '00000000-0000-0000-0000-00000000a003', 'Explorers only', 'circle', id from public.social_circles where slug = 'world-explorers';
select (select count(*) from public.social_posts where body = 'Explorers only'), 0;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a002';
select count(*) from public.social_posts where body = 'Explorers only';
\echo 'v38-10) A member cannot make themselves a circle host (expect permission error):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a003';
update public.social_circle_members set role = 'host';
\echo 'v38-11) A blocked member no longer sees the blocker''s posts (expect 0):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a001';
insert into public.blocks (blocker_id, blocked_id) values ('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-00000000a003');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a003';
select count(*) from public.social_posts where author_id = '00000000-0000-0000-0000-00000000a001';
\echo 'v38-12) Event attendance is private unless the member shows it (expect 1, then 0):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a002';
insert into public.social_events (id, created_by, origin, title, category, starts_at, organizer_name) values ('00000000-0000-0000-0000-00000000e501', '00000000-0000-0000-0000-00000000a002', 'shared_external', 'Entrepreneurs After Hours', 'business_networking', now() + interval '7 days', 'Atlanta Chamber');
insert into public.social_event_rsvps (event_id, user_id, status) values ('00000000-0000-0000-0000-00000000e501', '00000000-0000-0000-0000-00000000a002', 'attending');
select count(*) from public.social_event_rsvps;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a001';
select count(*) from public.social_event_rsvps;
\echo 'v38-13) Listings that ask for direct payment are flagged automatically (expect 1):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a002';
insert into public.social_events (created_by, origin, title, description, category, starts_at) values ('00000000-0000-0000-0000-00000000a002', 'member_organized', 'Yacht party', 'Send money by Cash App to hold your spot', 'social', now() + interval '3 days');
reset role;
reset request.jwt.claim.sub;
select count(*) from public.social_reports where automatic and reason = 'fraud';
\echo 'v38-14) Private photographs stay private (expect 0):'
insert into public.social_photos (user_id, path, visibility) values ('00000000-0000-0000-0000-00000000a001', 'u/00000000-0000-0000-0000-00000000a001/private-photo.jpg', 'private');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a002';
select count(*) from public.social_photos;
\echo 'v38-15) Members cannot create official events (expect error):'
insert into public.social_events (created_by, origin, title, category, starts_at) values ('00000000-0000-0000-0000-00000000a002', 'official', 'Fake official', 'social', now() + interval '3 days');
reset role;
reset request.jwt.claim.sub;
\echo 'v38-16) Anonymous visitors see nothing (expect permission error):'
set role anon;
select count(*) from public.social_posts;
reset role;
\echo 'v38-17) Luxury and lifestyle circles are open to every member, regardless of income (expect 1):'
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a002';
insert into public.social_circle_members (circle_id, user_id) select id, '00000000-0000-0000-0000-00000000a002' from public.social_circles where slug = 'luxury-travel';
select count(*) from public.social_circle_members where user_id = '00000000-0000-0000-0000-00000000a002';
\echo 'v38-18) Only designated Elite circles require verified Elite membership (expect error):'
insert into public.social_circle_members (circle_id, user_id) select id, '00000000-0000-0000-0000-00000000a002' from public.social_circles where slug = 'elite-travel';
\echo 'v38-19) Connection preferences are private to the member (expect 1, then 0):'
insert into public.social_preferences (user_id, answers) values ('00000000-0000-0000-0000-00000000a002', '{"travel_style":"luxury"}');
select count(*) from public.social_preferences;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a001';
select count(*) from public.social_preferences;
\echo 'v38-20) Every non-Elite circle is open to all eligible members: no circle limits ordinary members by income (expect 0):'
reset role;
reset request.jwt.claim.sub;
select count(*) from public.social_circles where kind <> 'elite' and eligibility = 'elite';
