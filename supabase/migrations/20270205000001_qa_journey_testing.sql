-- Directive 49: an owner-authorized pre-launch testing exception for the owner-listed fictional QA account only.
-- It lets the QA account experience Journey before live payments, while the selected membership tier, every allowance,
-- the company Journey caps (journey_reserve) and a dedicated QA testing budget all stay enforced. Real members stay closed.
insert into public.platform_settings (key, value, description) values
  ('qa_journey_testing', 'false', 'Owner switch: the fictional QA account may use Journey before live payments (directive 49).'),
  ('qa_journey_monthly_cents', '2500', 'QA Journey testing budget per month, in cents (company testing budget).'),
  ('qa_journey_daily_cents', '500', 'QA Journey testing budget per day, in cents (company testing budget).')
on conflict (key) do nothing;

/** 'ok', or why the QA exception does not apply / the QA testing budget would be exceeded. Never true for real members. */
create or replace function public.journey_qa_allowed(p_user uuid, p_reserve numeric default 0)
returns text language plpgsql stable security definer set search_path = public as $$
declare month_cap numeric; day_cap numeric; spent_month numeric; spent_day numeric;
begin
  if not public.is_qa_account(p_user) then return 'not_qa'; end if;
  if exists (select 1 from public.staff_roles where user_id = p_user) then return 'not_qa'; end if;
  if coalesce((select value from public.platform_settings where key = 'qa_journey_testing')::text, 'false') <> 'true' then return 'off'; end if;
  month_cap := coalesce((select (value #>> '{}')::numeric from public.platform_settings where key = 'qa_journey_monthly_cents'), 0);
  day_cap := coalesce((select (value #>> '{}')::numeric from public.platform_settings where key = 'qa_journey_daily_cents'), 0);
  select coalesce(sum(public.journey_row_cents(u)), 0) into spent_month from public.journey_usage u where u.user_id = p_user and u.created_at >= date_trunc('month', now());
  select coalesce(sum(public.journey_row_cents(u)), 0) into spent_day from public.journey_usage u where u.user_id = p_user and u.created_at >= date_trunc('day', now());
  spent_month := spent_month + coalesce((select sum(coalesce(cost_cents, 0)) from public.journey_voice_sessions where user_id = p_user and started_at >= date_trunc('month', now())), 0);
  spent_day := spent_day + coalesce((select sum(coalesce(cost_cents, 0)) from public.journey_voice_sessions where user_id = p_user and started_at >= date_trunc('day', now())), 0);
  if spent_month + p_reserve > month_cap then return 'qa_month_budget'; end if;
  if spent_day + p_reserve > day_cap then return 'qa_day_budget'; end if;
  return 'ok';
end $$;
revoke all on function public.journey_qa_allowed(uuid, numeric) from public, anon, authenticated;
grant execute on function public.journey_qa_allowed(uuid, numeric) to service_role;
