-- Business development suite (directives 27–29): collaboration requests, regulated-activity guard, Deal Rooms, per-party advisors,
-- Attorney Review Center, nonbinding proposals and funding categories. All people, companies and amounts are fictional.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
insert into public.test_signups (email) values ('bd-a@example.com'), ('bd-b@example.com'), ('bd-atty-a@example.com'), ('bd-atty-b@example.com'), ('bd-one@example.com');
insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000f201', 'bd-a@example.com', '{"date_of_birth":"1972-01-01"}'),
  ('00000000-0000-0000-0000-00000000f202', 'bd-b@example.com', '{"date_of_birth":"1970-01-01"}'),
  ('00000000-0000-0000-0000-00000000f203', 'bd-atty-a@example.com', '{"date_of_birth":"1965-01-01"}'),
  ('00000000-0000-0000-0000-00000000f204', 'bd-atty-b@example.com', '{"date_of_birth":"1966-01-01"}'),
  ('00000000-0000-0000-0000-00000000f205', 'bd-one@example.com', '{"date_of_birth":"1980-01-01"}');
insert into public.subscriptions (user_id, status, kind, tier_slug, tier_name, experiences, stripe_subscription_id) values
  ('00000000-0000-0000-0000-00000000f201', 'active', 'member', 'executive-private', 'Executive Private', '{business,relationships}', 'sub_test_bd_a'),
  ('00000000-0000-0000-0000-00000000f202', 'active', 'member', 'executive-private', 'Executive Private', '{business,relationships}', 'sub_test_bd_b'),
  ('00000000-0000-0000-0000-00000000f205', 'active', 'member', 'professional-society', 'The Professional Society', '{business}', 'sub_test_bd_one');
insert into public.experience_access (user_id, experience, source) values
  ('00000000-0000-0000-0000-00000000f201', 'business', 'subscription'), ('00000000-0000-0000-0000-00000000f202', 'business', 'subscription'),
  ('00000000-0000-0000-0000-00000000f205', 'business', 'subscription')
on conflict do nothing;
insert into business.profiles (user_id, company, state) values
  ('00000000-0000-0000-0000-00000000f201', 'Fictional Harbor Logistics', 'GA'), ('00000000-0000-0000-0000-00000000f202', 'Fictional Summit Foods', 'AL'),
  ('00000000-0000-0000-0000-00000000f205', 'Fictional Corner Studio', 'TX')
on conflict (user_id) do nothing;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f202';
update business.profiles set collab_opt_in = true, collab_welcome_requests = true, collab_interests = '{operational_partnership,expansion}' where user_id = auth.uid();

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f201';
\echo 'v46-1) Investor solicitation in a collaboration request is restricted (expect REGULATED_ACTIVITY error):'
insert into business.conversations (requester_id, recipient_id, kind, purpose, project, reason)
  values (auth.uid(), '00000000-0000-0000-0000-00000000f202', 'collaboration', 'expansion', 'Fictional regional distribution expansion project.', 'We are seeking investors for this expansion.');
\echo 'v46-2) A purpose-specific collaboration request is sent (expect 1):'
insert into business.conversations (requester_id, recipient_id, kind, purpose, project, reason)
  values (auth.uid(), '00000000-0000-0000-0000-00000000f202', 'collaboration', 'operational_partnership', 'Fictional regional distribution expansion project.', 'Your food production experience complements our logistics network.');
select count(*) from business.conversations where kind = 'collaboration';
\echo 'v46-3) Personal contact details are blocked before mutual acceptance (expect SAFETY_SHIELD error):'
insert into business.messages (conversation_id, sender_id, body) select id, auth.uid(), 'Call me at 404-555-1212.' from business.conversations where kind = 'collaboration';

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f202';
\echo 'v46-4) The recipient asks for more information, then accepts to discuss (expect accepted):'
update business.conversations set status = 'more_info' where kind = 'collaboration';
update business.conversations set status = 'accepted' where kind = 'collaboration';
select status from business.conversations where kind = 'collaboration';

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f201';
\echo 'v46-5) Guaranteed returns are always prohibited, even after acceptance (expect REGULATED_ACTIVITY error):'
insert into business.messages (conversation_id, sender_id, body) select id, auth.uid(), 'This deal has guaranteed returns of 20%.' from business.conversations where kind = 'collaboration';
\echo 'v46-6) Bank account numbers stay blocked after acceptance (expect SAFETY_SHIELD error):'
insert into business.messages (conversation_id, sender_id, body) select id, auth.uid(), 'Our account number 123456789 is ready.' from business.conversations where kind = 'collaboration';
\echo 'v46-7) Seller financing education and partnership discussion are allowed (expect 1):'
insert into business.messages (conversation_id, sender_id, body) select id, auth.uid(), 'Could we review seller financing education and an operational partnership outline?' from business.conversations where kind = 'collaboration';
select count(*) from business.messages m join business.conversations c on c.id = m.conversation_id where c.kind = 'collaboration';

\echo 'v46-8) Executive member opens a Deal Room and invites their accepted collaborator (expect 2):'
insert into business.deal_rooms (owner_id, title, objective) values (auth.uid(), 'Fictional Harbor & Summit expansion', 'Explore a fictional distribution collaboration.');
insert into business.room_participants (room_id, user_id, role) select id, '00000000-0000-0000-0000-00000000f202', 'principal' from business.deal_rooms;
select count(*) from business.room_participants;
\echo 'v46-9) Each principal invites their own attorney with a one-time link:'
insert into business.advisor_invites (room_id, client_id, advisor_type, advisor_name, advisor_email, token_hash)
  select id, auth.uid(), 'attorney', 'Fictional Counsel A', 'counsel-a@example.com', '069d480b8864556c7b1228438ffb6533bf369a1747c0008cab3b161312d4e72d' from business.deal_rooms;
insert into business.room_documents (room_id, space, space_owner, uploaded_by, category, title, privileged)
  select id, 'private', auth.uid(), auth.uid(), 'attorney_correspondence', 'Fictional privileged memo', true from business.deal_rooms;
insert into business.room_documents (room_id, uploaded_by, category, title) select id, auth.uid(), 'letter_of_intent', 'Fictional discussion LOI draft' from business.deal_rooms;
insert into business.document_versions (document_id, file_name, mime_type, size_bytes, sha256, uploaded_by)
  select id, 'memo.pdf', 'application/pdf', 1024, repeat('a', 64), auth.uid() from business.room_documents where privileged;
insert into business.document_versions (document_id, file_name, mime_type, size_bytes, sha256, uploaded_by)
  select id, 'loi.pdf', 'application/pdf', 2048, repeat('b', 64), auth.uid() from business.room_documents where not privileged;

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f202';
update business.room_participants set status = 'active' where user_id = auth.uid();
insert into business.advisor_invites (room_id, client_id, advisor_type, advisor_name, advisor_email, token_hash)
  select id, auth.uid(), 'attorney', 'Fictional Counsel B', 'counsel-b@example.com', 'c87ca4afbef2327cda94ba14eb339e1725d10b6ce7da51020e63763281c6b0cc' from business.deal_rooms;
\echo 'v46-10) The other principal sees the shared document but not the privileged memo (expect 1|0):'
select count(*) filter (where not privileged), count(*) filter (where privileged) from business.room_documents;
\echo 'v46-11) A non-attorney cannot record a review decision (expect error):'
insert into business.document_reviews (document_id, version, author_id, kind) select id, 1, auth.uid(), 'reviewed' from business.room_documents where not privileged;

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f203';
\echo 'v46-12) Attorney A joins without a membership and sees both of A''s documents; attorney B''s link is not theirs (expect 2):'
select business.accept_advisor_invite('tok-bd-a') is not null;
select count(*) from business.room_documents;
\echo 'v46-13) Attorney A marks the memo as an authorized final document (expect final_authorized):'
insert into business.document_reviews (document_id, version, author_id, kind, note) select id, 1, auth.uid(), 'final_authorized', 'Fictional review complete.' from business.room_documents where privileged;
select review_status from business.room_documents where privileged;

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f204';
select business.accept_advisor_invite('tok-bd-b') is not null;
\echo 'v46-14) Attorney B (the other party''s counsel) never sees A''s privileged memo (expect 1|0):'
select count(*) filter (where not privileged), count(*) filter (where privileged) from business.room_documents;

reset role;
\echo 'v46-15) Journey and other automated processes cannot record a review (expect error):'
insert into business.document_reviews (document_id, version, author_id, kind) select id, 1, '00000000-0000-0000-0000-00000000f203', 'reviewed' from business.room_documents where not privileged;
set role authenticated;

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f201';
\echo 'v46-16) Proposals are nonbinding by construction (expect error):'
insert into business.proposals (author_id, room_id, title) select auth.uid(), id, 'Fictional distribution collaboration proposal' from business.deal_rooms;
insert into business.proposal_versions (proposal_id, version, author_id, summary, sections)
  select id, 1, auth.uid(), 'Fictional summary for discussion.', '{"executive_summary": {"text": "A fictional discussion outline.", "basis": "proposed"}}' from business.proposals;
update business.proposal_versions set binding = true;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f202';
\echo 'v46-17) The other principal cannot see a draft (expect 0):'
select count(*) from business.proposal_versions;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f201';
update business.proposal_versions set status = 'authorized';
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f202';
\echo 'v46-18) After authorization they see it and can accept a discussion, but there is no "agree" response (expect 1, then error):'
select count(*) from business.proposal_versions;
insert into business.proposal_responses (proposal_id, version, responder_id, kind) select id, 1, auth.uid(), 'accept_discussion' from business.proposals;
insert into business.proposal_responses (proposal_id, version, responder_id, kind) select id, 1, auth.uid(), 'agree' from business.proposals;

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f201';
\echo 'v46-19) Declared funds are recorded, never verified by the member (expect recorded, then error):'
insert into business.funding_projects (user_id, title, kind) values (auth.uid(), 'Fictional warehouse expansion', 'expansion');
insert into business.funding_positions (user_id, project_id, category, amount_cents, method) select auth.uid(), id, 'declared', 25000000, 'self_reported' from business.funding_projects;
select status from business.funding_positions;
update business.funding_positions set status = 'verified';
\echo 'v46-20) Financing cannot be marked approved without the lender''s letter (expect error):'
insert into business.funding_applications (project_id, user_id, provider_name, status) select id, auth.uid(), 'Fictional Community Bank', 'approved' from business.funding_projects;

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f202';
\echo 'v46-21) When a principal withdraws, their advisor leaves and their shared funding information is revoked (expect 0|removed):'
insert into business.funding_positions (user_id, category, amount_cents, method) values (auth.uid(), 'declared', 5000000, 'self_reported');
insert into business.room_funding_shares (room_id, position_id, shared_by) select r.id, p.id, auth.uid() from business.deal_rooms r, business.funding_positions p;
update business.room_participants set status = 'withdrawn' where user_id = auth.uid();
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f201';
select (select count(*) from business.funding_positions where user_id <> auth.uid()),
       (select status from business.room_participants where user_id = '00000000-0000-0000-0000-00000000f204');

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f205';
\echo 'v46-22) One Society members cannot open Deal Rooms (expect error):'
insert into business.deal_rooms (owner_id, title) values (auth.uid(), 'Fictional studio room');

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
\echo 'v46-23) The owner sees counts, never Deal Room documents, messages or proposals (expect 1|0|0):'
select (business.suite_metrics() ->> 'deal_rooms_active')::int, (select count(*) from business.room_documents), (select count(*) from business.proposals);
\echo 'v46-24) A restriction cannot be lifted without a recorded legal review (expect error):'
update business.regulated_restrictions set restricted = false where key = 'lending';
reset role;
reset request.jwt.claim.sub;
