-- Journey pay-as-you-go for Free members (directive 51 §4): credits only, one per reply, every safeguard applies.
reset role;
reset request.jwt.claim.sub;
insert into public.test_signups (email) values ('v66-free@example.com');
insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000f661', 'v66-free@example.com', '{"date_of_birth":"1980-01-01","display_name":"Free Test"}');
update public.journey_settings set enabled = true, paid_usage_authorized = true, company_monthly_limit_cents = 100000;
\echo 'v66-1) Without credits a Free member gets no personalized Journey (expect 0, refused:no_credits):'
select public.journey_credits_remaining('00000000-0000-0000-0000-00000000f661');
select public.journey_reserve_credit('00000000-0000-0000-0000-00000000f661', 'v66-key-001', 'life', 'test-model', 1);
-- Credits arrive only through a confirmed purchase (here inserted as the payment webhook would).
insert into public.journey_message_credits (holder_id, source, messages, amount_cents, kind) values ('00000000-0000-0000-0000-00000000f661', 'purchase', 2, 57, 'messages');
\echo 'v66-2) With 2 credits, each reply uses exactly one (expect t, 1, t, 0, refused:no_credits):'
select public.journey_reserve_credit('00000000-0000-0000-0000-00000000f661', 'v66-key-002', 'life', 'test-model', 1) ~ '^[0-9]+$';
update public.journey_usage set status = 'completed', cost_cents = 0.4 where request_key = 'v66-key-002';
select public.journey_credits_remaining('00000000-0000-0000-0000-00000000f661');
select public.journey_reserve_credit('00000000-0000-0000-0000-00000000f661', 'v66-key-003', 'life', 'test-model', 1) ~ '^[0-9]+$';
update public.journey_usage set status = 'completed', cost_cents = 0.4 where request_key = 'v66-key-003';
select public.journey_credits_remaining('00000000-0000-0000-0000-00000000f661');
select public.journey_reserve_credit('00000000-0000-0000-0000-00000000f661', 'v66-key-004', 'life', 'test-model', 1);
insert into public.journey_message_credits (holder_id, source, messages, amount_cents, kind) values ('00000000-0000-0000-0000-00000000f661', 'purchase', 1, 57, 'messages');
\echo 'v66-3) Credits work only in The Art of Becoming, never membership experiences (expect refused:mode):'
select public.journey_reserve_credit('00000000-0000-0000-0000-00000000f661', 'v66-key-005', 'concierge', 'test-model', 1);
\echo 'v66-4) The company budget and the emergency switch still stop everything (expect refused:company_budget, refused:off):'
update public.journey_settings set company_monthly_limit_cents = 0;
select public.journey_reserve_credit('00000000-0000-0000-0000-00000000f661', 'v66-key-006', 'life', 'test-model', 1);
update public.journey_settings set enabled = false;
select public.journey_reserve_credit('00000000-0000-0000-0000-00000000f661', 'v66-key-007', 'life', 'test-model', 1);
\echo 'v66-5) Members cannot call these directly (expect error):'
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f661';
select public.journey_reserve_credit('00000000-0000-0000-0000-00000000f661', 'v66-key-008', 'life', 'test-model', 1);
reset role;
reset request.jwt.claim.sub;
delete from public.journey_usage where user_id = '00000000-0000-0000-0000-00000000f661';
delete from public.journey_message_credits where holder_id = '00000000-0000-0000-0000-00000000f661';
update public.journey_settings set enabled = false, paid_usage_authorized = false, company_monthly_limit_cents = null;
