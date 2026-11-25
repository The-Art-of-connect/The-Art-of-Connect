-- The Art of Knowing Yourself: private, optional, with growth history only the member can see.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000061';
\echo 'v16-1) A member answers two questions and picks values (expect 2):'
insert into public.discovery_answers (user_id, question_key, answer) values (auth.uid(), 'beyond_titles', 'A curious, caring builder');
insert into public.discovery_answers (user_id, question_key, choices) values (auth.uid(), 'core_values', array['honesty','family','growth']);
select count(*) from public.discovery_answers;
\echo 'v16-2) Updating an answer keeps the earlier version in their history (expect 2 versions):'
update public.discovery_answers set answer = 'A calm, generous leader' where question_key = 'beyond_titles';
select count(*) || ' versions' from public.discovery_history where question_key = 'beyond_titles';
\echo 'v16-3) The member cannot forge history (expect error):'
insert into public.discovery_history (user_id, question_key, answer) values (auth.uid(), 'beyond_titles', 'fake');
\echo 'v16-4) The member cannot rewrite history (expect permission denied):'
with u as (update public.discovery_history set answer = 'changed' returning 1) select count(*) from u;
\echo 'v16-5) The member sets a growth goal and chooses to explore first (expect 1|explore_first):'
insert into public.discovery_goals (user_id, title, area) values (auth.uid(), 'Speak up in meetings', 'work');
insert into public.discovery_preference (user_id, choice) values (auth.uid(), 'explore_first');
select (select count(*) from public.discovery_goals), (select choice from public.discovery_preference);
\echo 'v16-6) A member cannot write into someone else''s profile (expect error):'
insert into public.discovery_answers (user_id, question_key, answer) values ('00000000-0000-0000-0000-000000000062', 'beyond_titles', 'x');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000062';
\echo 'v16-7) Another member — even a partner or match — sees nothing (expect 0|0|0|0):'
select (select count(*) from public.discovery_answers), (select count(*) from public.discovery_history), (select count(*) from public.discovery_goals), (select count(*) from public.discovery_preference);
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
\echo 'v16-8) The OWNER sees nothing (expect 0|0|0|0):'
select (select count(*) from public.discovery_answers), (select count(*) from public.discovery_history), (select count(*) from public.discovery_goals), (select count(*) from public.discovery_preference);
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000061';
\echo 'v16-9) The member can erase their own history (expect 0):'
delete from public.discovery_history;
select count(*) from public.discovery_history;
reset role;
reset request.jwt.claim.sub;
set role anon;
\echo 'v16-10) Anonymous visitors are refused (expect permission denied):'
select count(*) from public.discovery_answers;
reset role;
