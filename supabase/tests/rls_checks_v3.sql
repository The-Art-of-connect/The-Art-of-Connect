-- Security checks for membership enrollment v3 (pricing, 40+ eligibility,
-- private dates of birth, referrals, promotions). Run after rls_checks.sql
-- and rls_checks_v2.sql on the same throwaway database.
reset role;
reset request.jwt.claim.sub;
grant all on all tables in schema public to anon, authenticated; -- Supabase default

\echo 'v3-1) Anonymous reads pricing tables directly (expect 0, 0):'
set role anon;
select (select count(*) from public.experience_offerings), (select count(*) from public.membership_tiers);
\echo 'v3-2) Public catalogue before publishing: names yes, prices hidden (expect 3, 3, null):'
select jsonb_array_length(p->'experiences'), jsonb_array_length(p->'tiers'), p->'experiences'->0->>'monthly_price_cents' from (select public.get_public_pricing(true) p) x;
reset role;

-- finance staff member
insert into public.signup_allowlist(email) values ('finance@example.com');
insert into auth.users(id,email) values ('00000000-0000-0000-0000-000000000007','finance@example.com');
insert into public.staff_roles(user_id, role) values ('00000000-0000-0000-0000-000000000007','finance');

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000007';
\echo 'v3-3) Finance sets prices (expect 3 rows updated):'
update public.experience_offerings set monthly_price_cents = 5000;
update public.membership_tiers set bundle_discount_percent = case experience_count when 2 then 10 when 3 then 20 else 0 end;
update public.pricing_config set annual_discount_percent = 15;
select count(*) from public.experience_offerings where monthly_price_cents = 5000;
\echo 'v3-4) Finance tries to publish (expect error):'
update public.pricing_config set is_published = true;
\echo 'v3-5) Finance preview sees draft prices (expect 5000, preview true):'
select p->'experiences'->0->>'monthly_price_cents', p->>'preview' from (select public.get_public_pricing(true) p) x;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
\echo 'v3-6) A member asking for a preview still sees no prices (expect null):'
select public.get_public_pricing(true)->'experiences'->0->>'monthly_price_cents';
\echo 'v3-7) Member tries to change prices (expect 0 rows):'
update public.experience_offerings set monthly_price_cents = 1;
select count(*) from public.experience_offerings where monthly_price_cents = 1;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
\echo 'v3-8) Owner publishes with an unpriced active add-on (expect error):'
insert into public.membership_addons(slug, name, billing, is_active) values ('concierge','Concierge','monthly', true);
update public.pricing_config set is_published = true;
\echo 'v3-9) Owner prices the add-on and publishes (expect true):'
update public.membership_addons set price_cents = 2500 where slug = 'concierge';
update public.pricing_config set is_published = true;
select is_published from public.pricing_config;
reset role;
set role anon;
\echo 'v3-10) Public now sees published prices (expect 5000, 15.00):'
select p->'experiences'->0->>'monthly_price_cents', p->>'annual_discount_percent' from (select public.get_public_pricing() p) x;
reset role;

-- Sign-up eligibility (as the auth service would insert users)
update public.platform_settings set value = 'true' where key = 'registrations_open';
\echo 'v3-11) Consumer sign-up without date of birth (expect error):'
insert into auth.users(email, raw_user_meta_data) values ('nodob@example.com', '{}');
\echo 'v3-12) Consumer aged 39 (expect error):'
insert into auth.users(email, raw_user_meta_data) values ('young@example.com', jsonb_build_object('date_of_birth', (current_date - interval '39 years')::date));
\echo 'v3-13) Consumer turning 40 today, with a referral code (expect ok):'
insert into auth.users(id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-000000000008','forty@example.com',
  jsonb_build_object('date_of_birth', (current_date - interval '40 years')::date, 'referral_code', (select referral_code from public.profiles where id = '00000000-0000-0000-0000-000000000002')));
select account_type, age_eligible from public.profiles where id = '00000000-0000-0000-0000-000000000008';
\echo 'v3-14) Date of birth removed from auth metadata (expect false):'
select raw_user_meta_data ? 'date_of_birth' from auth.users where id = '00000000-0000-0000-0000-000000000008';
\echo 'v3-15) Referral recorded for the referrer (expect 1):'
select count(*) from public.referrals where referred_user_id = '00000000-0000-0000-0000-000000000008' and referrer_id = '00000000-0000-0000-0000-000000000002';
\echo 'v3-16) Owner raises minimum age to 45; a 42-year-old is refused (expect error):'
update public.platform_settings set value = '45' where key = 'minimum_member_age';
insert into auth.users(email, raw_user_meta_data) values ('fortytwo@example.com', jsonb_build_object('date_of_birth', (current_date - interval '42 years')::date));
update public.platform_settings set value = '40' where key = 'minimum_member_age';
\echo 'v3-17) Professional sign-up while applications are closed (expect error):'
insert into auth.users(email, raw_user_meta_data) values ('pro@example.com', jsonb_build_object('account_type','professional','date_of_birth','1980-01-01'));

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000008';
\echo 'v3-18) Member reads own date of birth (expect 1):'
select count(*) from public.member_private;
\echo 'v3-19) Member tries to mark themselves age-eligible / change referral code (expect error):'
update public.profiles set referral_code = 'HACKED' where id = auth.uid();
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
\echo 'v3-20) OWNER reads members dates of birth (expect 0):'
select count(*) from public.member_private;
reset role;

insert into public.promotions(code, description, percent_off, is_active, is_public_offer) values ('FOUNDING40', 'Founding offer', 20, true, true);
insert into public.promotions(code, percent_off, is_active) values ('OLDCODE', 10, false);
reset request.jwt.claim.sub; -- a real anonymous visitor has no login
set role anon;
\echo 'v3-21) Valid promo code (expect 20), inactive code (expect null), public offers (expect 1):'
select public.check_promotion('founding40')->>'percent_off', public.check_promotion('OLDCODE'), jsonb_array_length(public.get_public_offers());
\echo 'v3-22) Anonymous reads promotions table directly (expect 0):'
select count(*) from public.promotions;
reset role;
