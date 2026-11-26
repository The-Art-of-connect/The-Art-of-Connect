-- Elite: apply directly; verification only (no fee); unlock on approval; In Love rules.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
insert into public.test_signups (email) values ('elite-f@example.com'), ('elite-g@example.com');
insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e6', 'elite-f@example.com', '{"date_of_birth":"1980-04-04"}'),
  ('00000000-0000-0000-0000-0000000000e7', 'elite-g@example.com', '{"date_of_birth":"2000-04-04"}');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e6';
\echo 'v37-1) A new applicant applies directly, with no other membership (expect pass|direct):'
select public.elite_screen_v2('personal_income', 'direct', '{"income_recent": 500000, "income_prior": 500000, "docs": "yes", "att_truth": "yes", "att_verify": "yes"}');
select pathway from public.elite_candidates where user_id = '00000000-0000-0000-0000-0000000000e6';
reset role;
reset request.jwt.claim.sub;
\echo 'v37-2) Once identity and qualification are verified, Elite unlocks without any fee (expect invitation_issued|f):'
insert into public.identity_verifications (user_id, provider_session_id, status, age_meets_minimum) values ('00000000-0000-0000-0000-0000000000e6', 'vs_test_e6', 'verified', true);
insert into public.elite_evidence (candidate_id, kind, status) select id, 'financial_verification', 'owner_verified' from public.elite_candidates where user_id = '00000000-0000-0000-0000-0000000000e6';
select public.elite_auto_assess('00000000-0000-0000-0000-0000000000e6')->'evaluation'->>'status', (select fee_waived or fee_paid_at is not null from public.elite_candidates where user_id = '00000000-0000-0000-0000-0000000000e6');
\echo 'v37-3) An approved applicant may purchase Elite right away (expect t):'
select public.elite_checkout_allowed('00000000-0000-0000-0000-0000000000e6');
\echo 'v37-4) Expedited applicants are never required to pay to be admitted (expect invitation_issued):'
update public.elite_candidates set pathway = 'expedited', status = 'automated_verified' where user_id = '00000000-0000-0000-0000-0000000000e6';
select public.elite_evaluate('00000000-0000-0000-0000-0000000000e6')->>'status';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e6';
\echo 'v37-5) A single member 30+ may opt into In Love (expect t):'
insert into public.elite_experience_prefs (user_id, in_business, in_life, in_love, relationship_status) values ('00000000-0000-0000-0000-0000000000e6', true, true, true, 'single');
select in_love from public.elite_experience_prefs;
\echo 'v37-6) A married member cannot join In Love (expect error):'
update public.elite_experience_prefs set relationship_status = 'married';
\echo 'v37-7) Members under 30 cannot join In Love, but can join Business and Life (expect error, then t|t):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e7';
insert into public.elite_experience_prefs (user_id, in_love, relationship_status) values ('00000000-0000-0000-0000-0000000000e7', true, 'single');
insert into public.elite_experience_prefs (user_id, in_business, in_life) values ('00000000-0000-0000-0000-0000000000e7', true, true);
select in_business, in_life from public.elite_experience_prefs;
\echo 'v37-8) Members cannot read others'' experience choices (expect 1):'
select count(*) from public.elite_experience_prefs;
reset role;
reset request.jwt.claim.sub;
