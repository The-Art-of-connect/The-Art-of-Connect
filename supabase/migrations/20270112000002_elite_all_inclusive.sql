-- Elite Concierge: all-inclusive (founder, November 26, 2026).
--   • Unlimited Journey text for Elite, with fair-use and abuse safeguards (hourly, daily and a monthly cost ceiling).
--   • 300 live voice minutes a month kept; extra voice minutes are the ONLY additional purchase for Elite.
--   • Additional Journey usage is priced AT COST: OpenAI's rates plus card processing, no markup. Owner-configurable.
--   • "All access" packages never pay the couples upgrade, add-ons or onboarding fees, and include Private Sessions.

alter table public.membership_packages add column all_access boolean not null default false;
update public.membership_packages set all_access = true where slug = 'elite-concierge';

alter table public.journey_tier_limits
  add column unlimited_messages boolean not null default false,
  add column fair_use_daily integer not null default 300 check (fair_use_daily between 1 and 5000),
  add column fair_use_hourly integer not null default 60 check (fair_use_hourly between 1 and 1000);
update public.journey_tier_limits set unlimited_messages = true, monthly_messages = null, daily_messages = null where package_slug = 'elite-concierge';

-- ─── At-cost usage pricing (owner-configurable) ───────────────────
alter table public.journey_settings
  add column text_cost_cents_per_message numeric(10, 4) not null default 0.5 check (text_cost_cents_per_message >= 0),
  add column voice_cost_cents_per_minute numeric(10, 4) not null default 5 check (voice_cost_cents_per_minute >= 0),
  add column card_fee_percent numeric(5, 3) not null default 2.9 check (card_fee_percent between 0 and 20),
  add column card_fee_fixed_cents integer not null default 30 check (card_fee_fixed_cents between 0 and 500),
  add column at_cost_pricing boolean not null default true;

create table public.journey_voice_packages (
  slug text primary key check (slug ~ '^[a-z0-9-]{3,40}$'),
  minutes integer not null check (minutes between 1 and 1000),
  price_cents integer check (price_cents >= 50),
  is_active boolean not null default true,
  sort_order integer not null default 100,
  updated_at timestamptz not null default now()
);
alter table public.journey_voice_packages enable row level security;
create policy "members read voice packages" on public.journey_voice_packages for select to authenticated using (true);
create policy "owner manages voice packages" on public.journey_voice_packages for all to authenticated
  using (public.has_staff_role(array['owner']::public.staff_role[])) with check (public.has_staff_role(array['owner']::public.staff_role[]));
revoke all on public.journey_voice_packages from public, anon;
grant select, insert, update, delete on public.journey_voice_packages to authenticated;
grant all on public.journey_voice_packages to service_role;

-- Price that recovers exactly the API cost plus card processing (Stripe minimum charge 50¢). No markup.
create or replace function public.journey_at_cost_cents(p_units numeric, p_unit_cents numeric)
returns integer language sql stable security definer set search_path = public as $$
  select greatest(50, ceil((p_units * p_unit_cents + s.card_fee_fixed_cents) / (1 - s.card_fee_percent / 100.0)))::int from public.journey_settings s;
$$;
grant execute on function public.journey_at_cost_cents(numeric, numeric) to authenticated, service_role;

-- Re-prices every additional-usage package at cost from the current cost settings (owner action).
create or replace function public.journey_reprice_at_cost()
returns void language plpgsql security definer set search_path = public as $$
declare s public.journey_settings;
begin
  if auth.uid() is not null and not public.has_staff_role(array['owner']::public.staff_role[]) then raise exception 'Not permitted'; end if;
  select * into s from public.journey_settings;
  update public.journey_message_packages set price_cents = public.journey_at_cost_cents(messages, s.text_cost_cents_per_message), updated_at = now();
  update public.journey_voice_packages set price_cents = public.journey_at_cost_cents(minutes, s.voice_cost_cents_per_minute), updated_at = now();
end $$;
revoke all on function public.journey_reprice_at_cost() from public, anon;
grant execute on function public.journey_reprice_at_cost() to authenticated, service_role;

insert into public.journey_voice_packages (slug, minutes, sort_order) values
  ('voice-15', 15, 10), ('voice-30', 30, 20), ('voice-60', 60, 30), ('voice-120', 120, 40)
on conflict (slug) do nothing;
-- Additional text messages at cost too (for memberships with a message allowance). Larger sizes keep the
-- card-processing share small; the 25-message size is retired.
update public.journey_message_packages set is_active = false where slug = 'messages-25';
insert into public.journey_message_packages (slug, messages, is_active, sort_order) values ('messages-500', 500, true, 50), ('messages-1000', 1000, true, 60)
on conflict (slug) do nothing;
select public.journey_reprice_at_cost();

update public.membership_packages set benefits = array[
    'All Singles, Couples and Business services',
    'All educational courses and relationship assessments',
    'Unlimited compatibility assessments and matching',
    'Access to all eligible circles and exclusive Elite communities',
    'Networking and business connections',
    'Personal growth and self-discovery resources',
    'All relationship and communication tools',
    'Unlimited Journey AI text-based conversations (fair use applies)',
    '300 Journey live voice minutes a month; additional minutes available at our cost',
    'Journey Private Sessions included',
    'Access to new platform features as they are released'
  ] where slug = 'elite-concierge';

-- Journey reservation with unlimited-text support (all other rules unchanged).
create or replace function public.journey_reserve(
  p_user uuid, p_holder uuid, p_request_key text, p_package text, p_mode text, p_model text,
  p_reserve numeric, p_period_start timestamptz, p_owner_test boolean default false)
returns text language plpgsql security definer set search_path = public as $$
declare
  s public.journey_settings;
  t public.journey_tier_limits;
  month_start timestamptz := date_trunc('month', now());
  day_start timestamptz := date_trunc('day', now());
  v numeric; n integer; credit uuid;
  new_id bigint;
begin
  -- One lock per allowance holder plus a company-wide lock: concurrent requests queue here.
  perform pg_advisory_xact_lock(hashtext('journey_spend'));
  select * into s from public.journey_settings;
  if not s.enabled or not s.paid_usage_authorized then return 'refused:off'; end if;
  if exists (select 1 from public.journey_usage where holder_id = p_holder and request_key = p_request_key) then return 'refused:duplicate'; end if;
  if exists (select 1 from public.journey_usage where holder_id = p_holder and status = 'reserved' and created_at > now() - interval '5 minutes') then return 'refused:in_flight'; end if;
  if (select count(*) from public.journey_usage where user_id = p_user and created_at > now() - interval '1 minute') >= s.per_minute_requests then return 'refused:rate'; end if;

  if s.company_monthly_limit_cents is null then return 'refused:company_budget_unset'; end if;
  select coalesce(sum(public.journey_row_cents(u)), 0) into v from public.journey_usage u where u.created_at >= month_start;
  if v + p_reserve > s.company_monthly_limit_cents then return 'refused:company_budget'; end if;

  if p_owner_test then
    if s.owner_test_monthly_limit_cents is null then return 'refused:test_budget_unset'; end if;
    select coalesce(sum(public.journey_row_cents(u)), 0) into v from public.journey_usage u where u.created_at >= month_start and u.is_owner_test;
    if v + p_reserve > s.owner_test_monthly_limit_cents then return 'refused:test_budget'; end if;
  else
    select * into t from public.journey_tier_limits where package_slug = p_package;
    if t.package_slug is null or t.member_monthly_limit_cents is null or t.tier_monthly_limit_cents is null
       or (not t.unlimited_messages and (t.monthly_messages is null or t.daily_messages is null)) then return 'refused:limits_unset'; end if;

    select coalesce(sum(public.journey_row_cents(u)), 0) into v from public.journey_usage u
      where u.created_at >= month_start and u.package_slug = p_package and not u.is_owner_test;
    if v + p_reserve > t.tier_monthly_limit_cents then return 'refused:tier_budget'; end if;

    -- Unlimited text (Elite): no message allowance and never a purchase; fair-use and abuse safeguards only.
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

    -- Included messages first (only non-purchased use counts against them), then purchased credit.
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

-- Public pricing also tells the checkout which package is all-inclusive.
create or replace function public.get_public_pricing(preview boolean default false)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  cfg public.pricing_config;
  show_prices boolean;
begin
  select * into cfg from public.pricing_config limit 1;
  show_prices := cfg.is_published or (preview and public.can_preview_pricing());
  return jsonb_build_object(
    'published', cfg.is_published,
    'preview', show_prices and not cfg.is_published,
    'currency', cfg.currency,
    'annual_months_charged', case when show_prices then cfg.annual_months_charged end,
    'minimum_member_age', public.setting_int('minimum_member_age', 40),
    'couples_upgrade', jsonb_build_object(
      'name', cfg.couples_upgrade_name,
      'description', cfg.couples_upgrade_description,
      'monthly_price_cents', case when show_prices then cfg.couples_upgrade_monthly_cents end),
    'referral_reward', cfg.referral_reward_description,
    'experiences', coalesce((select jsonb_agg(jsonb_build_object(
        'experience', e.experience, 'name', e.name, 'subtitle', e.subtitle, 'description', e.description, 'benefits', e.benefits)
        order by e.sort_order) from public.experience_offerings e where e.is_active), '[]'::jsonb),
    'packages', coalesce((select jsonb_agg(jsonb_build_object(
        'slug', p.slug, 'name', p.name, 'tagline', p.tagline, 'description', p.description, 'category', p.category,
        'experiences', p.experiences, 'love_track', p.love_track, 'benefits', p.benefits, 'highlight', p.highlight, 'all_access', p.all_access,
        'monthly_price_cents', case when show_prices then p.monthly_price_cents end,
        'annual_price_cents', case when show_prices then p.annual_price_cents end,
        'annual_months_charged', case when show_prices then p.annual_months_charged end,
        'onboarding_fee_cents', case when show_prices then p.onboarding_fee_cents end)
        order by p.sort_order) from public.membership_packages p where p.is_active), '[]'::jsonb),
    'addons', coalesce((select jsonb_agg(jsonb_build_object(
        'slug', a.slug, 'name', a.name, 'description', a.description, 'billing', a.billing, 'audience', a.audience,
        'requires_experience', a.requires_experience, 'eligibility', a.eligibility,
        'price_cents', case when show_prices then a.price_cents end)
        order by a.sort_order) from public.membership_addons a where a.is_active), '[]'::jsonb),
    'professional_packages', coalesce((select jsonb_agg(jsonb_build_object(
        'slug', p.slug, 'name', p.name, 'description', p.description, 'eligible_types', p.eligible_types,
        'benefits', p.benefits, 'eligibility', p.eligibility,
        'monthly_price_cents', case when show_prices then p.monthly_price_cents end,
        'onboarding_fee_cents', case when show_prices then p.onboarding_fee_cents end)
        order by p.sort_order) from public.professional_packages p where p.is_active), '[]'::jsonb)
  );
end;
$$;
grant execute on function public.get_public_pricing(boolean) to anon, authenticated;
