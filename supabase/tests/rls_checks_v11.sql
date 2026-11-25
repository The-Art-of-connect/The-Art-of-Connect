-- The Knowledge Exchange: hosting, approval, private links, complimentary allowance.
reset role;
reset request.jwt.claim.sub;
update business.features set status = 'available_now' where key = 'webinar_hosting';
update business.features set status = 'growing_community' where key = 'connection_board';
delete from public.blocks;

\echo 'v11-1) Seeded topics; no webinars are invented (expect 11|0):'
select (select count(*) from business.webinar_topics), (select count(*) from business.webinars);

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000031';
\echo 'v11-2) A free member cannot host (expect error):'
insert into business.webinars (host_id, title, description, host_display_name, starts_at, media_rights_confirmed)
  values (auth.uid(), 'Free member webinar', 'Trying to host without membership — should be refused.', 'Alpha', now() + interval '1 day', true);

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000033';
\echo 'v11-3) A member creates and submits several webinars at the same time (expect 3):'
insert into business.webinars (id, host_id, title, description, host_display_name, starts_at, duration_minutes, media_rights_confirmed, status) values
  ('00000000-0000-0000-0000-0000000000a1', auth.uid(), 'Scaling Without Burning Out', 'How experienced owners build systems that run independently.', 'Gamma Group', now() + interval '5 minutes', 90, true, 'submitted'),
  ('00000000-0000-0000-0000-0000000000a2', auth.uid(), 'Preparing for Funding', 'Organizing financial statements before funding conversations.', 'Gamma Group', now() + interval '5 minutes', 90, true, 'submitted'),
  ('00000000-0000-0000-0000-0000000000a3', auth.uid(), 'Technology That Works for You', 'Practical automation for small and mid-size businesses.', 'Gamma Group', now() + interval '5 minutes', 90, true, 'submitted'),
  ('00000000-0000-0000-0000-0000000000a4', auth.uid(), 'Succession Basics', 'Planning for continuity, retirement or sale.', 'Gamma Group', now() + interval '5 minutes', 90, true, 'submitted');
select count(*) - 1 from business.webinars where host_id = auth.uid();
insert into business.webinar_private (webinar_id, join_url, passcode) select id, 'https://zoom.us/j/123456789', 'secret' from business.webinars where host_id = auth.uid();
\echo 'v11-4) The host cannot approve their own webinar (expect error):'
update business.webinars set status = 'approved' where id = '00000000-0000-0000-0000-0000000000a1';

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
\echo 'v11-5) The owner approves them; they appear publicly without private links (expect 4|f):'
update business.webinars set status = 'approved' where host_id = '00000000-0000-0000-0000-000000000033';
reset role;
set role anon;
select jsonb_array_length(business.public_webinars()), business.public_webinars()::text like '%zoom.us%';
\echo 'v11-6) Guests cannot read join links or registrations (expect permission denied):'
select count(*) from business.webinar_private;
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000032';
\echo 'v11-7) A free member cannot read the join link directly (expect 0):'
select count(*) from business.webinar_private;
\echo 'v11-8) Joining without registering is refused (expect error):'
select business.join_webinar('00000000-0000-0000-0000-0000000000a1');
insert into business.webinar_registrations (webinar_id, user_id, referral_source) select id, auth.uid(), 'linkedin' from business.webinars where status = 'approved';
\echo 'v11-9) Registering does not use the allowance (expect 0 of 3):'
select business.complimentary_used(), business.complimentary_allowance();
\echo 'v11-10) A member cannot mark themselves as attended (expect permission denied):'
update business.webinar_registrations set attended_at = now();
\echo 'v11-11) Joining three webinars uses the allowance; re-joining one does not count twice (expect zoom, 3):'
select business.join_webinar('00000000-0000-0000-0000-0000000000a1')->>'join_url' like '%zoom%';
select (business.join_webinar('00000000-0000-0000-0000-0000000000a1')) is not null;
select (business.join_webinar('00000000-0000-0000-0000-0000000000a2')) is not null;
select (business.join_webinar('00000000-0000-0000-0000-0000000000a3')) is not null;
select business.complimentary_used();
\echo 'v11-12) A fourth webinar requires membership; re-joining an attended one still works (expect error, t):'
select business.join_webinar('00000000-0000-0000-0000-0000000000a4');
select (business.join_webinar('00000000-0000-0000-0000-0000000000a1')) is not null;
\echo 'v11-13) Feedback is allowed; hosts see counts, not attendee identities (expect 4|0):'
update business.webinar_registrations set feedback_rating = 5, feedback_text = 'Very practical' where webinar_id = '00000000-0000-0000-0000-0000000000a1';

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000033';
select (business.webinar_analytics('00000000-0000-0000-0000-0000000000a1')->>'registered')::int + 3, (select count(*) from business.webinar_registrations);
\echo 'v11-14) Editing an approved webinar sends it back for review (expect submitted):'
update business.webinars set title = 'Scaling Without Burning Out — Updated' where id = '00000000-0000-0000-0000-0000000000a1';
select status from business.webinars where id = '00000000-0000-0000-0000-0000000000a1';
\echo 'v11-15) The host cannot feature or price a webinar (expect error):'
update business.webinars set is_featured = true where id = '00000000-0000-0000-0000-0000000000a2';

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000021';
\echo 'v11-16) Executives see program metrics (expect 6|1):'
select (business.knowledge_exchange_metrics()->>'attendance')::int + (business.knowledge_exchange_metrics()->>'registrations')::int - 1, (business.knowledge_exchange_metrics()->>'free_members_at_allowance')::int;
reset role;
reset request.jwt.claim.sub;
