-- Journey Private Sessions: session fee PLUS included messages or purchased credits.
-- Closes the gap where session messages were recorded but never checked against the member's balance.
-- Policy: included messages first, then purchased credits; one message is always kept for the closing summary;
-- when the balance is exhausted the session PAUSES (no overage, no automatic charge) and paused time doesn't count.
-- A paused prepaid session can resume within session_pause_days (owner setting) once the member adds credits.

alter table public.journey_sessions
  add column if not exists holder_id uuid references public.profiles (id) on delete set null,
  add column if not exists paused_at timestamptz,
  add column if not exists paused_seconds integer not null default 0 check (paused_seconds >= 0),
  add column if not exists credits_used integer not null default 0 check (credits_used >= 0);

alter table public.journey_settings
  add column if not exists session_pause_days integer not null default 7 check (session_pause_days between 1 and 90),
  add column if not exists credit_only_enabled boolean not null default false;
comment on column public.journey_settings.credit_only_enabled is 'Allow people without a paid membership to buy Journey credits and sessions. Off until the owner approves.';

drop function if exists public.journey_reserve_session(uuid, uuid, text, text, numeric);
create or replace function public.journey_reserve_session(
  p_user uuid, p_session uuid, p_request_key text, p_model text, p_reserve numeric,
  p_holder uuid, p_allowance integer, p_period_start timestamptz, p_summary boolean)
returns text language plpgsql security definer set search_path = public as $$
declare s public.journey_settings; js public.journey_sessions; prod public.journey_session_products;
        spent numeric; new_id bigint; used_period integer; included_left integer; purchased_left integer; credit uuid;
begin
  perform pg_advisory_xact_lock(hashtext('journey_spend'));
  select * into s from public.journey_settings;
  if not s.enabled or not s.paid_usage_authorized then return 'refused:off'; end if;
  select * into js from public.journey_sessions where id = p_session and user_id = p_user for update;
  if js.id is null then return 'refused:no_session'; end if;
  select * into prod from public.journey_session_products where slug = js.product_slug;
  if exists (select 1 from public.journey_usage where holder_id = p_holder and request_key = p_request_key) then return 'refused:duplicate'; end if;

  -- Balance: included messages this period, then purchased credits.
  select count(*) into used_period from public.journey_usage
    where holder_id = p_holder and created_at >= p_period_start and status <> 'failed' and credit_id is null and not is_owner_test;
  included_left := greatest(coalesce(p_allowance, 0) - used_period, 0);
  select coalesce(sum(messages - used), 0) into purchased_left from public.journey_message_credits
    where holder_id = p_holder and used < messages and (expires_at is null or expires_at > now());

  -- A paused session resumes only with balance available, and only within the pause window.
  if js.paused_at is not null then
    if js.paused_at < now() - make_interval(days => s.session_pause_days) then
      update public.journey_sessions set status = 'expired' where id = js.id;
      return 'refused:pause_expired';
    end if;
    if included_left + purchased_left = 0 then return 'refused:paused'; end if;
    update public.journey_sessions
      set ends_at = ends_at + (now() - paused_at), paused_seconds = paused_seconds + extract(epoch from now() - paused_at)::int, paused_at = null
      where id = js.id returning * into js;
  end if;

  if js.status = 'purchased' then
    if included_left + purchased_left = 0 then return 'refused:no_balance'; end if;
    update public.journey_sessions set status = 'active', started_at = now(), ends_at = now() + make_interval(mins => prod.minutes), holder_id = p_holder
      where id = js.id returning * into js;
  end if;
  if js.status <> 'active' or js.ends_at <= now() then
    update public.journey_sessions set status = 'completed' where id = js.id and status = 'active';
    return 'refused:session_ended';
  end if;
  if js.messages_used >= prod.max_messages then return 'refused:session_limit'; end if;

  -- Never overdraw: pause when empty; keep the last message for the closing summary.
  if included_left + purchased_left = 0 then
    update public.journey_sessions set paused_at = now() where id = js.id;
    return 'refused:paused';
  end if;
  if not p_summary and included_left + purchased_left = 1 then return 'refused:keep_for_summary'; end if;

  if s.company_monthly_limit_cents is null then return 'refused:company_budget_unset'; end if;
  select coalesce(sum(public.journey_row_cents(u)), 0) into spent from public.journey_usage u where u.created_at >= date_trunc('month', now());
  if spent + p_reserve > s.company_monthly_limit_cents then return 'refused:company_budget'; end if;

  if included_left = 0 then
    select id into credit from public.journey_message_credits
      where holder_id = p_holder and used < messages and (expires_at is null or expires_at > now())
      order by expires_at nulls last, created_at limit 1 for update;
    update public.journey_message_credits set used = used + 1 where id = credit;
    update public.journey_sessions set credits_used = credits_used + 1 where id = js.id;
  end if;
  update public.journey_sessions set messages_used = messages_used + 1 where id = js.id;
  insert into public.journey_usage (user_id, holder_id, request_key, package_slug, credit_id, mode, model, reserved_cents)
    values (p_user, p_holder, p_request_key, 'session:' || js.product_slug, credit, 'life', p_model, p_reserve) returning id into new_id;
  return new_id::text;
end $$;
revoke all on function public.journey_reserve_session(uuid, uuid, text, text, numeric, uuid, integer, timestamptz, boolean) from public, anon, authenticated;
grant execute on function public.journey_reserve_session(uuid, uuid, text, text, numeric, uuid, integer, timestamptz, boolean) to service_role;
