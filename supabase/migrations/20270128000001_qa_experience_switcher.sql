-- QA experience switcher (owner request, November 28, 2026): one fictional test account Journey can use to review every
-- membership experience. Only accounts the owner lists here AND marked is_test can switch, only their own access changes,
-- no payment is created (complimentary, no Stripe ids) and no staff role is ever granted.
create table if not exists public.qa_switchers (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  persona text not null default 'free',
  expires_at timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now()
);
alter table public.qa_switchers enable row level security;
drop policy if exists qa_switchers_self on public.qa_switchers;
create policy qa_switchers_self on public.qa_switchers for select using (user_id = auth.uid());
revoke all on public.qa_switchers from anon, authenticated;
grant select on public.qa_switchers to authenticated;

create or replace function public.qa_switch_experience(p_persona text)
returns text language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  tier text; exps experience[]; soc text; couples boolean := false;
begin
  if me is null or not exists (
    select 1 from public.qa_switchers q join public.profiles p on p.id = q.user_id
    where q.user_id = me and q.expires_at > now() and p.is_test
  ) or exists (select 1 from public.staff_roles where user_id = me) then
    raise exception 'QA_NOT_ALLOWED';
  end if;
  case p_persona
    when 'free'         then tier := null;                   exps := '{}';                         soc := null;
    when 'singles'      then tier := 'personal-society';     exps := '{relationships}';            soc := 'singles';
    when 'couples'      then tier := 'personal-society';     exps := '{relationships}';            soc := 'couples'; couples := true;
    when 'professional' then tier := 'professional-society'; exps := '{business}';                 soc := 'business';
    when 'executive'    then tier := 'executive-private';    exps := '{business,relationships}';   soc := null;
    when 'elite'        then tier := 'elite-concierge';      exps := '{business,relationships}';   soc := null;
    else raise exception 'QA_UNKNOWN_PERSONA';
  end case;

  perform set_config('app.society_transition', 'on', true);
  update public.profiles set primary_society = soc where id = me;
  perform set_config('app.society_transition', 'off', true);

  delete from public.experience_access where user_id = me and source = 'comp';
  insert into public.experience_access (user_id, experience, status, source, expires_at)
    select me, e, 'active', 'comp', now() + interval '30 days' from unnest(exps) e on conflict do nothing;

  perform set_config('app.elite_system', 'on', true);
  if p_persona = 'elite' then
    insert into public.elite_badges (user_id, status, expires_at) values (me, 'active', now() + interval '30 days')
      on conflict (user_id) do update set status = 'active', updated_at = now();
  else
    update public.elite_badges set status = 'expired', updated_at = now() where user_id = me and status = 'active';
  end if;
  perform set_config('app.elite_system', 'off', true);

  delete from public.subscriptions where user_id = me and stripe_subscription_id is null and coalesce(amount_cents, 0) = 0;
  if tier is not null then
    insert into public.subscriptions (user_id, status, tier_slug, tier_name, experiences, kind, couples_upgrade, current_period_end, billing_interval, amount_cents)
    values (me, 'active', tier, 'QA test membership (no payment)', exps, 'member', couples, now() + interval '30 days', 'month', 0);
  end if;

  update public.qa_switchers set persona = p_persona where user_id = me;
  return p_persona;
end $$;
revoke all on function public.qa_switch_experience(text) from public, anon;
grant execute on function public.qa_switch_experience(text) to authenticated;
