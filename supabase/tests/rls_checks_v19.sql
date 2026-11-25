-- Love Language Profiles: private by default; shared only by the member's choice.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000051';
\echo 'v19-1) Partner A saves a profile, not yet shared (expect 1):'
insert into public.love_language_profiles (user_id, receive_rank, express_rank, feel_connected, feel_unappreciated) values (auth.uid(), '{time,words,touch,service,gifts}', '{service,gifts,time,words,touch}', 'Long talks', 'Plans cancelled at the last minute');
select count(*) from public.love_language_profiles;
\echo 'v19-2) An unknown love language is refused (expect error):'
update public.love_language_profiles set receive_rank = '{money}';
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000052';
\echo 'v19-3) Partner B sees nothing until A chooses to share (expect 0|0):'
select (select count(*) from public.love_language_profiles), (select count(*) from public.partner_love_language());
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000051';
update public.love_language_profiles set share_with_partner = true;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000052';
\echo 'v19-4) After A shares, B sees A''s profile through the couple view (expect time|Long talks):'
select receive_rank[1] || '|' || feel_connected from public.partner_love_language();
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000053';
\echo 'v19-5) Someone outside the couple sees nothing (expect 0|0):'
select (select count(*) from public.partner_love_language()), (select count(*) from public.match_love_language('00000000-0000-0000-0000-000000000051'));

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000062';
insert into public.love_language_profiles (user_id, receive_rank, express_rank, notes) values (auth.uid(), '{words,time,touch,gifts,service}', '{time,words,touch,service,gifts}', 'private note');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000061';
\echo 'v19-6) A connected match sees nothing until the member shares with matches (expect 0):'
select count(*) from public.match_love_language('00000000-0000-0000-0000-000000000062');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000062';
update public.love_language_profiles set share_with_matches = true;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000061';
\echo 'v19-7) Once shared, the connected match sees rankings only (expect words):'
select receive_rank[1] from public.match_love_language('00000000-0000-0000-0000-000000000062');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000063';
\echo 'v19-8) A member who is not connected sees nothing, even when shared (expect 0):'
select count(*) from public.match_love_language('00000000-0000-0000-0000-000000000062');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
\echo 'v19-9) The OWNER cannot read members'' love language profiles (expect 0):'
select count(*) from public.love_language_profiles;
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000063';
\echo 'v19-10) Members can read the love languages lesson in the Library (expect 1):'
select count(*) from public.journey_library where title = 'The five love languages';
reset role;
reset request.jwt.claim.sub;
