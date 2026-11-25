-- Counseling & Wellness Center: universal access, counselor-set fees, clinical services closed until approved, private preferences.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
insert into counseling.counselors (user_id, professional_name, is_verified, is_listed) values ('00000000-0000-0000-0000-000000000061', 'Dr. Example', true, true) on conflict do nothing;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000061';
\echo 'v26-1) A counselor sets their own fee (expect 1):'
insert into counseling.fees (counselor_id, service, format, duration_minutes, fee_cents) values (auth.uid(), 'individual', 'virtual', 50, 12500);
select count(*) from counseling.fees;
\echo 'v26-2) A counselor cannot make themselves in-house (expect error):'
update counseling.counselors set provider_type = 'in_house' where user_id = auth.uid();
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000052';
\echo 'v26-3) Any member, whatever their society, sees listed counselors and their fees (expect t|1):'
select ((select count(*) from counseling.counselors) > 0)::text || '|' || (select count(*) from counseling.fees);
\echo 'v26-4) A member cannot change a counselor''s fees (expect 0):'
update counseling.fees set fee_cents = 1;
select count(*) from counseling.fees where fee_cents = 1;
\echo 'v26-5) Appointment requests stay closed until the owner opens the center (expect error):'
insert into counseling.clients (user_id, preferred_name) values (auth.uid(), 'Member');
insert into counseling.appointments (counselor_id, client_id, starts_at, ends_at, format) values ('00000000-0000-0000-0000-000000000061', auth.uid(), now() + interval '1 day', now() + interval '1 day 50 minutes', 'video');
\echo 'v26-6) A member saves private support preferences (expect either):'
insert into counseling.support_preferences (user_id, concerns, meeting) values (auth.uid(), '{grief}', 'either');
select meeting from counseling.support_preferences;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
\echo 'v26-7) The OWNER cannot read members'' support preferences (expect 0):'
select count(*) from counseling.support_preferences;
reset role;
