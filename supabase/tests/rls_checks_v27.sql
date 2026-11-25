-- Society transitions: eligibility checked, free access moved, singles-matchmaking protected, history kept, members can't self-edit.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
update public.platform_settings set value = '21' where key = 'minimum_member_age';
insert into public.signup_allowlist(email) values ('tr-a@example.com'), ('tr-b@example.com');
insert into auth.users(id,email) values ('00000000-0000-0000-0000-000000000081','tr-a@example.com'), ('00000000-0000-0000-0000-000000000082','tr-b@example.com');
insert into public.member_private(user_id, date_of_birth) values ('00000000-0000-0000-0000-000000000081','1975-06-01'), ('00000000-0000-0000-0000-000000000082', (current_date - interval '25 years')::date);
update public.profiles set primary_society = 'singles' where id = '00000000-0000-0000-0000-000000000081';
update public.profiles set primary_society = 'business' where id = '00000000-0000-0000-0000-000000000082';
insert into public.experience_access (user_id, experience, status, source) values ('00000000-0000-0000-0000-000000000081','relationships','active','free_tier'), ('00000000-0000-0000-0000-000000000082','business','active','free_tier');
insert into public.discovery_answers (user_id, question_key, answer) values ('00000000-0000-0000-0000-000000000081', 'beyond_titles', 'A curious gardener');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000081';
\echo 'v27-1) A single member moves to Couples (expect couples):'
select public.change_primary_society('couples');
\echo 'v27-2) Their Art of Self history and society access are kept (expect 1|couples|1):'
select (select count(*) from public.discovery_answers) || '|' || (select primary_society from public.profiles where id = auth.uid()) || '|' || (select count(*) from public.experience_access where experience = 'relationships');
\echo 'v27-3) A member still cannot change their society directly (expect error):'
update public.profiles set primary_society = 'business' where id = auth.uid();
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000082';
\echo 'v27-4) A 25-year-old cannot move into singles (expect error):'
select public.change_primary_society('singles');
\echo 'v27-5) A 25-year-old business member can move to Couples; free business access is released (expect couples|0|1):'
select public.change_primary_society('couples');
select (select primary_society from public.profiles where id = auth.uid()) || '|' || (select count(*) from public.experience_access where experience = 'business') || '|' || (select count(*) from public.experience_access where experience = 'relationships');
\echo 'v27-6) Each change is logged (expect 1):'
select count(*) from public.society_transitions;
reset role;
