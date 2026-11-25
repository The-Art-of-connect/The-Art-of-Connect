-- Couples calendar privacy, owner page reviews, Coming soon switches, onboarding answers.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;

-- A couple (51 + 52) and an outsider (53), all with In Love.
insert into public.signup_allowlist(email) values ('cal-a@example.com'), ('cal-b@example.com'), ('cal-c@example.com');
insert into auth.users(id,email) values ('00000000-0000-0000-0000-000000000051','cal-a@example.com'), ('00000000-0000-0000-0000-000000000052','cal-b@example.com'), ('00000000-0000-0000-0000-000000000053','cal-c@example.com');
insert into public.experience_access (user_id, experience, status, source) values
  ('00000000-0000-0000-0000-000000000051','relationships','active','owner_grant'),
  ('00000000-0000-0000-0000-000000000052','relationships','active','owner_grant'),
  ('00000000-0000-0000-0000-000000000053','relationships','active','owner_grant');
insert into relationships.couples (id, created_by) values ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000051');
insert into relationships.couple_members (couple_id, user_id) values ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000051'), ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000052');

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000052';
\echo 'v13-1) Partner B blocks a private work day with a label (expect 1):'
insert into relationships.busy_blocks (user_id, label, starts_at, ends_at) values (auth.uid(), 'Board meeting — confidential', '2027-03-05 14:00+00', '2027-03-05 22:00+00');
select count(*) from relationships.busy_blocks;
\echo 'v13-2) B cannot pretend a block came from a linked calendar (expect error):'
insert into relationships.busy_blocks (user_id, source, starts_at, ends_at) values (auth.uid(), 'google', '2027-03-06 14:00+00', '2027-03-06 15:00+00');

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000051';
\echo 'v13-3) Partner A cannot read B''s busy blocks or labels (expect 0):'
select count(*) from relationships.busy_blocks;
\echo 'v13-4) A sees only that B is unavailable — times, no label (expect 1|f):'
select count(*), bool_or(mine) from relationships.couple_availability('2027-03-01', '2027-03-31');
\echo 'v13-5) The availability result has no label or source column (expect TABLE(starts_at timestamp with time zone, ends_at timestamp with time zone, mine boolean)):'
select pg_get_function_result('relationships.couple_availability(timestamptz,timestamptz)'::regprocedure);
\echo 'v13-6) A checks the busy day: unavailable; another day: available (expect unavailable|available):'
select relationships.check_couple_time('2027-03-05 18:00+00', '2027-03-05 20:00+00'), relationships.check_couple_time('2027-03-07 18:00+00', '2027-03-07 20:00+00');
\echo 'v13-7) A books date night over B''s busy time: refused with the neutral message (expect error):'
insert into relationships.couple_events (couple_id, created_by, title, starts_at, ends_at) values ('30000000-0000-0000-0000-000000000001', auth.uid(), 'Date night', '2027-03-05 20:00+00', '2027-03-05 23:00+00');
\echo 'v13-8) A books a free evening; both partners see it (expect 1 then 1):'
insert into relationships.couple_events (couple_id, created_by, title, starts_at, ends_at) values ('30000000-0000-0000-0000-000000000001', auth.uid(), 'Rooftop dinner', '2027-03-07 23:00+00', '2027-03-08 01:00+00');
select count(*) from relationships.couple_events;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000052';
select count(*) from relationships.couple_events;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000053';
\echo 'v13-9) An outsider sees nothing: no events, no availability (expect 0|0):'
select (select count(*) from relationships.couple_events), (select count(*) from relationships.couple_availability('2027-01-01', '2027-12-31'));
\echo 'v13-10) An outsider cannot add to the couple''s calendar (expect error):'
insert into relationships.couple_events (couple_id, created_by, title, starts_at, ends_at) values ('30000000-0000-0000-0000-000000000001', auth.uid(), 'Intrusion', '2027-04-01 20:00+00', '2027-04-01 21:00+00');

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000051';
\echo 'v13-11) Members cannot add a linked calendar directly (server only) or read link addresses (expect error, error):'
insert into relationships.calendar_links (user_id, provider, url) values (auth.uid(), 'google', 'https://calendar.google.com/x.ics');
select url from relationships.calendar_links;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
\echo 'v13-12) The owner cannot read members'' busy times or couple events (expect 0|0):'
select (select count(*) from relationships.busy_blocks), (select count(*) from relationships.couple_events);

\echo 'v13-13) The owner reviews a page and switches it to Coming soon (expect 1|coming_soon):'
insert into public.page_reviews (path, decision, notes, created_by) values ('/app/journey/daily', 'changes', 'Add a gratitude practice.', auth.uid());
insert into public.section_status (path, status) values ('/app/journey/daily', 'coming_soon') on conflict (path) do update set status = excluded.status;
select (select count(*) from public.page_reviews), (select status from public.section_status where path = '/app/journey/daily');

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000051';
\echo 'v13-14) A member sees which pages are Coming soon, but not the owner''s notes, and cannot change status (expect t|0, then 0 updated):'
select (select count(*) > 0 from public.section_status), (select count(*) from public.page_reviews);
update public.section_status set status = 'live' where path = '/app/journey/daily';
reset role;
select count(*) from public.section_status where path = '/app/journey/daily' and status = 'live';

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000051';
\echo 'v13-15) A member saves onboarding answers and sees only their own (expect 2):'
insert into public.onboarding_answers (user_id, question_id, value) values (auth.uid(), 'q.legal_name', '"Alpha Member"'), (auth.uid(), 'q.disagreement', '"I listen first"');
select count(*) from public.onboarding_answers;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000052';
\echo 'v13-16) Partner and owner cannot read another member''s answers (expect 0, then 0):'
select count(*) from public.onboarding_answers;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select count(*) from public.onboarding_answers;
\echo 'v13-17) No one can write answers for someone else (expect error):'
insert into public.onboarding_answers (user_id, question_id, value) values ('00000000-0000-0000-0000-000000000051', 'q.legal_name', '"Forged"');
reset role;
reset request.jwt.claim.sub;
