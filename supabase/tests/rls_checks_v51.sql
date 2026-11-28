-- QA experience switcher: only an owner-listed fictional test account can switch, and only its own access.
reset role;
reset request.jwt.claim.sub;
insert into public.test_signups (email) values ('v51-qa@example.com'), ('v51-other@example.com');
insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000f511', 'v51-qa@example.com', '{"date_of_birth":"1975-01-01"}'),
  ('00000000-0000-0000-0000-00000000f512', 'v51-other@example.com', '{"date_of_birth":"1975-01-01"}');
insert into public.qa_switchers (user_id) values ('00000000-0000-0000-0000-00000000f511');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f512';
\echo 'v51-1) An unlisted account cannot switch (expect error):'
select public.qa_switch_experience('elite');
\echo 'v51-2) An unlisted account cannot add itself to the switcher list (expect error):'
insert into public.qa_switchers (user_id) values (auth.uid());
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f511';
\echo 'v51-3) The QA account switches to Elite (expect elite, elite-concierge, active, 0 staff):'
select public.qa_switch_experience('elite');
select tier_slug, (select status from public.elite_badges where user_id = auth.uid()), (select count(*) from public.staff_roles where user_id = auth.uid()) from public.subscriptions where user_id = auth.uid();
\echo 'v51-4) Switching to Couples (expect personal-society, t, couples, expired):'
select public.qa_switch_experience('couples');
select s.tier_slug, s.couples_upgrade, p.primary_society, (select status from public.elite_badges where user_id = auth.uid()) from public.subscriptions s join public.profiles p on p.id = s.user_id where s.user_id = auth.uid();
\echo 'v51-5) Switching to Free removes paid access (expect 0, 0):'
select public.qa_switch_experience('free');
select (select count(*) from public.subscriptions where user_id = auth.uid()), (select count(*) from public.experience_access where user_id = auth.uid() and source = 'comp');
\echo 'v51-6) Unknown experiences are refused (expect error):'
select public.qa_switch_experience('owner');
reset role;
reset request.jwt.claim.sub;
\echo 'v51-7) A non-test account on the list is still refused (expect error):'
update public.profiles set is_test = false where id = '00000000-0000-0000-0000-00000000f511';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f511';
select public.qa_switch_experience('elite');
reset role;
reset request.jwt.claim.sub;
