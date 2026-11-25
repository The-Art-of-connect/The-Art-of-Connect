-- Security and data checks for named membership packages (owner's pricing model).
-- Runs after the earlier rls_checks files on the same throwaway database.
reset role;
reset request.jwt.claim.sub;

\echo 'v7-1) Original prices preserved (expect 2999,3999,5999,9999,24999 | 2900,5900,9900):'
select string_agg(monthly_price_cents::text, ',' order by sort_order) from public.membership_packages
 where slug in ('professional-society','personal-society','dual-society','executive-private','elite-concierge');
select string_agg(monthly_price_cents::text, ',' order by sort_order) from public.professional_packages
 where slug in ('standard-provider','professional-provider','premium-provider');
\echo 'v7-2) Proposed prices (expect 2499,5999,4499,5499,7999):'
select string_agg(monthly_price_cents::text, ',' order by sort_order) from public.membership_packages
 where slug in ('art-of-becoming','couples-membership','business-life','life-love','complete-society');
\echo 'v7-3) Old Signature/Premier/Elite structure removed (expect 0):'
select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'membership_tiers';

set role anon;
\echo 'v7-4) Anonymous reads packages table directly (expect permission denied):'
select count(*) from public.membership_packages;
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
\echo 'v7-5) Member tries to change a package price or add a package (expect 0, then error):'
update public.membership_packages set monthly_price_cents = 1 where slug = 'dual-society';
select count(*) from public.membership_packages where monthly_price_cents = 1;
insert into public.membership_packages(slug, name, category, experiences, monthly_price_cents) values ('cheap','Cheap','single','{business}', 1);

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
\echo 'v7-6) Owner unpublishes, adds an unpriced active package, then publishing is refused (expect error):'
update public.pricing_config set is_published = false;
insert into public.membership_packages(slug, name, category, experiences) values ('founders','Founders Circle','exclusive','{business,counseling,relationships}');
update public.pricing_config set is_published = true;
\echo 'v7-7) Switching the unpriced package off allows publishing (expect true):'
update public.membership_packages set is_active = false where slug = 'founders';
update public.pricing_config set is_published = true;
select is_published from public.pricing_config;
\echo 'v7-8) Couples-only track without In Love is rejected (expect error):'
insert into public.membership_packages(slug, name, category, experiences, love_track) values ('bad-track','Bad','single','{business}','couple');
\echo 'v7-9) Exclusive membership must include all three experiences (expect error):'
insert into public.membership_packages(slug, name, category, experiences) values ('bad-excl','Bad','exclusive','{business}');
\echo 'v7-10) Annual incentive outside 1–12 months is rejected (expect error):'
update public.pricing_config set annual_months_charged = 13;
reset role;
reset request.jwt.claim.sub;
