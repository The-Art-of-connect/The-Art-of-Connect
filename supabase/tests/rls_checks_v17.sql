-- Journey check-ins: private to each member; owner sees totals only.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000061';
\echo 'v17-1) A member chooses morning manifestations and email check-ins (expect t|t|f):'
insert into public.journey_checkin_prefs (user_id, morning_manifestation, channel_email) values (auth.uid(), true, true);
select morning_manifestation, channel_email, show_details from public.journey_checkin_prefs;
\echo 'v17-2) The member asks Journey to check in after an interview (expect 1):'
insert into public.journey_checkins (user_id, kind, title, detail, due_at) values (auth.uid(), 'interview', 'Interview at Delta', 'Nervous about the salary question', now() + interval '2 days');
select count(*) from public.journey_checkins;
\echo 'v17-3) A member cannot pretend a check-in came from Journey (expect error):'
insert into public.journey_checkins (user_id, title, due_at, created_by) values (auth.uid(), 'Fake', now(), 'journey');
\echo 'v17-4) A member cannot create check-ins for someone else (expect error):'
insert into public.journey_checkins (user_id, title, due_at) values ('00000000-0000-0000-0000-000000000062', 'x check', now());
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000062';
\echo 'v17-5) Another member sees nothing (expect 0|0):'
select (select count(*) from public.journey_checkin_prefs), (select count(*) from public.journey_checkins);
\echo 'v17-6) A member cannot change the global settings (expect 0):'
with u as (update public.journey_checkin_settings set email_enabled = true returning 1) select count(*) from u;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
\echo 'v17-7) The OWNER cannot read members check-ins or preferences (expect 0|0):'
select (select count(*) from public.journey_checkin_prefs), (select count(*) from public.journey_checkins);
\echo 'v17-8) The owner sees totals only (expect 1|1|1):'
select (t->>'members_with_prefs') || '|' || (t->>'morning') || '|' || (t->>'scheduled') from (select public.journey_checkin_totals() t) x;
\echo 'v17-9) The owner can change the global settings (expect 1):'
with u as (update public.journey_checkin_settings set max_emails_per_week = 2 returning 1) select count(*) from u;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000062';
\echo 'v17-10) A member gets no totals (expect t = nothing returned):'
select public.journey_checkin_totals() is null;
reset role;
reset request.jwt.claim.sub;
set role anon;
\echo 'v17-11) Anonymous visitors are refused (expect permission denied):'
select count(*) from public.journey_checkins;
reset role;
