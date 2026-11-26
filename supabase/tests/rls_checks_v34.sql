-- Elite verification on Stripe: financial summaries are owner-only; members see status, never amounts.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
insert into public.elite_financial_sessions (id, user_id, candidate_id, stripe_session_id, stripe_customer_id, consent_version)
  select '00000000-0000-0000-0000-0000000000f1', c.user_id, c.id, 'fcsess_test1', 'cus_test1', 'elite-fc-2026-11' from public.elite_candidates c where c.user_id = '00000000-0000-0000-0000-0000000000e1';
insert into public.elite_financial_accounts (user_id, candidate_id, session_id, stripe_account_id, institution_name, last4, ownership_result, balance_cents, balance_currency, deposits_cents, data_status)
  select c.user_id, c.id, '00000000-0000-0000-0000-0000000000f1', 'fca_test1', 'Test Bank', '6789', 'match', 123456700, 'usd', 61234500, 'collected' from public.elite_candidates c where c.user_id = '00000000-0000-0000-0000-0000000000e1';
insert into public.elite_verification_payments (user_id, candidate_id, amount_cents, status, paid_at)
  select c.user_id, c.id, 99500, 'paid', now() from public.elite_candidates c where c.user_id = '00000000-0000-0000-0000-0000000000e1';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
\echo 'v34-1) A member sees their own linked account status (expect Test Bank|match|collected):'
select institution_name, ownership_result, data_status from public.elite_financial_accounts;
\echo 'v34-2) ...but never the amounts, even their own (expect permission error):'
select balance_cents from public.elite_financial_accounts;
\echo 'v34-3) A member cannot read the owner financial report (expect error):'
select count(*) from public.elite_owner_financials(array(select id from public.elite_candidates));
\echo 'v34-4) A member cannot write financial results (expect permission error):'
insert into public.elite_financial_accounts (user_id, candidate_id, stripe_account_id) select user_id, id, 'fca_fake' from public.elite_candidates;
\echo 'v34-5) A member cannot mark their fee paid (expect permission error):'
update public.elite_verification_payments set status = 'paid';
\echo 'v34-6) Another member sees none of it (expect 0|0|0):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e2';
select (select count(*) from public.elite_financial_accounts), (select count(*) from public.elite_financial_sessions), (select count(*) from public.elite_verification_payments);
\echo 'v34-7) Verification revenue is owner-only (expect error):'
select * from public.elite_verification_revenue();
reset role;
reset request.jwt.claim.sub;
\echo 'v34-8) Anonymous visitors see nothing (expect permission error):'
set role anon;
select count(*) from public.elite_financial_accounts;
reset role;
\echo 'v34-9) Retention purge erases amounts after the review window (expect 1, then purged|t):'
update public.elite_financial_accounts set delete_after = now() - interval '1 day' where stripe_account_id = 'fca_test1';
select public.elite_purge_financials();
select data_status, balance_cents is null from public.elite_financial_accounts where stripe_account_id = 'fca_test1';
\echo 'v34-10) Production bank verification is off by default (expect f|f):'
select financial_connections_live, financial_purpose_approved from public.elite_settings;
