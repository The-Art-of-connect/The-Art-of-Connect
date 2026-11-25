-- Couples moments: invitations need acceptance, plans and surprises stay private.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000051';
\echo 'v17-1) Partner A invites B to dinner, keeping the details a secret (expect 1):'
insert into relationships.date_invitations (id, couple_id, from_user, to_user, kind, title, message, keep_secret, proposed_at, duration_minutes)
values ('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001', auth.uid(), '00000000-0000-0000-0000-000000000052', 'dinner', 'Rooftop dinner at Aria', 'Are you free?', true, '2027-03-10 23:00+00', 180);
select count(*) from relationships.date_invitations;
\echo 'v17-2) A cannot invite someone outside the couple (expect error):'
insert into relationships.date_invitations (couple_id, from_user, to_user, title, proposed_at) values ('30000000-0000-0000-0000-000000000001', auth.uid(), '00000000-0000-0000-0000-000000000053', 'x date', '2027-03-11 23:00+00');
\echo 'v17-3) A cannot accept their own invitation (expect error):'
select relationships.respond_date_invitation('40000000-0000-0000-0000-000000000001', 'accepted');
\echo 'v17-4) A cannot mark it accepted directly (expect permission denied):'
update relationships.date_invitations set status = 'accepted';
\echo 'v17-5) A writes private planning notes (expect 1):'
insert into relationships.date_plans (invitation_id, planner, notes, checklist) values ('40000000-0000-0000-0000-000000000001', auth.uid(), 'Book the corner table; roses on arrival', '[{"t":"Reserve table","done":false}]');
select count(*) from relationships.date_plans;
\echo 'v17-6) A plans a flower surprise for later and one revealed now (expect 2):'
insert into relationships.surprises (couple_id, from_user, kind, title, message, private_notes, reveal_at) values
  ('30000000-0000-0000-0000-000000000001', auth.uid(), 'flowers', 'Peonies', 'Just because.', 'Order from the shop on 5th', now() + interval '3 days'),
  ('30000000-0000-0000-0000-000000000001', auth.uid(), 'love_note', 'A note for you', 'I love how you laugh.', 'secret detail', now() - interval '1 minute');
select count(*) from relationships.surprises;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000052';
\echo 'v17-7) B sees the invitation but not A''s plans or surprises directly (expect 1|0|0):'
select (select count(*) from relationships.date_invitations), (select count(*) from relationships.date_plans), (select count(*) from relationships.surprises);
\echo 'v17-8) B sees only the revealed surprise, and only its title and message (expect A note for you|I love how you laugh.):'
select title || '|' || message from relationships.my_revealed_surprises();
\echo 'v17-9) B accepts; it appears on the shared calendar with details kept secret (expect accepted|Date — details are a surprise):'
select relationships.respond_date_invitation('40000000-0000-0000-0000-000000000001', 'accepted', 'Yes!');
select i.status || '|' || e.title from relationships.date_invitations i join relationships.couple_events e on e.id = i.event_id;
\echo 'v17-10) Answering twice is refused (expect error):'
select relationships.respond_date_invitation('40000000-0000-0000-0000-000000000001', 'declined');
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000051';
\echo 'v17-11) An invitation over B''s private busy time can be sent, but acceptance is refused without revealing why (expect error):'
insert into relationships.date_invitations (id, couple_id, from_user, to_user, title, proposed_at) values ('40000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001', auth.uid(), '00000000-0000-0000-0000-000000000052', 'Lunch date', '2027-03-05 16:00+00');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000052';
select relationships.respond_date_invitation('40000000-0000-0000-0000-000000000002', 'accepted');
\echo 'v17-12) B suggests another time instead (expect new_time):'
select relationships.respond_date_invitation('40000000-0000-0000-0000-000000000002', 'new_time', 'How about Saturday?', '2027-03-06 18:00+00');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000053';
\echo 'v17-13) Someone outside the couple sees nothing (expect 0|0|0|0):'
select (select count(*) from relationships.date_invitations), (select count(*) from relationships.date_plans), (select count(*) from relationships.surprises), (select count(*) from relationships.my_revealed_surprises());
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
\echo 'v17-14) The OWNER cannot read plans or surprises (expect 0|0):'
select (select count(*) from relationships.date_plans), (select count(*) from relationships.surprises);
reset role;
reset request.jwt.claim.sub;
