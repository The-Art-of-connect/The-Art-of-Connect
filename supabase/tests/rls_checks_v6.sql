-- Security Center checks (v6). Run after the earlier files on the same database.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
-- server (service role) records five failed sign-ins for one account
insert into public.security_events (event_type, email, ip_hash)
select 'login_failed', 'member@example.com', 'aaaaaaaaaaaaaaaa' from generate_series(1, 5);
insert into auth.sessions (user_id, user_agent, ip, refresh_token_hmac_key) values
  ('00000000-0000-0000-0000-000000000002', 'Safari on iPhone', '203.0.113.7', 'SECRET-HMAC'),
  ('00000000-0000-0000-0000-000000000006', 'Chrome on Mac', '198.51.100.4', 'SECRET-HMAC');
\echo 'v6-1) Five failed sign-ins raise a high-severity alert (expect 1):'
select count(*) from public.security_alerts where kind = 'brute_force_account' and subject = 'member@example.com' and severity = 'high';

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002","aal":"aal1"}';
\echo 'v6-2) Member reads security events and alerts (expect 0, 0):'
select (select count(*) from public.security_events), (select count(*) from public.security_alerts);
\echo 'v6-3) Member tries to write a security event (expect permission denied):'
insert into public.security_events (event_type) values ('login_succeeded');
\echo 'v6-4) Member lists own sessions — coarse location only, no secrets (expect 1, 203.0.x.x):'
select count(*), max(approx_ip) from public.list_sessions('00000000-0000-0000-0000-000000000002');
\echo 'v6-5) Member lists another member''s sessions (expect error):'
select count(*) from public.list_sessions('00000000-0000-0000-0000-000000000006');
\echo 'v6-6) Member asks for staff MFA status (expect error):'
select count(*) from public.staff_security_status();
\echo 'v6-7) Member signs out of all own devices (expect 1):'
select public.revoke_sessions('00000000-0000-0000-0000-000000000002');

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","aal":"aal1"}';
\echo 'v6-8) Owner WITHOUT MFA revokes a member''s sessions (expect error):'
select public.revoke_sessions('00000000-0000-0000-0000-000000000006');
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","aal":"aal2"}';
\echo 'v6-9) Owner with MFA sees the alert and revokes a member''s sessions (expect 1, 1):'
select (select count(*) from public.security_alerts where kind = 'brute_force_account'), public.revoke_sessions('00000000-0000-0000-0000-000000000006');
\echo 'v6-10) Owner with MFA sees staff MFA status (expect at least 1 row):'
select count(*) >= 1 from public.staff_security_status();
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
set role anon;
\echo 'v6-11) Anonymous visitor lists sessions (expect permission denied):'
select count(*) from public.list_sessions('00000000-0000-0000-0000-000000000002');
reset role;
