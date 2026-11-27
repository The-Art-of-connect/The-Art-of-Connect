-- CONNECT 360 Intelligence Division: entitlement, privacy, member limits and the spending guard.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
insert into public.test_signups (email) values ('intel-exec@example.com'), ('intel-one@example.com'), ('intel-other@example.com');
insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000f101', 'intel-exec@example.com', '{"date_of_birth":"1975-01-01"}'),
  ('00000000-0000-0000-0000-00000000f102', 'intel-one@example.com', '{"date_of_birth":"1975-01-01"}'),
  ('00000000-0000-0000-0000-00000000f103', 'intel-other@example.com', '{"date_of_birth":"1975-01-01"}');
insert into public.subscriptions (user_id, status, kind, tier_slug, tier_name, experiences, stripe_subscription_id) values
  ('00000000-0000-0000-0000-00000000f101', 'active', 'member', 'executive-private', 'Executive Private', '{business,relationships}', 'sub_test_intel_exec'),
  ('00000000-0000-0000-0000-00000000f102', 'active', 'member', 'professional-society', 'The Professional Society', '{business}', 'sub_test_intel_one'),
  ('00000000-0000-0000-0000-00000000f103', 'active', 'member', 'executive-private', 'Executive Private', '{business,relationships}', 'sub_test_intel_other');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f102';
\echo 'v45-1) One Society members cannot commission research (expect error):'
insert into public.intel_assignments (user_id, title, objective, category) values ('00000000-0000-0000-0000-00000000f102', 'Test', 'Fictional acquisition research', 'business-acquisition');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f101';
\echo 'v45-2) Executive members can (expect 1):'
insert into public.intel_assignments (user_id, title, objective, category, status) values ('00000000-0000-0000-0000-00000000f101', 'Fictional franchise', 'Explore ownership requirements for a fictional expansion franchise.', 'sports-ownership', 'queued');
select count(*) from public.intel_assignments;
\echo 'v45-3) Members cannot set research cost or stage (expect error):'
update public.intel_assignments set cost_cents = 0, stage = 2;
\echo 'v45-4) Executive members cannot use the Elite watchlist (expect error):'
insert into public.intel_watchlist (user_id, objective) values ('00000000-0000-0000-0000-00000000f101', 'Board opportunities');
\echo 'v45-5) Personal details are blocked by the Safety Shield (expect error):'
insert into public.intel_assignments (user_id, title, objective, category) values ('00000000-0000-0000-0000-00000000f101', 'Call me', 'Reach me at 404-555-1212 about this research.', 'other');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f103';
\echo 'v45-6) Another member never sees someone else''s research (expect 0):'
select count(*) from public.intel_assignments;
\echo 'v45-7) Members cannot change the owner''s intelligence settings (expect 0 rows changed):'
with u as (update public.intel_settings set enabled = true returning 1) select count(*) from u;
reset role;
reset request.jwt.claim.sub;
\echo 'v45-8) Nothing is spent until the owner enables the division and a budget (expect refused:division_off):'
select public.intel_can_spend((select id from public.intel_assignments limit 1), 10);
\echo 'v45-9) Enabled with no budget still spends nothing (expect refused:company_monthly):'
update public.intel_settings set enabled = true;
select public.intel_can_spend((select id from public.intel_assignments limit 1), 10);
update public.intel_settings set enabled = false;
