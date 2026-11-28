-- QA entitlement verification (owner request, November 28, 2026): research entitlement honors Elite badge expiry and
-- status, like every other Elite check. Entitlement still comes only from actual membership, never from price.
create or replace function public.intel_level(p uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from public.elite_badges b where b.user_id = p and b.status = 'active' and (b.expires_at is null or b.expires_at > now())) then 'elite'
    when exists (select 1 from public.subscriptions s where s.user_id = p and s.kind = 'member' and s.status in ('active', 'trialing') and s.tier_slug = 'elite-concierge') then 'elite'
    when exists (select 1 from public.subscriptions s where s.user_id = p and s.kind = 'member' and s.status in ('active', 'trialing') and s.tier_slug = 'executive-private') then 'executive'
    when exists (select 1 from public.staff_roles r where r.user_id = p and r.role = 'owner') then 'elite'
    else null end;
$$;
