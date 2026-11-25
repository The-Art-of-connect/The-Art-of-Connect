-- Journey AI: paid-only access, financial controls, allowances and privacy.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;

insert into public.signup_allowlist(email) values ('journey-partner@example.com'), ('journey-other@example.com');
insert into auth.users(id,email) values ('00000000-0000-0000-0000-000000000041','journey-partner@example.com'), ('00000000-0000-0000-0000-000000000042','journey-other@example.com');

\echo 'v12-1) Journey starts switched off with paid usage unauthorized and no budgets (expect f|f|||f):'
select enabled, paid_usage_authorized, company_monthly_limit_cents, owner_test_monthly_limit_cents, message_packages_published from public.journey_settings;
\echo 'v12-2) Initial allowances are seeded, one per membership, none unlimited (expect 10|150|250|750|0):'
select count(*), max(monthly_messages) filter (where package_slug = 'personal-society'), max(monthly_messages) filter (where package_slug = 'couples-membership'),
  max(monthly_messages), count(*) filter (where monthly_messages is null or member_monthly_limit_cents is not null) from public.journey_tier_limits;
\echo 'v12-3) Message packages are seeded at the proposed prices (expect 25:499,50:899,100:1499,250:2999):'
select string_agg(messages || ':' || price_cents, ',' order by messages) from public.journey_message_packages;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
\echo 'v12-4) A member cannot see Journey settings or unpublished package prices (expect 0|0):'
select (select count(*) from public.journey_settings), (select count(*) from public.journey_message_packages);
\echo 'v12-5) A member cannot switch Journey on or authorize spending (expect f|f):'
update public.journey_settings set enabled = true, paid_usage_authorized = true;
reset role;
select enabled, paid_usage_authorized from public.journey_settings;
set role authenticated;
\echo 'v12-6) A member cannot call the spending reservation directly (expect error):'
select public.journey_reserve(auth.uid(), auth.uid(), 'member-direct-1', 'personal-society', 'love', 'm', 0, now());
\echo 'v12-7) A member cannot give themselves purchased messages (expect error):'
insert into public.journey_message_credits (holder_id, source, messages) values (auth.uid(), 'owner_grant', 1000);

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000007';
\echo 'v12-8) Finance sets rates and limits but cannot authorize paid usage or publish prices (expect 0 updated):'
insert into public.journey_models (id, input_cents_per_million, output_cents_per_million, enabled) values ('test-model', 100, 400, true);
update public.journey_tier_limits set member_monthly_limit_cents = 500, tier_monthly_limit_cents = 50000, daily_messages = 100;
update public.journey_settings set paid_usage_authorized = true;
reset role;
select count(*) from public.journey_settings where paid_usage_authorized;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
\echo 'v12-9) The owner authorizes, and every change is audited (expect t|t|t):'
update public.journey_settings set enabled = true, paid_usage_authorized = true, default_model = 'test-model',
  company_monthly_limit_cents = 100000, owner_test_monthly_limit_cents = 1, per_minute_requests = 60;
reset role;
select enabled, paid_usage_authorized,
  exists (select 1 from public.financial_audit_log where table_name = 'journey_settings') and exists (select 1 from public.financial_audit_log where table_name = 'journey_tier_limits')
from public.journey_settings;

-- The server (service role) reserves on the member's behalf.
update public.journey_tier_limits set monthly_messages = 2 where package_slug = 'personal-society';
\echo 'v12-10) First request is reserved (expect a number):'
select public.journey_reserve('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'req-aaaa-1', 'personal-society', 'love', 'test-model', 1, now() - interval '1 day') ~ '^[0-9]+$';
\echo 'v12-11) A simultaneous second request is refused while the first is in flight (expect refused:in_flight):'
select public.journey_reserve('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'req-aaaa-2', 'personal-society', 'love', 'test-model', 1, now() - interval '1 day');
\echo 'v12-12) The same message sent twice is refused, not charged twice (expect refused:duplicate):'
select public.journey_complete(max(id), true, 100, 100, 0.5) from public.journey_usage;
select public.journey_reserve('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'req-aaaa-1', 'personal-society', 'love', 'test-model', 1, now() - interval '1 day');
\echo 'v12-13) A failed request does not use a message (expect t, then 1):'
select public.journey_reserve('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'req-aaaa-3', 'personal-society', 'love', 'test-model', 1, now() - interval '1 day') ~ '^[0-9]+$';
select public.journey_complete(max(id), false, null, null, null) from public.journey_usage;
select (public.journey_holder_usage('00000000-0000-0000-0000-000000000002', now() - interval '1 day') ->> 'period_messages')::int;
\echo 'v12-14) Second message uses the allowance; the third is refused (expect t, then refused:allowance):'
select public.journey_reserve('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'req-aaaa-4', 'personal-society', 'love', 'test-model', 1, now() - interval '1 day') ~ '^[0-9]+$';
select public.journey_complete(max(id), true, 100, 100, 0.5) from public.journey_usage;
select public.journey_reserve('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'req-aaaa-5', 'personal-society', 'love', 'test-model', 1, now() - interval '1 day');
\echo 'v12-15) A new billing period resets the included allowance; nothing rolls over (expect t):'
select public.journey_reserve('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'req-aaaa-6', 'personal-society', 'love', 'test-model', 1, now()) ~ '^[0-9]+$';
select public.journey_complete(max(id), false, null, null, null) from public.journey_usage;
\echo 'v12-16) A purchased message is used only after the allowance, and a failed request gives it back (expect t, 1, then 0):'
insert into public.journey_message_credits (holder_id, source, messages, amount_cents) values ('00000000-0000-0000-0000-000000000002', 'purchase', 1, 499);
select public.journey_reserve('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'req-aaaa-7', 'personal-society', 'love', 'test-model', 1, now() - interval '1 day') ~ '^[0-9]+$';
select used from public.journey_message_credits where holder_id = '00000000-0000-0000-0000-000000000002';
select public.journey_complete(max(id), false, null, null, null) from public.journey_usage;
select used from public.journey_message_credits where holder_id = '00000000-0000-0000-0000-000000000002';
\echo 'v12-17) Expired purchased messages cannot be used (expect refused:allowance):'
update public.journey_message_credits set expires_at = now() - interval '1 second' where holder_id = '00000000-0000-0000-0000-000000000002';
select public.journey_reserve('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'req-aaaa-8', 'personal-society', 'love', 'test-model', 1, now() - interval '1 day');

\echo 'v12-18) Couples share one allowance: the partner draws from the same pool (expect t, then refused:allowance):'
update public.journey_tier_limits set monthly_messages = 1 where package_slug = 'couples-membership';
select public.journey_reserve('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000042', 'couple-aa-1', 'couples-membership', 'love', 'test-model', 1, now() - interval '1 day') ~ '^[0-9]+$';
select public.journey_complete(max(id), true, 10, 10, 0.1) from public.journey_usage;
select public.journey_reserve('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000042', 'couple-aa-2', 'couples-membership', 'love', 'test-model', 1, now() - interval '1 day');

\echo 'v12-19) A member spending cap stops requests even with messages left (expect refused:member_budget):'
update public.journey_tier_limits set monthly_messages = 100, member_monthly_limit_cents = 1 where package_slug = 'life-love';
select public.journey_reserve('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000042', 'cap-aaaa-1', 'life-love', 'life', 'test-model', 5, now() - interval '1 day');
\echo 'v12-20) The company budget stops everyone (expect refused:company_budget):'
update public.journey_settings set company_monthly_limit_cents = 1;
select public.journey_reserve('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000042', 'co-aaaaa-1', 'elite-concierge', 'concierge', 'test-model', 1, now() - interval '1 day');
update public.journey_settings set company_monthly_limit_cents = 100000;
\echo 'v12-21) Owner testing has its own budget and never uses a member allowance (expect t, then refused:test_budget):'
select public.journey_reserve('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'test-aaaa-1', null, 'life', 'test-model', 0.6, now(), true) ~ '^[0-9]+$';
select public.journey_complete(max(id), true, 10, 10, 0.6) from public.journey_usage;
select public.journey_reserve('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'test-aaaa-2', null, 'life', 'test-model', 0.6, now(), true);
\echo 'v12-22) Emergency shutdown stops new requests immediately (expect refused:off):'
update public.journey_settings set enabled = false;
select public.journey_reserve('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000042', 'off-aaaa-1', 'elite-concierge', 'concierge', 'test-model', 1, now());
update public.journey_settings set enabled = true;
\echo 'v12-23) Abandoned requests are released so an allowance is never stuck (expect 1):'
insert into public.journey_usage (user_id, holder_id, request_key, package_slug, mode, model, reserved_cents, created_at)
  values ('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000042', 'stale-aaa-1', 'elite-concierge', 'concierge', 'test-model', 1, now() - interval '10 minutes');
select public.journey_release_stale();

-- Private conversations
insert into public.journey_conversations (id, user_id, mode) values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'love');
insert into public.journey_messages (conversation_id, user_id, role, content) values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'member', 'private');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
\echo 'v12-24) A member reads their own conversation (expect 1|1):'
select (select count(*) from public.journey_conversations), (select count(*) from public.journey_messages);
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000041';
\echo 'v12-25) Their partner cannot read it (expect 0|0):'
select (select count(*) from public.journey_conversations), (select count(*) from public.journey_messages);
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
\echo 'v12-26) The owner cannot read member conversations, only aggregate usage (expect 0|0|t):'
select (select count(*) from public.journey_conversations), (select count(*) from public.journey_messages), (select count(*) > 0 from public.journey_usage);
\echo 'v12-27) Members cannot write conversations or usage directly (expect error):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
insert into public.journey_usage (user_id, holder_id, request_key, mode, model, reserved_cents) values (auth.uid(), auth.uid(), 'self-aaaa-1', 'love', 'x', 0);
reset role;
reset request.jwt.claim.sub;
