-- Lifelong growth and relationship transitions (directives 45-47).
reset role;
reset request.jwt.claim.sub;
update public.platform_settings set value = 'true'::jsonb where key = 'relationships_live';
insert into public.test_signups (email) values ('v59-a@example.com'), ('v59-b@example.com'), ('v59-c@example.com');
insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000f591', 'v59-a@example.com', '{"date_of_birth":"1975-01-01","display_name":"Ari Test"}'),
  ('00000000-0000-0000-0000-00000000f592', 'v59-b@example.com', '{"date_of_birth":"1976-01-01","display_name":"Bea Test"}'),
  ('00000000-0000-0000-0000-00000000f593', 'v59-c@example.com', '{"date_of_birth":"1977-01-01","display_name":"Cy Test"}');
insert into public.experience_access (user_id, experience, status, source) select id, 'relationships', 'active', 'comp' from public.profiles where id::text like '00000000-0000-0000-0000-00000000f59%';
insert into relationships.couples (id, created_by) values ('00000000-0000-0000-0000-0000000c0590', '00000000-0000-0000-0000-00000000f591');
insert into relationships.couple_members (couple_id, user_id) values ('00000000-0000-0000-0000-0000000c0590', '00000000-0000-0000-0000-00000000f591'), ('00000000-0000-0000-0000-0000000c0590', '00000000-0000-0000-0000-00000000f592');
insert into relationships.couple_goals (couple_id, created_by, title) values ('00000000-0000-0000-0000-0000000c0590', '00000000-0000-0000-0000-00000000f591', 'A shared goal');
insert into relationships.private_reflections (user_id, prompt, body) values ('00000000-0000-0000-0000-00000000f591', 'Fictional', 'A private reflection');
insert into business.room_participants (room_id, user_id, role, status) select null, null, 'owner', 'active' where false;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f591';
\echo 'v59-1) Members choose and change their reflection frequency (expect quarterly, then annual):'
insert into public.growth_prefs (user_id) values (auth.uid());
select frequency from public.growth_prefs where user_id = auth.uid();
update public.growth_prefs set frequency = 'annual' where user_id = auth.uid();
select frequency from public.growth_prefs where user_id = auth.uid();
\echo 'v59-2) Milestones are private unless shared with a partner (expect 1 private + 1 shared, partner sees 1):'
insert into public.milestones (user_id, kind, title, visibility) values (auth.uid(), 'breakthrough', 'A private breakthrough', 'private'), (auth.uid(), 'anniversary', 'Our anniversary', 'shared_partner');
select count(*) from public.milestones where user_id = auth.uid();
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f592';
select count(*) from public.milestones where user_id = '00000000-0000-0000-0000-00000000f591';
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f593';
\echo 'v59-3) Nobody else sees them (expect 0):'
select count(*) from public.milestones where user_id = '00000000-0000-0000-0000-00000000f591';
\echo 'v59-4) Members cannot create "platform" milestones or forge growth reports (expect error, error):'
insert into public.milestones (user_id, kind, title, source) values (auth.uid(), 'career', 'Forged', 'platform');
insert into public.growth_reports (user_id, kind, period_start) values (auth.uid(), 'on_demand', now());
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f591';
\echo 'v59-5) Relationship status changes keep a private history (expect 2):'
insert into relationships.status (user_id, status) values (auth.uid(), 'engaged');
update relationships.status set status = 'married' where user_id = auth.uid();
select count(*) from relationships.status_history where user_id = auth.uid();
\echo 'v59-6) An on-demand reflection is built from real records only (expect 1|t):'
select count(*), bool_and(activity ? 'sanctuary_entries' and member_reported ? 'milestones') from public.growth_reports where id = public.growth_report_request();
\echo 'v59-7) One on-demand reflection a day (expect error):'
select public.growth_report_request();
\echo 'v59-8) Either partner can leave alone; access to the shared space ends immediately (expect left|0|0):'
select relationships.leave_couple(false);
select (select count(*) from relationships.couple_members where user_id = auth.uid()), (select count(*) from relationships.couple_goals);
\echo 'v59-9) Leaving keeps the member''s private reflections, growth reports and milestones (expect 1|1|2):'
select (select count(*) from relationships.private_reflections where user_id = auth.uid()), (select count(*) from public.growth_reports where user_id = auth.uid()), (select count(*) from public.milestones where user_id = auth.uid());
\echo 'v59-10) Singles matchmaking is not switched on automatically (expect f or no profile):'
select coalesce((select is_visible from relationships.profiles where user_id = auth.uid()), false);
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f592';
\echo 'v59-11) The former partner is told respectfully, and keeps the shared history (expect 1|1):'
select (select count(*) from public.member_notices where user_id = auth.uid() and kind = 'system'), (select count(*) from relationships.couple_goals);
\echo 'v59-12) The partner no longer sees the leaver''s shared milestones (expect 0):'
select count(*) from public.milestones where user_id = '00000000-0000-0000-0000-00000000f591';
\echo 'v59-13) A private (safety) departure sends no message (expect left_and_closed|1):'
select relationships.leave_couple(true);
select count(*) from public.member_notices where user_id = '00000000-0000-0000-0000-00000000f591' and kind = 'system';
reset role;
reset request.jwt.claim.sub;
\echo 'v59-14) Scheduled reflections follow each member''s frequency, and paused members get none (expect 1|1):'
update public.growth_prefs set frequency = 'monthly', next_due_at = now() - interval '1 minute' where user_id = '00000000-0000-0000-0000-00000000f591';
insert into public.growth_prefs (user_id, frequency, paused, next_due_at) values ('00000000-0000-0000-0000-00000000f593', 'monthly', true, now() - interval '1 minute');
select public.growth_tick() >= 1, (select count(*) from public.growth_reports where user_id = '00000000-0000-0000-0000-00000000f593') + 1;
