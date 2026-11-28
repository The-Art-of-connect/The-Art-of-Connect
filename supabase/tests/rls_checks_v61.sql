-- Directive 49: the owner-authorized pre-launch Journey testing exception (QA account only, budgets enforced).
reset role;
reset request.jwt.claim.sub;
insert into public.test_signups (email) values ('v61-qa@example.com'), ('v61-real@example.com');
insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000f611', 'v61-qa@example.com', '{"date_of_birth":"1975-01-01","display_name":"QA Test"}'),
  ('00000000-0000-0000-0000-00000000f612', 'v61-real@example.com', '{"date_of_birth":"1975-01-01","display_name":"Member Test"}');
insert into public.qa_switchers (user_id) values ('00000000-0000-0000-0000-00000000f611');
\echo 'v61-1) The exception is off until the owner turns it on (expect off):'
select public.journey_qa_allowed('00000000-0000-0000-0000-00000000f611', 0);
update public.platform_settings set value = 'true' where key = 'qa_journey_testing';
\echo 'v61-2) On: the QA account may test; a member who is not the QA account never can (expect ok, not_qa):'
select public.journey_qa_allowed('00000000-0000-0000-0000-00000000f611', 0);
select public.journey_qa_allowed('00000000-0000-0000-0000-00000000f612', 0);
\echo 'v61-3) A staff account is never the QA exception (expect not_qa):'
insert into public.staff_roles (user_id, role) values ('00000000-0000-0000-0000-00000000f612', 'owner');
select public.journey_qa_allowed('00000000-0000-0000-0000-00000000f612', 0);
delete from public.staff_roles where user_id = '00000000-0000-0000-0000-00000000f612';
\echo 'v61-4) The daily QA testing budget ($5) is enforced (expect qa_day_budget, then ok for a small request):'
insert into public.journey_usage (user_id, holder_id, request_key, package_slug, mode, model, status, reserved_cents, cost_cents)
  values ('00000000-0000-0000-0000-00000000f611', '00000000-0000-0000-0000-00000000f611', 'v61-key-0001', 'executive-private', 'life', 'test', 'completed', 490, 490);
select public.journey_qa_allowed('00000000-0000-0000-0000-00000000f611', 20);
select public.journey_qa_allowed('00000000-0000-0000-0000-00000000f611', 5);
\echo 'v61-5) Members cannot call the check themselves (expect error):'
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f611';
select public.journey_qa_allowed('00000000-0000-0000-0000-00000000f611', 0);
reset role;
reset request.jwt.claim.sub;
update public.platform_settings set value = 'false' where key = 'qa_journey_testing';
