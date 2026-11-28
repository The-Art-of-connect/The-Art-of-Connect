-- Journey pay-as-you-go for Free members (directive 51 §4, Audit 3 finding 3).
-- A Free member has a $0 included allowance. Journey credits they buy (the published Journey Plus packages, priced at
-- our cost) are the only way they use personalized Journey: one credit per reply, never more. Every company safeguard
-- still applies (emergency switch, duplicate and in-flight guards, rate limit, fair use, company monthly budget).
-- Credits are granted only after Stripe confirms payment (journey_grant_purchase), and purchases stay closed until live
-- payments are on. Nothing here opens enrollment or charges anyone.
create or replace function public.journey_reserve_credit(
  p_user uuid, p_request_key text, p_mode text, p_model text, p_reserve numeric)
returns text language plpgsql security definer set search_path = public as $$
declare s public.journey_settings; v numeric; n integer; credit uuid; new_id bigint;
  month_start timestamptz := date_trunc('month', now());
begin
  perform pg_advisory_xact_lock(hashtext('journey_spend'));
  select * into s from public.journey_settings;
  if not s.enabled or not s.paid_usage_authorized then return 'refused:off'; end if;
  if p_mode <> 'life' then return 'refused:mode'; end if;
  if exists (select 1 from public.journey_usage where holder_id = p_user and request_key = p_request_key) then return 'refused:duplicate'; end if;
  if exists (select 1 from public.journey_usage where holder_id = p_user and status = 'reserved' and created_at > now() - interval '5 minutes') then return 'refused:in_flight'; end if;
  if (select count(*) from public.journey_usage where user_id = p_user and created_at > now() - interval '1 minute') >= s.per_minute_requests then return 'refused:rate'; end if;
  if (select count(*) from public.journey_usage where holder_id = p_user and created_at > now() - interval '1 hour' and status <> 'failed') >= 60 then return 'refused:fair_use_hour'; end if;
  if (select count(*) from public.journey_usage where holder_id = p_user and created_at >= date_trunc('day', now()) and status <> 'failed') >= 300 then return 'refused:fair_use_day'; end if;
  if s.company_monthly_limit_cents is null then return 'refused:company_budget_unset'; end if;
  select coalesce(sum(public.journey_row_cents(u)), 0) into v from public.journey_usage u where u.created_at >= month_start;
  v := v + coalesce((select sum(coalesce(cost_cents, 0)) from public.journey_voice_sessions where started_at >= month_start), 0);
  if v + p_reserve > s.company_monthly_limit_cents then return 'refused:company_budget'; end if;
  select id into credit from public.journey_message_credits
    where holder_id = p_user and kind = 'messages' and used < messages and (expires_at is null or expires_at > now())
    order by expires_at nulls last, created_at limit 1 for update;
  if credit is null then return 'refused:no_credits'; end if;
  update public.journey_message_credits set used = used + 1 where id = credit;
  insert into public.journey_usage (user_id, holder_id, request_key, package_slug, credit_id, mode, model, reserved_cents, is_owner_test)
    values (p_user, p_user, p_request_key, null, credit, 'life', p_model, p_reserve, false) returning id into new_id;
  return new_id::text;
end $$;
revoke all on function public.journey_reserve_credit(uuid, text, text, text, numeric) from public, anon, authenticated;
grant execute on function public.journey_reserve_credit(uuid, text, text, text, numeric) to service_role;

/** A member's unexpired purchased Journey credits (messages). Server use only. */
create or replace function public.journey_credits_remaining(p_user uuid)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(sum(messages - used), 0)::integer from public.journey_message_credits
  where holder_id = p_user and kind = 'messages' and (expires_at is null or expires_at > now());
$$;
revoke all on function public.journey_credits_remaining(uuid) from public, anon, authenticated;
grant execute on function public.journey_credits_remaining(uuid) to service_role;
