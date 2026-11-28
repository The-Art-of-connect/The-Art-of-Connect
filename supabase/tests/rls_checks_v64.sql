-- Directive 51 clarification 4: counseling appointment booking and Business Launch Center formation requests.
reset role;
reset request.jwt.claim.sub;
insert into public.test_signups (email) values ('v64-c@example.com'), ('v64-r@example.com'), ('v64-a@example.com'), ('v64-b@example.com'), ('v64-s@example.com');
insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000f641', 'v64-c@example.com', '{"date_of_birth":"1975-01-01","display_name":"Fictional Counselor"}'),
  ('00000000-0000-0000-0000-00000000f642', 'v64-r@example.com', '{"date_of_birth":"1975-01-01","display_name":"Real Counselor"}'),
  ('00000000-0000-0000-0000-00000000f643', 'v64-a@example.com', '{"date_of_birth":"1975-01-01","display_name":"Member A"}'),
  ('00000000-0000-0000-0000-00000000f644', 'v64-b@example.com', '{"date_of_birth":"1975-01-01","display_name":"Member B"}'),
  ('00000000-0000-0000-0000-00000000f645', 'v64-s@example.com', '{"date_of_birth":"1975-01-01","display_name":"Staff S"}');
-- f642 stands for a real (non-test) counselor.
update public.profiles set is_test = false where id = '00000000-0000-0000-0000-00000000f642';
insert into public.staff_roles (user_id, role) values ('00000000-0000-0000-0000-00000000f645', 'owner');
insert into counseling.counselors (user_id, professional_name, is_verified, is_listed, offers_virtual) values
  ('00000000-0000-0000-0000-00000000f641', 'Fictional Counselor', true, true, true),
  ('00000000-0000-0000-0000-00000000f642', 'Real Counselor', true, true, true);
insert into counseling.availability (counselor_id, weekday, start_time, end_time, timezone)
  select c, d, '09:00', '17:00', 'America/New_York' from generate_series(0, 6) d,
    unnest(array['00000000-0000-0000-0000-00000000f641', '00000000-0000-0000-0000-00000000f642']::uuid[]) c;
insert into counseling.fees (id, counselor_id, service, duration_minutes, fee_cents) values
  ('00000000-0000-0000-0000-00000000f6f1', '00000000-0000-0000-0000-00000000f641', 'individual', 50, 12000),
  ('00000000-0000-0000-0000-00000000f6f2', '00000000-0000-0000-0000-00000000f642', 'individual', 50, 12000);
update public.platform_settings set value = 'false' where key in ('counseling_live', 'counseling_center_open');

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f643';
select starts_at as slot from public.counseling_open_slots('00000000-0000-0000-0000-00000000f641', 50, 21) limit 1 \gset
\echo 'v64-1) Before launch a member cannot request an appointment (expect not_open, then error):'
select public.counseling_booking_status('00000000-0000-0000-0000-00000000f641');
select public.counseling_request_appointment('00000000-0000-0000-0000-00000000f641', '00000000-0000-0000-0000-00000000f6f1', :'slot', 'video', 'A');
\echo 'v64-2) Before launch staff may test only with a fictional counselor (expect fictional_only error, then t):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f645';
select public.counseling_request_appointment('00000000-0000-0000-0000-00000000f642', '00000000-0000-0000-0000-00000000f6f2', :'slot', 'video', 'S');
select public.counseling_request_appointment('00000000-0000-0000-0000-00000000f641', '00000000-0000-0000-0000-00000000f6f1', :'slot', 'video', 'S') is not null;
\echo 'v64-3) The tested time is no longer offered to anyone (expect 0):'
select count(*) from public.counseling_open_slots('00000000-0000-0000-0000-00000000f641', 50, 21) where starts_at = :'slot';
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f645';
select public.counseling_cancel_appointment((select id from counseling.appointments where client_id = auth.uid() and status = 'requested'));
\echo 'v64-4) After the tester cancels, the time is open again (expect 1):'
select count(*) from public.counseling_open_slots('00000000-0000-0000-0000-00000000f641', 50, 21) where starts_at = :'slot';

reset role;
reset request.jwt.claim.sub;
update public.platform_settings set value = 'true' where key in ('counseling_live', 'counseling_center_open');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f643';
\echo 'v64-5) Once launched a member requests a time and reads it back (expect open, t, then requested|video|12000|A Client):'
select public.counseling_booking_status('00000000-0000-0000-0000-00000000f641');
select public.counseling_request_appointment('00000000-0000-0000-0000-00000000f641', '00000000-0000-0000-0000-00000000f6f1', :'slot', 'video', 'A Client') is not null;
select a.status, a.format, a.quoted_fee_cents, c.preferred_name from counseling.appointments a join counseling.clients c on c.user_id = a.client_id where a.client_id = auth.uid();
\echo 'v64-6) Another member cannot take the same time (expect SLOT_UNAVAILABLE error):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f644';
select public.counseling_request_appointment('00000000-0000-0000-0000-00000000f641', '00000000-0000-0000-0000-00000000f6f1', :'slot', 'video', 'B');
\echo 'v64-7) ...and cannot read the first member''s appointment or write appointments directly (expect 0, then error):'
select count(*) from counseling.appointments where client_id = '00000000-0000-0000-0000-00000000f643';
insert into counseling.appointments (counselor_id, client_id, starts_at, ends_at, format) values ('00000000-0000-0000-0000-00000000f641', '00000000-0000-0000-0000-00000000f644', :'slot', :'slot'::timestamptz + interval '50 minutes', 'video');
\echo 'v64-8) Double booking is refused by the database itself, even for an overlapping server write (expect SLOT_TAKEN error):'
reset role;
reset request.jwt.claim.sub;
insert into counseling.clients (user_id, preferred_name) values ('00000000-0000-0000-0000-00000000f644', 'B') on conflict do nothing;
insert into counseling.appointments (counselor_id, client_id, starts_at, ends_at, format) values ('00000000-0000-0000-0000-00000000f641', '00000000-0000-0000-0000-00000000f644', :'slot'::timestamptz + interval '20 minutes', :'slot'::timestamptz + interval '70 minutes', 'video');
\echo 'v64-9) The counselor sees only their own clients'' appointments and confirms; the member is told without clinical details (expect 1, 0, then confirmed|Your appointment is confirmed):'
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f641';
select count(*) from counseling.appointments where client_id = '00000000-0000-0000-0000-00000000f643';
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f642';
select count(*) from counseling.appointments where client_id = '00000000-0000-0000-0000-00000000f643';
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f641';
select public.counseling_respond_appointment((select id from counseling.appointments where client_id = '00000000-0000-0000-0000-00000000f643' and status = 'requested'), 'confirm');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f643';
select a.status, n.title from counseling.appointments a join public.member_notices n on n.ref_id = a.id and n.user_id = auth.uid() where a.client_id = auth.uid();
\echo 'v64-10) A member cannot confirm their own request or answer for a counselor (expect NOT_FOUND error):'
select public.counseling_respond_appointment((select id from counseling.appointments where client_id = auth.uid() limit 1), 'confirm');
\echo 'v64-11) The member cancels their confirmed appointment (expect canceled|client):'
select public.counseling_cancel_appointment((select id from counseling.appointments where client_id = auth.uid() and status = 'confirmed'));
select status, canceled_by from counseling.appointments where client_id = auth.uid();
reset role;
reset request.jwt.claim.sub;
update public.platform_settings set value = 'false' where key in ('counseling_live', 'counseling_center_open');

-- Formation requests
insert into public.member_businesses (id, user_id, name, entity_type, state) values
  ('00000000-0000-0000-0000-00000000f6b1', '00000000-0000-0000-0000-00000000f643', 'A Ventures', 'llc', 'DE'),
  ('00000000-0000-0000-0000-00000000f6b2', '00000000-0000-0000-0000-00000000f644', 'B Holdings', 'corporation', 'WY');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f643';
\echo 'v64-12) A member starts a formation order, sends it as a request and reads it back (expect draft|self_filed|t|A Ventures):'
insert into public.formation_orders (id, user_id, business_id, provider) values ('00000000-0000-0000-0000-00000000f6d1', auth.uid(), '00000000-0000-0000-0000-00000000f6b1', 'self_filed');
update public.formation_orders set requested_at = now() where id = '00000000-0000-0000-0000-00000000f6d1';
select o.status, o.provider, o.requested_at is not null, b.name from public.formation_orders o join public.member_businesses b on b.id = o.business_id where o.user_id = auth.uid();
\echo 'v64-13) Once sent, its details cannot be changed (expect error):'
update public.formation_orders set provider = 'bizee' where id = '00000000-0000-0000-0000-00000000f6d1';
\echo 'v64-14) A member cannot mark their own order processing or completed (expect two errors):'
update public.formation_orders set status = 'processing' where id = '00000000-0000-0000-0000-00000000f6d1';
update public.formation_orders set status = 'completed' where id = '00000000-0000-0000-0000-00000000f6d1';
\echo 'v64-15) Another member cannot read or change it (expect 0, then 0 rows updated):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f644';
select count(*) from public.formation_orders where id = '00000000-0000-0000-0000-00000000f6d1';
with u as (update public.formation_orders set status = 'cancelled' where id = '00000000-0000-0000-0000-00000000f6d1' returning 1) select count(*) from u;
\echo 'v64-16) Members cannot use the review function (expect error):'
select public.formation_order_review('00000000-0000-0000-0000-00000000f6d1', 'processing', null);
\echo 'v64-17) A draft not yet sent stays private from staff and cannot be reviewed (expect 0):'
insert into public.formation_orders (id, user_id, business_id, provider) values ('00000000-0000-0000-0000-00000000f6d2', auth.uid(), '00000000-0000-0000-0000-00000000f6b2', 'self_filed');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f645';
select count(*) from public.formation_orders where id = '00000000-0000-0000-0000-00000000f6d2';
\echo 'v64-18) The owner marks the request processing; the member is notified (expect processing|Your formation request was updated):'
select public.formation_order_review('00000000-0000-0000-0000-00000000f6d1', 'processing', 'Reviewing the details.');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f643';
select o.status, n.title from public.formation_orders o join public.member_notices n on n.ref_id = o.id and n.user_id = auth.uid() where o.id = '00000000-0000-0000-0000-00000000f6d1';
\echo 'v64-19) Once processing, the member can no longer cancel it (expect error):'
update public.formation_orders set status = 'cancelled' where id = '00000000-0000-0000-0000-00000000f6d1';
\echo 'v64-20) A draft can be cancelled by its member (expect cancelled):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f644';
update public.formation_orders set status = 'cancelled' where id = '00000000-0000-0000-0000-00000000f6d2';
select status from public.formation_orders where id = '00000000-0000-0000-0000-00000000f6d2';
\echo 'v64-21) A review cannot authorize an order or approve fees (expect error):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f645';
select public.formation_order_review('00000000-0000-0000-0000-00000000f6d1', 'authorized', null);
reset role;
reset request.jwt.claim.sub;
