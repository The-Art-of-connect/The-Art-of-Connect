-- In Love (directive 38): discovery, interest, mutual messaging, couples check-ins and the Singles-to-Couples transition.
reset role;
reset request.jwt.claim.sub;
update public.platform_settings set value = 'true'::jsonb where key = 'relationships_live';
insert into public.test_signups (email) values ('v55-a@example.com'), ('v55-b@example.com'), ('v55-c@example.com'), ('v55-d@example.com'), ('v55-e@example.com');
insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000f551', 'v55-a@example.com', '{"date_of_birth":"1975-01-01","display_name":"Avery Test"}'),
  ('00000000-0000-0000-0000-00000000f552', 'v55-b@example.com', '{"date_of_birth":"1974-01-01","display_name":"Blake Test"}'),
  ('00000000-0000-0000-0000-00000000f553', 'v55-c@example.com', '{"date_of_birth":"1973-01-01","display_name":"Casey Test"}'),
  ('00000000-0000-0000-0000-00000000f554', 'v55-d@example.com', '{"date_of_birth":"1972-01-01","display_name":"Drew Test"}'),
  ('00000000-0000-0000-0000-00000000f555', 'v55-e@example.com', '{"date_of_birth":"1971-01-01","display_name":"Emery Test"}');
insert into public.experience_access (user_id, experience, status, source)
  select id, 'relationships', 'active', 'comp' from auth.users where email like 'v55-%@example.com';
insert into relationships.profiles (user_id, headline, city, relationship_intent, is_visible, track, birth_year) values
  ('00000000-0000-0000-0000-00000000f551', 'Fictional A', 'Charlotte', 'long_term', true, 'single', 1975),
  ('00000000-0000-0000-0000-00000000f552', 'Fictional B', 'Charlotte', 'long_term', true, 'single', 1974),
  ('00000000-0000-0000-0000-00000000f553', 'Fictional C', 'Atlanta', 'marriage', false, 'single', 1973),
  ('00000000-0000-0000-0000-00000000f554', 'Fictional D', 'Charlotte', 'long_term', true, 'single', 1972),
  ('00000000-0000-0000-0000-00000000f555', 'Fictional E', 'Charlotte', 'long_term', true, 'single', 1971);
-- Matchmaking requires identity verification (owner setting): A, B and D are verified; E is not.
update public.profiles set identity_verified_at = now() where id in ('00000000-0000-0000-0000-00000000f551', '00000000-0000-0000-0000-00000000f552', '00000000-0000-0000-0000-00000000f554');
insert into public.blocks (blocker_id, blocked_id) values ('00000000-0000-0000-0000-00000000f554', '00000000-0000-0000-0000-00000000f551');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f551';
\echo 'v55-1) Discover shows visible, identity-verified singles only, never hidden, blocked or unverified members (expect Blake|You want the same kind of relationship,You live in the same city):'
select first_name, array_to_string(reasons, ',') from relationships.discover() where user_id::text like '00000000-0000-0000-0000-00000000f55%';
\echo 'v55-2) Expressing interest (expect 1):'
insert into relationships.connections (requester_id, recipient_id) values (auth.uid(), '00000000-0000-0000-0000-00000000f552');
select count(*) from relationships.connections where requester_id = auth.uid();
\echo 'v55-3) Once interest is expressed, that member leaves Discover (expect 0):'
select count(*) from relationships.discover() where user_id::text like '00000000-0000-0000-0000-00000000f55%';
\echo 'v55-4) No messaging before both accept (expect error):'
select relationships.start_love_conversation('00000000-0000-0000-0000-00000000f552');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f552';
\echo 'v55-5) The recipient sees the interest with a first name only (expect Avery|pending|received):'
select first_name, status, direction from relationships.my_connections();
update relationships.connections set status = 'accepted' where recipient_id = auth.uid();
\echo 'v55-6) Mutual connections can open a private conversation, and reopening returns the same one (expect t):'
select relationships.start_love_conversation('00000000-0000-0000-0000-00000000f551') = relationships.start_love_conversation('00000000-0000-0000-0000-00000000f551');
\echo 'v55-7) Becoming a couple requires an accepted Exclusive Connection first (expect error):'
select relationships.become_couple('00000000-0000-0000-0000-00000000f551');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f551';
select relationships.request_exclusive('00000000-0000-0000-0000-00000000f552') is not null;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f552';
select relationships.respond_exclusive((select id from relationships.exclusive_requests where recipient_id = auth.uid()), true);
\echo 'v55-8) One partner choosing waits for the other (expect waiting):'
select relationships.become_couple('00000000-0000-0000-0000-00000000f551');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f551';
\echo 'v55-9) Both choosing opens the shared couple space and pauses Singles discovery (expect couple|2|couple|f):'
select relationships.become_couple('00000000-0000-0000-0000-00000000f552');
select (select count(*) from relationships.couple_members), (select track from relationships.profiles where user_id = auth.uid()), (select is_visible from relationships.profiles where user_id = auth.uid());
\echo 'v55-10) Private check-ins stay private; shared ones reach the partner (expect 1):'
insert into relationships.couple_checkins (couple_id, user_id, mood, note, shared) select couple_id, auth.uid(), 'grateful', 'Fictional private note', false from relationships.couple_members where user_id = auth.uid();
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f552';
insert into relationships.couple_checkins (couple_id, user_id, mood, note, shared) select couple_id, auth.uid(), 'connected', 'Fictional shared note', true from relationships.couple_members where user_id = auth.uid();
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f551';
select count(*) from relationships.couple_checkins where user_id <> auth.uid();
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f552';
\echo 'v55-11) The partner never sees the private one (expect 0):'
select count(*) from relationships.couple_checkins where user_id <> auth.uid();
reset role;
reset request.jwt.claim.sub;
select couple_id as v55_couple from relationships.couple_members where user_id = '00000000-0000-0000-0000-00000000f551' \gset
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f553';
\echo 'v55-12) Someone outside the couple sees no check-ins (expect 0):'
select count(*) from relationships.couple_checkins;
\echo 'v55-13) Nor can they write into the couple (expect error):'
insert into relationships.couple_checkins (couple_id, user_id, mood) values (:'v55_couple', auth.uid(), 'calm');
reset role;
reset request.jwt.claim.sub;
