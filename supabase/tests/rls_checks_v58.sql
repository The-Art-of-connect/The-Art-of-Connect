-- Couples level up (directive 44 audit): a couple's Journey allowance never falls below Couples Membership's.
reset role;
reset request.jwt.claim.sub;
\echo 'v58-1) Dual Society with the Couples upgrade keeps at least the Couples Membership allowance, per couple and per person (expect t|t):'
select (select member_monthly_limit_cents from public.journey_effective_tier('dual-society', true)) >= (select member_monthly_limit_cents from public.journey_tier_limits where package_slug = 'couples-membership'),
       (select person_monthly_limit_cents from public.journey_effective_tier('dual-society', true)) >= (select person_monthly_limit_cents from public.journey_tier_limits where package_slug = 'couples-membership');
\echo 'v58-2) Without the couples experience, the plan''s own allowance applies (expect t):'
select (select member_monthly_limit_cents from public.journey_effective_tier('dual-society', false)) is not distinct from (select member_monthly_limit_cents from public.journey_tier_limits where package_slug = 'dual-society');
\echo 'v58-3) Elite Concierge couples are on a dollar allowance, never unlimited (directive 51) (expect t):'
select not coalesce((select unlimited_messages from public.journey_effective_tier('elite-concierge', true)), true);
