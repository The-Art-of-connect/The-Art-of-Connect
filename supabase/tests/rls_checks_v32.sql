-- Owner testing session: test accounts allowed while registration is closed, age rules kept, flag protected.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
update public.platform_settings set value = 'false' where key = 'registrations_open';
update public.platform_settings set value = '21' where key = 'minimum_member_age';
insert into public.test_signups (email) values ('tester-one@example.com'), ('tester-young@example.com');
\echo 'v32-1) A test account can register while registration is closed, and is flagged (expect t):'
insert into auth.users(id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-000000000091', 'tester-one@example.com', '{"date_of_birth":"1985-04-02","display_name":"Test One"}');
select is_test from public.profiles where id = '00000000-0000-0000-0000-000000000091';
\echo 'v32-2) Age rules still apply to test accounts (expect error):'
insert into auth.users(id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-000000000092', 'tester-young@example.com', jsonb_build_object('date_of_birth', (current_date - interval '19 years')::date::text));
\echo 'v32-3) Anyone else is still refused while registration is closed (expect error):'
insert into auth.users(id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-000000000093', 'public-person@example.com', '{"date_of_birth":"1985-04-02"}');
\echo 'v32-4) A member cannot remove their own test flag (expect error):'
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000091';
update public.profiles set is_test = false where id = '00000000-0000-0000-0000-000000000091';
\echo 'v32-5) Members cannot read the test sign-up list (expect 0):'
select count(*) from public.test_signups;
reset role;
reset request.jwt.claim.sub;
\echo 'v32-6) Elite Concierge is labeled By Invitation Only (expect By Invitation Only):'
select highlight from public.membership_packages where slug = 'elite-concierge';
