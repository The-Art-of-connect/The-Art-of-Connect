-- Voice owner tests now count against the owner's private testing budget (written chat already did).
create or replace function public.journey_voice_start(p_user uuid, p_holder uuid, p_package text, p_allowed_seconds integer, p_owner_test boolean, p_reserve numeric)
returns text language plpgsql security definer set search_path = public as $$
declare s public.journey_settings; spent numeric; new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('journey_spend'));
  select * into s from public.journey_settings;
  if not s.enabled or not s.paid_usage_authorized or not s.voice_enabled then return 'refused:off'; end if;
  if p_allowed_seconds < 30 then return 'refused:minutes'; end if;
  if exists (select 1 from public.journey_voice_sessions where user_id = p_user and ended_at is null and started_at > now() - make_interval(secs => allowed_seconds + 120)) then
    return 'refused:in_progress';
  end if;
  if s.company_monthly_limit_cents is null then return 'refused:company_budget_unset'; end if;
  -- Owner testing: written and voice tests share the owner's private monthly testing budget.
  if p_owner_test then
    if s.owner_test_monthly_limit_cents is null then return 'refused:test_budget_unset'; end if;
    if coalesce((select sum(public.journey_row_cents(u)) from public.journey_usage u where u.created_at >= date_trunc('month', now()) and u.is_owner_test), 0)
       + coalesce((select sum(coalesce(v.cost_cents, 0)) from public.journey_voice_sessions v where v.started_at >= date_trunc('month', now()) and v.is_owner_test), 0)
       + p_reserve > s.owner_test_monthly_limit_cents then return 'refused:test_budget'; end if;
  end if;
  select coalesce(sum(public.journey_row_cents(u)), 0) + coalesce((select sum(coalesce(v.cost_cents, 0)) from public.journey_voice_sessions v where v.started_at >= date_trunc('month', now())), 0)
    into spent from public.journey_usage u where u.created_at >= date_trunc('month', now());
  if spent + p_reserve > s.company_monthly_limit_cents then return 'refused:company_budget'; end if;
  insert into public.journey_voice_sessions (user_id, holder_id, package_slug, is_owner_test, allowed_seconds, cost_cents)
    values (p_user, p_holder, p_package, p_owner_test, p_allowed_seconds, p_reserve) returning id into new_id;
  return new_id::text;
end $$;
