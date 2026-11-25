-- Discovery sessions and analyses: private to the member; the owner cannot read them.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000051';
\echo 'v23-1) A member starts a session and saves an analysis (expect 1|1):'
insert into public.journey_discovery_sessions (user_id, category) values (auth.uid(), 'boundaries');
insert into public.discovery_analyses (user_id, scope, source, content) values (auth.uid(), 'category:boundaries', 'self', 'You shared that saying no feels hard.');
select (select count(*) from public.journey_discovery_sessions) || '|' || (select count(*) from public.discovery_analyses);
\echo 'v23-2) Only one active session per category (expect error):'
insert into public.journey_discovery_sessions (user_id, category) values (auth.uid(), 'boundaries');
\echo 'v23-3) A member cannot save an analysis for someone else (expect error):'
insert into public.discovery_analyses (user_id, scope, source, content) values ('00000000-0000-0000-0000-000000000052', 'portfolio', 'self', 'Not mine to write.');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000052';
\echo 'v23-4) Another member (even a partner) sees nothing (expect 0|0):'
select (select count(*) from public.journey_discovery_sessions) || '|' || (select count(*) from public.discovery_analyses);
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
\echo 'v23-5) The OWNER cannot read members'' sessions or analyses (expect 0|0):'
select (select count(*) from public.journey_discovery_sessions) || '|' || (select count(*) from public.discovery_analyses);
reset role;
