-- Elite preliminary screening: meaningful criteria, decided by the database.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
insert into public.test_signups (email) values ('elite-d@example.com');
insert into auth.users(id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000e5', 'elite-d@example.com', '{"date_of_birth":"1970-03-03"}');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e5';
\echo 'v36-1) Choosing Corporate Executive with junior answers does not pass (expect not_yet|f):'
select public.elite_screen_v2('executive', 'expedited', '{"level": "director", "org": "under50", "role_years": "under1", "comp": 250000, "docs": "yes", "att_truth": "yes", "att_verify": "yes"}');
select screening_meets from public.elite_candidates where user_id = '00000000-0000-0000-0000-0000000000e5';
\echo 'v36-2) A senior executive below the approved income threshold goes to the founder, not to checkout (expect owner_review|f|manual_review):'
select public.elite_screen_v2('executive', 'expedited', '{"level": "evp_svp", "org": "over500", "role_years": "over3", "comp": 250000, "docs": "yes", "att_truth": "yes", "att_verify": "yes"}');
select screening_meets, status from public.elite_candidates where user_id = '00000000-0000-0000-0000-0000000000e5';
\echo 'v36-3) Income below the approved threshold does not pass (expect not_yet):'
select public.elite_screen_v2('personal_income', 'expedited', '{"income_recent": 250000, "income_prior": 1000000, "docs": "yes", "att_truth": "yes", "att_verify": "yes"}');
\echo 'v36-4) Without documents, nothing passes (expect not_yet):'
select public.elite_screen_v2('personal_income', 'expedited', '{"income_recent": 1000000, "income_prior": 1000000, "docs": "no", "att_truth": "yes", "att_verify": "yes"}');
\echo 'v36-5) Unapproved thresholds go to the founder even when met (expect owner_review):'
select public.elite_screen_v2('net_worth', 'expedited', '{"net_worth": 10000000, "docs": "yes", "att_truth": "yes", "att_verify": "yes"}');
\echo 'v36-6) Made-up amounts are rejected (expect error):'
select public.elite_screen_v2('personal_income', 'expedited', '{"income_recent": 999999999, "income_prior": 1000000, "docs": "yes", "att_truth": "yes", "att_verify": "yes"}');
\echo 'v36-7) The statements must be confirmed (expect error):'
select public.elite_screen_v2('personal_income', 'expedited', '{"income_recent": 1000000, "income_prior": 1000000, "docs": "yes"}');
\echo 'v36-8) The old one-question screening is gone (expect error):'
select public.elite_screen('personal_income', true, 'expedited');
\echo 'v36-9) Only ranges are kept, never exact amounts (expect {"docs": "yes", "net_worth": 10000000}):'
select screening from public.elite_candidates where user_id = '00000000-0000-0000-0000-0000000000e5';
reset role;
reset request.jwt.claim.sub;
