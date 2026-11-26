-- Elite: automatic qualification only on conclusive evidence; members access only their own information.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
insert into public.test_signups (email) values ('elite-c@example.com');
insert into auth.users(id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000e4', 'elite-c@example.com', '{"date_of_birth":"1972-02-02"}');
insert into public.elite_candidates (user_id, pathway, qualification, screening_meets, status, fee_waived)
  values ('00000000-0000-0000-0000-0000000000e4', 'expedited', 'personal_income', true, 'preliminary', true);
insert into public.identity_verifications (user_id, provider_session_id, status, age_meets_minimum) values ('00000000-0000-0000-0000-0000000000e4', 'vs_test_e4', 'verified', true);
insert into public.elite_financial_accounts (user_id, candidate_id, stripe_account_id, category, ownership_result, balance_cents, balance_currency, balance_as_of, deposits_cents, history_days, data_status)
  select user_id, id, 'fca_test_e4', 'cash', 'match', 900000000, 'usd', now(), 80000000, 120, 'collected' from public.elite_candidates where user_id = '00000000-0000-0000-0000-0000000000e4';
\echo 'v35-1) Large deposits never auto-qualify the income pathway: routed to manual review (expect manual_review, then manual_review|t):'
select public.elite_auto_assess('00000000-0000-0000-0000-0000000000e4')->>'result';
select status, array_length(review_reasons, 1) > 0 from public.elite_candidates where user_id = '00000000-0000-0000-0000-0000000000e4';
\echo 'v35-2) Investor pathway with the rule NOT approved: still manual review (expect manual_review):'
update public.elite_candidates set qualification = 'investor' where user_id = '00000000-0000-0000-0000-0000000000e4';
select public.elite_auto_assess('00000000-0000-0000-0000-0000000000e4')->>'result';
\echo 'v35-3) Rule approved and threshold approved: conclusive, invitation issued automatically (expect conclusive, then invitation_issued):'
update public.elite_settings set auto_rules = '{"investable_assets_from_balances": true}',
  thresholds = jsonb_set(thresholds, '{investable_assets,approved}', 'true');
select public.elite_auto_assess('00000000-0000-0000-0000-0000000000e4')->>'result';
select status from public.elite_candidates where user_id = '00000000-0000-0000-0000-0000000000e4';
update public.elite_settings set auto_rules = '{"investable_assets_from_balances": false}',
  thresholds = jsonb_set(thresholds, '{investable_assets,approved}', 'false');
\echo 'v35-4) A member cannot run the assessment themselves (expect error):'
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e4';
select public.elite_auto_assess('00000000-0000-0000-0000-0000000000e4');
\echo 'v35-5) A member sees their own amounts through My verification information (expect 900000000|120):'
select a->>'balance_cents', a->>'history_days' from jsonb_array_elements(public.elite_my_verification()->'bank_accounts') a;
\echo 'v35-6) A member files a correction request (expect 1):'
insert into public.elite_data_requests (user_id, kind, subject, message) values ('00000000-0000-0000-0000-0000000000e4', 'correction', 'bank', 'Balance date is wrong');
select count(*) from public.elite_data_requests;
\echo 'v35-7) A member cannot resolve their own request (expect 0 rows changed):'
with u as (update public.elite_data_requests set status = 'completed' returning 1) select count(*) from u;
\echo 'v35-8) Another member sees none of it (expect 0|0):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e2';
select jsonb_array_length(public.elite_my_verification()->'bank_accounts'), (select count(*) from public.elite_data_requests where user_id = '00000000-0000-0000-0000-0000000000e4');
\echo 'v35-9) A member cannot file a request for someone else (expect error):'
insert into public.elite_data_requests (user_id, kind, subject, message) values ('00000000-0000-0000-0000-0000000000e4', 'access', 'other', 'x');
reset role;
reset request.jwt.claim.sub;
