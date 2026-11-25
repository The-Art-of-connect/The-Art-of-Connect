-- Financial permission structure and financial audit trail.
reset role;
reset request.jwt.claim.sub;

insert into public.signup_allowlist(email) values ('exec@example.com'), ('staff@example.com');
insert into auth.users(id,email) values ('00000000-0000-0000-0000-000000000021','exec@example.com'), ('00000000-0000-0000-0000-000000000022','staff@example.com');
insert into public.staff_roles(user_id, role) values ('00000000-0000-0000-0000-000000000021','executive'), ('00000000-0000-0000-0000-000000000022','admin');
insert into public.payments(user_id, amount_cents, currency, status, livemode, stripe_payment_intent_id)
  values ('00000000-0000-0000-0000-000000000002', 2999, 'usd', 'succeeded', false, 'pi_test_v8');
insert into public.promotions(code, percent_off, is_active) values ('V8CODE', 10, false);

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000021';
\echo 'v8-1) Executive views payments and promotions (expect 1, 1):'
select (select count(*) from public.payments where stripe_payment_intent_id = 'pi_test_v8'), (select count(*) from public.promotions where code = 'V8CODE');
\echo 'v8-2) Executive tries to change a package price and a promotion (expect 0, 0):'
update public.membership_packages set monthly_price_cents = 1 where slug = 'dual-society';
update public.promotions set percent_off = 90 where code = 'V8CODE';
select (select count(*) from public.membership_packages where monthly_price_cents = 1), (select count(*) from public.promotions where percent_off = 90);
\echo 'v8-3) Executive previews draft prices but cannot read the audit trail (expect true, 0):'
select public.can_preview_pricing(), (select count(*) from public.financial_audit_log);
\echo 'v8-4) Executive tries to open public enrollment (expect 0 rows changed):'
update public.platform_settings set value = 'true' where key = 'payments_live';
select count(*) from public.platform_settings where key = 'payments_live' and value = 'true'::jsonb;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000022';
\echo 'v8-5) General staff (admin) sees no payments, subscriptions or promotions (expect 0, 0, 0):'
select (select count(*) from public.payments), (select count(*) from public.subscriptions), (select count(*) from public.promotions);
\echo 'v8-6) General staff cannot preview draft prices (expect false):'
select public.can_preview_pricing();

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000007';
\echo 'v8-7) Finance prepares a price change; it is logged with who, previous and new value (expect finance@example.com|finance|5999|6499):'
update public.membership_packages set monthly_price_cents = 6499 where slug = 'dual-society';
select actor_email, actor_roles, previous_values->>'monthly_price_cents', new_values->>'monthly_price_cents'
  from public.financial_audit_log where table_name = 'membership_packages' and record_key = 'dual-society' order by id desc limit 1;
\echo 'v8-8) Finance cannot change launch switches (expect 0):'
update public.platform_settings set value = 'true' where key = 'registrations_open';
select count(*) from public.financial_audit_log where table_name = 'platform_settings' and actor_email = 'finance@example.com';

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
\echo 'v8-9) A member cannot read the financial audit trail (expect 0):'
select count(*) from public.financial_audit_log;
reset role;
reset request.jwt.claim.sub;

\echo 'v8-10) System (webhook) changes are logged as system (expect system|succeeded|refunded):'
update public.payments set status = 'refunded', refunded_amount_cents = 2999 where stripe_payment_intent_id = 'pi_test_v8';
select source, previous_values->>'status', new_values->>'status' from public.financial_audit_log where table_name = 'payments' and operation = 'UPDATE' order by id desc limit 1;
\echo 'v8-11) The audit trail cannot be altered or deleted, even by the database superuser (expect error, error):'
update public.financial_audit_log set new_values = '{}' where id = (select max(id) from public.financial_audit_log);
delete from public.financial_audit_log;
\echo 'v8-12) Team permission changes are logged (expect INSERT):'
select operation from public.financial_audit_log where table_name = 'staff_roles' order by id desc limit 1;
