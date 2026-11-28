-- QA account switching (owner request): every entitlement follows the selected membership, in both directions.
reset role;
reset request.jwt.claim.sub;
update public.platform_settings set value = 'false'::jsonb where key in ('relationships_live', 'business_live');
insert into public.test_signups (email) values ('v54-qa@example.com');
insert into auth.users(id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-00000000f541', 'v54-qa@example.com', '{"date_of_birth":"1975-01-01"}');
insert into public.qa_switchers (user_id) values ('00000000-0000-0000-0000-00000000f541');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f541';
\echo 'v54-1) Elite: Elite research, In Business and In Love, active badge, $0 with no payment record (expect elite|t|t|active|0|t):'
select public.qa_switch_experience('elite');
select public.intel_level(auth.uid()), public.has_experience('business'), public.has_experience('relationships'),
  (select status from public.elite_badges where user_id = auth.uid()), (select amount_cents from public.subscriptions where user_id = auth.uid()),
  (select stripe_subscription_id is null from public.subscriptions where user_id = auth.uid());
\echo 'v54-2) Elite to Free: nothing paid remains (expect <null>|f|f|expired|0|0):'
select public.qa_switch_experience('free');
select coalesce(public.intel_level(auth.uid()), '<null>'), public.has_experience('business'), public.has_experience('relationships'),
  (select status from public.elite_badges where user_id = auth.uid()), (select count(*) from public.subscriptions where user_id = auth.uid()),
  (select count(*) from public.experience_access where user_id = auth.uid());
\echo 'v54-3) Free keeps The Art of Becoming (expect t):'
select public.has_experience('counseling');
\echo 'v54-4) Free to Elite: Elite returns only after the switch (expect elite|t|active):'
select public.qa_switch_experience('elite');
select public.intel_level(auth.uid()), public.has_experience('business'), (select status from public.elite_badges where user_id = auth.uid());
\echo 'v54-5) Elite to Professional: only that tier (expect <null>|t|f|expired):'
select public.qa_switch_experience('professional');
select coalesce(public.intel_level(auth.uid()), '<null>'), public.has_experience('business'), public.has_experience('relationships'),
  (select status from public.elite_badges where user_id = auth.uid());
\echo 'v54-6) Executive: Executive research, not Elite (expect executive):'
select public.qa_switch_experience('executive');
select public.intel_level(auth.uid());
\echo 'v54-7) The QA account cannot edit its own membership directly (expect error):'
update public.subscriptions set tier_slug = 'elite-concierge' where user_id = auth.uid();
\echo 'v54-8) Nor grant itself access directly (expect error):'
insert into public.experience_access (user_id, experience, status, source) values (auth.uid(), 'business', 'active', 'comp');
reset role;
reset request.jwt.claim.sub;
\echo 'v54-9) An expired Elite badge no longer grants Elite research (expect <null>):'
update public.subscriptions set tier_slug = 'personal-society' where user_id = '00000000-0000-0000-0000-00000000f541';
insert into public.elite_badges (user_id, status, expires_at) values ('00000000-0000-0000-0000-00000000f541', 'active', now() - interval '1 day')
  on conflict (user_id) do update set status = 'active', expires_at = now() - interval '1 day';
select coalesce(public.intel_level('00000000-0000-0000-0000-00000000f541'), '<null>');
