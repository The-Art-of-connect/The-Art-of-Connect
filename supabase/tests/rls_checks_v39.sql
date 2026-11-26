-- Elite all-inclusive: unlimited Journey text with fair use; at-cost additional usage; no other charges.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
\echo 'v39-1) Elite has unlimited text with no monthly message cap; voice stays at 300 minutes (expect t||300):'
select unlimited_messages, monthly_messages, monthly_voice_minutes from public.journey_tier_limits where package_slug = 'elite-concierge';
\echo 'v39-2) Only Elite is all-access (expect elite-concierge):'
select string_agg(slug, ',') from public.membership_packages where all_access;
\echo 'v39-3) Voice minutes are priced at cost: 5c a minute plus 2.9% + 30c (expect 15:109,30:186,60:340,120:649):'
select string_agg(minutes || ':' || price_cents, ',' order by minutes) from public.journey_voice_packages;
\echo 'v39-4) Members cannot change usage pricing (expect error):'
insert into public.test_signups (email) values ('elite-u@example.com');
insert into auth.users(id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000e9', 'elite-u@example.com', '{"date_of_birth":"1975-01-01"}');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e9';
select public.journey_reprice_at_cost();
\echo 'v39-5) ...and cannot edit voice package prices (expect 0 rows changed):'
with u as (update public.journey_voice_packages set price_cents = 9999 returning 1) select count(*) from u;
reset role;
reset request.jwt.claim.sub;
\echo 'v39-6) An Elite member past 750 messages this month is still served (expect a reservation id, not refused):'
update public.journey_settings set enabled = true, paid_usage_authorized = true, company_monthly_limit_cents = 1000000;
update public.journey_tier_limits set member_monthly_limit_cents = 100000, tier_monthly_limit_cents = 1000000, fair_use_daily = 300 where package_slug = 'elite-concierge';
insert into public.journey_usage (user_id, holder_id, request_key, package_slug, mode, model, reserved_cents, status, created_at)
  select '00000000-0000-0000-0000-0000000000e9', '00000000-0000-0000-0000-0000000000e9', 'old-request-' || g, 'elite-concierge', 'concierge', 'gpt-4.1-mini', 0.5, 'completed', date_trunc('month', now()) + interval '1 minute'
  from generate_series(1, 800) g where date_trunc('month', now()) + interval '1 minute' < date_trunc('day', now());
select case when public.journey_reserve('00000000-0000-0000-0000-0000000000e9', '00000000-0000-0000-0000-0000000000e9', 'new-request-1', 'elite-concierge', 'concierge', 'gpt-4.1-mini', 0.5, date_trunc('month', now())) ~ '^[0-9]+$' then 'reserved' else 'refused' end;
\echo 'v39-7) Fair use still protects against abuse within a single day (expect refused:fair_use_day):'
update public.journey_usage set status = 'completed' where request_key = 'new-request-1';
update public.journey_tier_limits set fair_use_daily = 1, fair_use_hourly = 60 where package_slug = 'elite-concierge';
select public.journey_reserve('00000000-0000-0000-0000-0000000000e9', '00000000-0000-0000-0000-0000000000e9', 'new-request-2', 'elite-concierge', 'concierge', 'gpt-4.1-mini', 0.5, date_trunc('month', now()));
update public.journey_tier_limits set fair_use_daily = 300, member_monthly_limit_cents = null, tier_monthly_limit_cents = null where package_slug = 'elite-concierge';
update public.journey_settings set enabled = false, paid_usage_authorized = false, company_monthly_limit_cents = null;
\echo 'v39-8) Only Elite members may choose Elite-only profile visibility (expect error):'
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e9';
insert into public.social_profiles (user_id, profile_visibility) values ('00000000-0000-0000-0000-0000000000e9', 'elite');
\echo 'v39-9) A connections-only profile is hidden from members who are not connected (expect 0):'
insert into public.social_profiles (user_id, headline, profile_visibility) values ('00000000-0000-0000-0000-0000000000e9', 'Private person', 'connections');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a003';
select count(*) from public.social_profiles where user_id = '00000000-0000-0000-0000-0000000000e9';
\echo 'v39-10) Support requests from Elite members are prioritized automatically; others cannot claim priority (expect standard):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e9';
insert into public.support_tickets (user_id, email, subject, body, priority) values ('00000000-0000-0000-0000-0000000000e9', 'elite-u@example.com', 'Help', 'Question', 'elite');
select priority from public.support_tickets where user_id = '00000000-0000-0000-0000-0000000000e9';
reset role;
reset request.jwt.claim.sub;
\echo 'v39-11) An Elite member''s request is marked priority (expect elite):'
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
insert into public.support_tickets (user_id, email, subject, body) values ('00000000-0000-0000-0000-0000000000e1', 'elite-a@example.com', 'Concierge request', 'Hello');
select priority from public.support_tickets where user_id = '00000000-0000-0000-0000-0000000000e1';
reset role;
reset request.jwt.claim.sub;
