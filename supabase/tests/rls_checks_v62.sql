-- Directive 51 section 5: dollar allowances at actual cost; text and voice share one balance; couples per person.
reset role;
reset request.jwt.claim.sub;
insert into public.test_signups (email) values ('v62-a@example.com'), ('v62-b@example.com');
insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000f621', 'v62-a@example.com', '{"date_of_birth":"1975-01-01","display_name":"A Test"}'),
  ('00000000-0000-0000-0000-00000000f622', 'v62-b@example.com', '{"date_of_birth":"1975-01-01","display_name":"B Test"}');
-- Earlier checks change some tiers; restore the directive 51 allowances for this file.
update public.journey_tier_limits set unlimited_messages = false, monthly_messages = null, daily_messages = null, tier_monthly_limit_cents = null,
  member_monthly_limit_cents = case package_slug when 'couples-membership' then 1000 else 500 end, person_monthly_limit_cents = 500, fair_use_daily = 300, fair_use_hourly = 60
  where package_slug in ('personal-society', 'couples-membership');
update public.journey_settings set enabled = true, paid_usage_authorized = true, company_monthly_limit_cents = 100000, voice_enabled = true;
\echo 'v62-1) A Singles member can use Journey within the $5 allowance (expect t):'
select public.journey_reserve('00000000-0000-0000-0000-00000000f621', '00000000-0000-0000-0000-00000000f621', 'v62-key-001', 'personal-society', 'life', 'test-model', 1, date_trunc('month', now())) ~ '^[0-9]+$';
update public.journey_usage set status = 'completed', cost_cents = 495 where request_key = 'v62-key-001';
\echo 'v62-2) The allowance is measured at actual cost: past $5 it is refused (expect refused:allowance):'
select public.journey_reserve('00000000-0000-0000-0000-00000000f621', '00000000-0000-0000-0000-00000000f621', 'v62-key-002', 'personal-society', 'life', 'test-model', 10, date_trunc('month', now()));
\echo 'v62-3) Voice draws from the same balance (expect refused:allowance):'
select public.journey_voice_start('00000000-0000-0000-0000-00000000f621', '00000000-0000-0000-0000-00000000f621', 'personal-society', 60, false, 10, date_trunc('month', now()), 500, 500);
\echo 'v62-4) Couples: one partner cannot use more than $5 of the couple''s $10 (expect t, then refused:allowance):'
select public.journey_reserve('00000000-0000-0000-0000-00000000f622', '00000000-0000-0000-0000-00000000f621', 'v62-key-003', 'couples-membership', 'love', 'test-model', 1, date_trunc('month', now())) is not null;
delete from public.journey_usage where request_key = 'v62-key-003';
update public.journey_usage set package_slug = 'couples-membership' where request_key = 'v62-key-001';
select public.journey_reserve('00000000-0000-0000-0000-00000000f621', '00000000-0000-0000-0000-00000000f621', 'v62-key-004', 'couples-membership', 'love', 'test-model', 10, date_trunc('month', now()));
\echo 'v62-5) Their partner still has their own share of the couple allowance (expect t):'
select public.journey_reserve('00000000-0000-0000-0000-00000000f622', '00000000-0000-0000-0000-00000000f621', 'v62-key-005', 'couples-membership', 'love', 'test-model', 10, date_trunc('month', now())) ~ '^[0-9]+$';
\echo 'v62-6) Members cannot read the allowance function directly (expect error):'
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f621';
select public.journey_allowance_used('00000000-0000-0000-0000-00000000f621', '00000000-0000-0000-0000-00000000f621', now());
reset role;
reset request.jwt.claim.sub;
delete from public.journey_usage where user_id in ('00000000-0000-0000-0000-00000000f621', '00000000-0000-0000-0000-00000000f622');
update public.journey_settings set enabled = false, paid_usage_authorized = false, company_monthly_limit_cents = null, voice_enabled = false;
