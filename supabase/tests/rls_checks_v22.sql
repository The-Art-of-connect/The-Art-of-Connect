-- Journey Training Library: owner-only; bulk approval never approves an entry waiting on a founder decision.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
\echo 'v22-1) The owner adds two drafts, one waiting on a founder decision (expect 2):'
insert into public.journey_training_entries (category, topic, scenario, example_response) values ('boundaries', 'Saying no', 'A member struggles to say no to family.', 'That sounds heavy. What feels hardest about saying no?');
insert into public.journey_training_entries (category, topic, scenario, example_response, founder_question) values ('boundaries', 'Faith and boundaries', 'A member asks whether their faith requires endless forgiveness.', 'Tell me more about what forgiveness means to you.', 'How should Journey balance faith teachings with boundaries?');
select count(*) from public.journey_training_entries;
\echo 'v22-2) Approving the category approves only the entry without an open question (expect 1 then approved,pending):'
select public.journey_training_approve_category('boundaries');
select string_agg(status, ',' order by founder_question nulls first) from public.journey_training_entries;
\echo 'v22-3) An entry with an open founder question cannot be approved directly (expect error):'
update public.journey_training_entries set status = 'approved' where founder_question is not null;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000051';
\echo 'v22-4) A member cannot read the library or categories (expect 0|0):'
select (select count(*) from public.journey_training_entries), (select count(*) from public.journey_training_categories);
\echo 'v22-5) A member cannot approve a category (expect error):'
select public.journey_training_approve_category('boundaries');
reset role;
