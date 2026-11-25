-- Primary society: set by the server at registration; members cannot change it themselves.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
update public.profiles set primary_society = 'singles' where id = '00000000-0000-0000-0000-000000000051';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000051';
\echo 'v25-1) A member sees their own primary society (expect singles):'
select primary_society from public.profiles where id = auth.uid();
\echo 'v25-2) A member cannot switch themselves to another society (expect error):'
update public.profiles set primary_society = 'business' where id = auth.uid();
reset role;
reset request.jwt.claim.sub;
\echo 'v25-3) Even the server cannot store an unknown society (expect error):'
update public.profiles set primary_society = 'everything' where id = '00000000-0000-0000-0000-000000000051';
