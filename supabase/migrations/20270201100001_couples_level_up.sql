-- Progressive membership benefits audit (founder directives 44 and follow-up, November 28, 2026).
-- Relationship status never blocks a level up: a couple may keep the couples experience with any membership that includes
-- In Love (the Couples upgrade with Dual Society or Executive Private; included in Elite Concierge). Journey allowances never
-- fall when a couple levels up: a couple's allowance is the higher of their plan's and Couples Membership's.
create or replace function public.journey_effective_tier(p_slug text, p_couples boolean default false)
returns setof public.journey_tier_limits language sql stable security definer set search_path = public as $$
  with base as (select * from public.journey_tier_limits where package_slug = p_slug),
  cpl as (select * from public.journey_tier_limits where package_slug = 'couples-membership' and p_couples and p_slug <> 'couples-membership')
  select b.package_slug,
    case when b.unlimited_messages or coalesce(c.unlimited_messages, false) then b.monthly_messages else greatest(b.monthly_messages, c.monthly_messages) end,
    greatest(b.daily_messages, c.daily_messages),
    case when b.member_monthly_limit_cents is null or (c.package_slug is not null and c.member_monthly_limit_cents is null) then null else greatest(b.member_monthly_limit_cents, c.member_monthly_limit_cents) end,
    b.tier_monthly_limit_cents, b.max_output_tokens, b.model, b.updated_at,
    greatest(b.monthly_voice_minutes, c.monthly_voice_minutes),
    b.unlimited_messages or coalesce(c.unlimited_messages, false),
    greatest(b.fair_use_daily, c.fair_use_daily), greatest(b.fair_use_hourly, c.fair_use_hourly)
  from base b left join cpl c on true;
$$;
revoke all on function public.journey_effective_tier(text, boolean) from public, anon;
grant execute on function public.journey_effective_tier(text, boolean) to authenticated, service_role;
