-- Couples level up (directive 44 audit): a couple's Journey allowance never falls below Couples Membership's.
reset role;
reset request.jwt.claim.sub;
\echo 'v58-1) Dual Society with the Couples upgrade keeps at least the Couples Membership allowance (expect t|t):'
select (select monthly_messages from public.journey_effective_tier('dual-society', true)) >= (select monthly_messages from public.journey_tier_limits where package_slug = 'couples-membership'),
       (select monthly_voice_minutes from public.journey_effective_tier('dual-society', true)) >= coalesce((select monthly_voice_minutes from public.journey_tier_limits where package_slug = 'couples-membership'), 0);
\echo 'v58-2) Without the couples experience, the plan''s own allowance applies (expect t):'
select (select monthly_messages from public.journey_effective_tier('dual-society', false)) is not distinct from (select monthly_messages from public.journey_tier_limits where package_slug = 'dual-society');
\echo 'v58-3) Elite Concierge stays unlimited for couples (expect t):'
select coalesce((select unlimited_messages from public.journey_effective_tier('elite-concierge', true)), true);
