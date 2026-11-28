-- Directive 51, section 5: monthly included Journey AI cost allowances per membership (company AI cost, not prices).
-- Text and voice draw from one dollar balance measured at actual model cost. No message counts, no voice-minute
-- conversions, no unlimited usage. Couples: $5 per person, $10 per couple. Purchased credits still apply after.
alter table public.journey_tier_limits add column if not exists person_monthly_limit_cents numeric(12, 4) check (person_monthly_limit_cents >= 0);

-- A tier is in "allowance" mode when it has a dollar allowance and no message count (and is not the legacy unlimited mode).
update public.journey_tier_limits set unlimited_messages = false, monthly_messages = null, daily_messages = null,
  member_monthly_limit_cents = v.holder, person_monthly_limit_cents = v.person, monthly_voice_minutes = null
from (values ('personal-society', 500, 500), ('couples-membership', 1000, 500), ('professional-society', 1000, 1000),
             ('dual-society', 1000, 1000), ('executive-private', 1500, 1500), ('elite-concierge', 2500, 2500)) v(slug, holder, person)
where package_slug = v.slug;

-- The effective tier keeps every couple's allowance (directive 44) and carries the per-person ceiling.
drop function if exists public.journey_effective_tier(text, boolean);
create function public.journey_effective_tier(p_slug text, p_couples boolean default false)
returns setof public.journey_tier_limits language sql stable security definer set search_path = public as $$
  with base as (select * from public.journey_tier_limits where package_slug = p_slug),
  cpl as (select * from public.journey_tier_limits where package_slug = 'couples-membership' and p_couples and p_slug <> 'couples-membership')
  select b.package_slug,
    case when b.unlimited_messages or coalesce(c.unlimited_messages, false) then b.monthly_messages
         when b.monthly_messages is null then null else greatest(b.monthly_messages, c.monthly_messages) end,
    case when b.monthly_messages is null then null else greatest(b.daily_messages, c.daily_messages) end,
    case when b.member_monthly_limit_cents is null or (c.package_slug is not null and c.member_monthly_limit_cents is null) then null else greatest(b.member_monthly_limit_cents, c.member_monthly_limit_cents) end,
    b.tier_monthly_limit_cents, b.max_output_tokens, b.model, b.updated_at,
    greatest(b.monthly_voice_minutes, c.monthly_voice_minutes),
    b.unlimited_messages or coalesce(c.unlimited_messages, false),
    greatest(b.fair_use_daily, c.fair_use_daily), greatest(b.fair_use_hourly, c.fair_use_hourly),
    -- Per-person ceiling: a couple keeps at least the Couples share; otherwise the plan's own.
    case when c.package_slug is not null then greatest(b.person_monthly_limit_cents, c.person_monthly_limit_cents) else b.person_monthly_limit_cents end
  from base b left join cpl c on true;
$$;
revoke all on function public.journey_effective_tier(text, boolean) from public, anon;
grant execute on function public.journey_effective_tier(text, boolean) to authenticated, service_role;

/** Actual AI cost used this period (text and voice), for the allowance holder and for one person. */
create or replace function public.journey_allowance_used(p_holder uuid, p_user uuid, p_period_start timestamptz)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'holder_cents', coalesce((select sum(public.journey_row_cents(u)) from public.journey_usage u where u.holder_id = p_holder and u.created_at >= p_period_start and u.credit_id is null and not u.is_owner_test), 0)
                  + coalesce((select sum(coalesce(v.cost_cents, 0)) from public.journey_voice_sessions v where v.holder_id = p_holder and v.started_at >= p_period_start and not v.is_owner_test), 0),
    'person_cents', coalesce((select sum(public.journey_row_cents(u)) from public.journey_usage u where u.user_id = p_user and u.holder_id = p_holder and u.created_at >= p_period_start and u.credit_id is null and not u.is_owner_test), 0)
                  + coalesce((select sum(coalesce(v.cost_cents, 0)) from public.journey_voice_sessions v where v.user_id = p_user and v.holder_id = p_holder and v.started_at >= p_period_start and not v.is_owner_test), 0));
$$;
revoke all on function public.journey_allowance_used(uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.journey_allowance_used(uuid, uuid, timestamptz) to service_role;

-- The reservation re-checks everything atomically. Allowance mode is new; message and legacy unlimited modes are unchanged.
create or replace function public.journey_reserve(
  p_user uuid, p_holder uuid, p_request_key text, p_package text, p_mode text, p_model text,
  p_reserve numeric, p_period_start timestamptz, p_owner_test boolean default false)
returns text language plpgsql security definer set search_path = public as $$
declare
  s public.journey_settings;
  t public.journey_tier_limits;
  month_start timestamptz := date_trunc('month', now());
  day_start timestamptz := date_trunc('day', now());
  v numeric; n integer; credit uuid; spent_j jsonb;
  new_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('journey_spend'));
  select * into s from public.journey_settings;
  if not s.enabled or not s.paid_usage_authorized then return 'refused:off'; end if;
  if exists (select 1 from public.journey_usage where holder_id = p_holder and request_key = p_request_key) then return 'refused:duplicate'; end if;
  if exists (select 1 from public.journey_usage where holder_id = p_holder and status = 'reserved' and created_at > now() - interval '5 minutes') then return 'refused:in_flight'; end if;
  if (select count(*) from public.journey_usage where user_id = p_user and created_at > now() - interval '1 minute') >= s.per_minute_requests then return 'refused:rate'; end if;

  if s.company_monthly_limit_cents is null then return 'refused:company_budget_unset'; end if;
  select coalesce(sum(public.journey_row_cents(u)), 0) into v from public.journey_usage u where u.created_at >= month_start;
  v := v + coalesce((select sum(coalesce(cost_cents, 0)) from public.journey_voice_sessions where started_at >= month_start), 0);
  if v + p_reserve > s.company_monthly_limit_cents then return 'refused:company_budget'; end if;

  if p_owner_test then
    if s.owner_test_monthly_limit_cents is null then return 'refused:test_budget_unset'; end if;
    select coalesce(sum(public.journey_row_cents(u)), 0) into v from public.journey_usage u where u.created_at >= month_start and u.is_owner_test;
    if v + p_reserve > s.owner_test_monthly_limit_cents then return 'refused:test_budget'; end if;
  else
    select * into t from public.journey_tier_limits where package_slug = p_package;
    if t.package_slug is null then return 'refused:limits_unset'; end if;

    if not t.unlimited_messages and t.monthly_messages is null then
      -- Allowance mode (directive 51): a dollar allowance at actual cost, fair-use safeguards, then purchased credit.
      if t.member_monthly_limit_cents is null then return 'refused:limits_unset'; end if;
      select count(*) into n from public.journey_usage where holder_id = p_holder and created_at > now() - interval '1 hour' and status <> 'failed' and not is_owner_test;
      if n >= t.fair_use_hourly then return 'refused:fair_use_hour'; end if;
      select count(*) into n from public.journey_usage where holder_id = p_holder and created_at >= day_start and status <> 'failed' and not is_owner_test;
      if n >= t.fair_use_daily then return 'refused:fair_use_day'; end if;
      if t.tier_monthly_limit_cents is not null then
        select coalesce(sum(public.journey_row_cents(u)), 0) into v from public.journey_usage u where u.created_at >= month_start and u.package_slug = p_package and not u.is_owner_test;
        if v + p_reserve > t.tier_monthly_limit_cents then return 'refused:tier_budget'; end if;
      end if;
      spent_j := public.journey_allowance_used(p_holder, p_user, p_period_start);
      if (spent_j->>'holder_cents')::numeric + p_reserve > t.member_monthly_limit_cents
         or (t.person_monthly_limit_cents is not null and (spent_j->>'person_cents')::numeric + p_reserve > t.person_monthly_limit_cents) then
        select id into credit from public.journey_message_credits
          where holder_id = p_holder and kind = 'messages' and used < messages and (expires_at is null or expires_at > now())
          order by expires_at nulls last, created_at limit 1 for update;
        if credit is null then return 'refused:allowance'; end if;
        update public.journey_message_credits set used = used + 1 where id = credit;
      end if;
      insert into public.journey_usage (user_id, holder_id, request_key, package_slug, credit_id, mode, model, reserved_cents, is_owner_test)
        values (p_user, p_holder, p_request_key, p_package, credit, p_mode, p_model, p_reserve, false) returning id into new_id;
      return new_id::text;
    end if;

    if t.member_monthly_limit_cents is null or t.tier_monthly_limit_cents is null
       or (not t.unlimited_messages and (t.monthly_messages is null or t.daily_messages is null)) then return 'refused:limits_unset'; end if;

    select coalesce(sum(public.journey_row_cents(u)), 0) into v from public.journey_usage u
      where u.created_at >= month_start and u.package_slug = p_package and not u.is_owner_test;
    if v + p_reserve > t.tier_monthly_limit_cents then return 'refused:tier_budget'; end if;

    if t.unlimited_messages then
      select count(*) into n from public.journey_usage where holder_id = p_holder and created_at > now() - interval '1 hour' and status <> 'failed' and not is_owner_test;
      if n >= t.fair_use_hourly then return 'refused:fair_use_hour'; end if;
      select count(*) into n from public.journey_usage where holder_id = p_holder and created_at >= day_start and status <> 'failed' and not is_owner_test;
      if n >= t.fair_use_daily then return 'refused:fair_use_day'; end if;
      select coalesce(sum(public.journey_row_cents(u)), 0) into v from public.journey_usage u
        where u.holder_id = p_holder and u.created_at >= p_period_start and not u.is_owner_test;
      if v + p_reserve > t.member_monthly_limit_cents then return 'refused:fair_use_cost'; end if;
      insert into public.journey_usage (user_id, holder_id, request_key, package_slug, credit_id, mode, model, reserved_cents, is_owner_test)
        values (p_user, p_holder, p_request_key, p_package, null, p_mode, p_model, p_reserve, false) returning id into new_id;
      return new_id::text;
    end if;

    select count(*) into n from public.journey_usage where holder_id = p_holder and created_at >= day_start and status <> 'failed' and not is_owner_test;
    if n >= t.daily_messages then return 'refused:daily'; end if;
    select count(*) into n from public.journey_usage where holder_id = p_holder and created_at >= p_period_start
      and status <> 'failed' and credit_id is null and not is_owner_test;
    if n >= t.monthly_messages then
      select id into credit from public.journey_message_credits
        where holder_id = p_holder and used < messages and (expires_at is null or expires_at > now())
        order by expires_at nulls last, created_at limit 1 for update;
      if credit is null then return 'refused:allowance'; end if;
      update public.journey_message_credits set used = used + 1 where id = credit;
    else
      select coalesce(sum(public.journey_row_cents(u)), 0) into v from public.journey_usage u
        where u.holder_id = p_holder and u.created_at >= p_period_start and u.credit_id is null and not u.is_owner_test;
      if v + p_reserve > t.member_monthly_limit_cents then return 'refused:member_budget'; end if;
    end if;
  end if;

  insert into public.journey_usage (user_id, holder_id, request_key, package_slug, credit_id, mode, model, reserved_cents, is_owner_test)
    values (p_user, p_holder, p_request_key, p_package, credit, p_mode, p_model, p_reserve, p_owner_test) returning id into new_id;
  return new_id::text;
end $$;

-- Voice draws from the same allowance: the server passes the member's remaining allowance and the database re-checks it.
drop function if exists public.journey_voice_start(uuid, uuid, text, integer, boolean, numeric);
create function public.journey_voice_start(p_user uuid, p_holder uuid, p_package text, p_allowed_seconds integer, p_owner_test boolean, p_reserve numeric,
  p_period_start timestamptz default null, p_holder_limit numeric default null, p_person_limit numeric default null)
returns text language plpgsql security definer set search_path = public as $$
declare s public.journey_settings; spent numeric; new_id uuid; spent_j jsonb;
begin
  perform pg_advisory_xact_lock(hashtext('journey_spend'));
  select * into s from public.journey_settings;
  if not s.enabled or not s.paid_usage_authorized or not s.voice_enabled then return 'refused:off'; end if;
  if p_allowed_seconds < 30 then return 'refused:minutes'; end if;
  if exists (select 1 from public.journey_voice_sessions where user_id = p_user and ended_at is null and started_at > now() - make_interval(secs => allowed_seconds + 120)) then
    return 'refused:in_progress';
  end if;
  if s.company_monthly_limit_cents is null then return 'refused:company_budget_unset'; end if;
  if p_owner_test then
    if s.owner_test_monthly_limit_cents is null then return 'refused:test_budget_unset'; end if;
    if coalesce((select sum(public.journey_row_cents(u)) from public.journey_usage u where u.created_at >= date_trunc('month', now()) and u.is_owner_test), 0)
       + coalesce((select sum(coalesce(v.cost_cents, 0)) from public.journey_voice_sessions v where v.started_at >= date_trunc('month', now()) and v.is_owner_test), 0)
       + p_reserve > s.owner_test_monthly_limit_cents then return 'refused:test_budget'; end if;
  elsif p_holder_limit is not null then
    spent_j := public.journey_allowance_used(p_holder, p_user, coalesce(p_period_start, date_trunc('month', now())));
    if (spent_j->>'holder_cents')::numeric + p_reserve > p_holder_limit
       or (p_person_limit is not null and (spent_j->>'person_cents')::numeric + p_reserve > p_person_limit) then return 'refused:allowance'; end if;
  end if;
  select coalesce(sum(public.journey_row_cents(u)), 0) + coalesce((select sum(coalesce(v.cost_cents, 0)) from public.journey_voice_sessions v where v.started_at >= date_trunc('month', now())), 0)
    into spent from public.journey_usage u where u.created_at >= date_trunc('month', now());
  if spent + p_reserve > s.company_monthly_limit_cents then return 'refused:company_budget'; end if;
  insert into public.journey_voice_sessions (user_id, holder_id, package_slug, is_owner_test, allowed_seconds, cost_cents)
    values (p_user, p_holder, p_package, p_owner_test, p_allowed_seconds, p_reserve) returning id into new_id;
  return new_id::text;
end $$;
revoke all on function public.journey_voice_start(uuid, uuid, text, integer, boolean, numeric, timestamptz, numeric, numeric) from public, anon, authenticated;
grant execute on function public.journey_voice_start(uuid, uuid, text, integer, boolean, numeric, timestamptz, numeric, numeric) to service_role;
