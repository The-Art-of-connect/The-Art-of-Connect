-- Know Yourself First: answers are private to the member — no staff, owner or other member access.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000061';
\echo 'v15-1) A member saves their love and work boundaries (expect 2):'
insert into public.self_discovery (user_id, area, core_values, will_do, wont_do, say_it) values
  (auth.uid(), 'love', 'Honesty', 'Communicate weekly', 'Tolerate disrespect', 'I need us to speak kindly, even when we disagree.'),
  (auth.uid(), 'work', 'Integrity', 'Deliver on time', 'Work unpaid weekends', 'I protect my weekends so I can do my best work.');
select count(*) from public.self_discovery;
\echo 'v15-2) The member updates their answer (expect Honesty and kindness):'
update public.self_discovery set core_values = 'Honesty and kindness' where area = 'love';
select core_values from public.self_discovery where area = 'love';
\echo 'v15-3) The member cannot write answers for someone else (expect error):'
insert into public.self_discovery (user_id, area, will_do) values ('00000000-0000-0000-0000-000000000062', 'love', 'x');
\echo 'v15-4) An unknown area is refused (expect error):'
insert into public.self_discovery (user_id, area, will_do) values (auth.uid(), 'money', 'x');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000062';
\echo 'v15-5) Another member reads nothing (expect 0):'
select count(*) from public.self_discovery;
\echo 'v15-6) Another member cannot change or delete them (expect 0|0):'
with u as (update public.self_discovery set will_do = 'hacked' returning 1), d as (delete from public.self_discovery returning 1)
select (select count(*) from u), (select count(*) from d);
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
\echo 'v15-7) The OWNER cannot read members answers (expect 0):'
select count(*) from public.self_discovery;
reset role;
reset request.jwt.claim.sub;
set role anon;
\echo 'v15-8) Anonymous visitors are refused (expect permission denied):'
select count(*) from public.self_discovery;
reset role;
