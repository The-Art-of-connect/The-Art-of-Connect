-- CONNECT 360 screens: the collaboration directory, room participant lists and invitable collaborators reveal only what they should.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f201';
\echo 'v49-1) An Executive member sees members who opted in and welcome requests, never themselves (expect 1|0):'
select count(*) filter (where user_id = '00000000-0000-0000-0000-00000000f202'), count(*) filter (where user_id = auth.uid()) from business.collab_directory();
\echo 'v49-2) The directory returns collaboration fields only (expect interests populated):'
select interests from business.collab_directory() where user_id = '00000000-0000-0000-0000-00000000f202';
\echo 'v49-3) Collaborators the owner may invite: an accepted conversation with a paid member (expect 1):'
select count(*) from business.my_collaborators() where user_id = '00000000-0000-0000-0000-00000000f202';
\echo 'v49-4) A Deal Room participant sees the room''s people (expect t):'
select count(*) > 0 from business.room_people((select id from business.deal_rooms limit 1));
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f205';
\echo 'v49-5) A One Society member gets no directory, and outsiders see no room participants (expect 0|0):'
select (select count(*) from business.collab_directory()), (select count(*) from business.room_people((select id from business.deal_rooms limit 1)));
reset role;
\echo 'v49-6) A member who stops welcoming requests leaves the directory (expect 0):'
update business.profiles set collab_welcome_requests = false where user_id = '00000000-0000-0000-0000-00000000f202';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f201';
select count(*) from business.collab_directory() where user_id = '00000000-0000-0000-0000-00000000f202';
reset role;
reset request.jwt.claim.sub;
