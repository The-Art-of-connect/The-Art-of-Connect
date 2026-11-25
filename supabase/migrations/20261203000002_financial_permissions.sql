-- ════════════════════════════════════════════════════════════════════
-- Financial permission structure and financial audit trail.
--
--   Owner      full financial control: pricing approval & publication,
--              refunds, live payments, public enrollment (launch switches).
--   Finance    prepares pricing changes, manages authorized financial
--              operations and reports. Cannot publish, refund or launch.
--   Executive  views business performance (memberships, payments, reports)
--              and runs authorized daily operations. Read-only on finance.
--   General    (admin, support, moderator) — no confidential financial
--   staff      information unless specifically authorized.
--   Investor   reserved for future read-only reporting; no access today.
--
-- Every change to financial records is captured by the database itself in
-- financial_audit_log: who, previous value, new value, date and time. The
-- log can be read by the owner and finance and can never be edited or
-- deleted — not even with the server key.
-- ════════════════════════════════════════════════════════════════════

-- ─── Who may see financial records ─────────────────────────────────
drop policy if exists "own subscriptions" on public.subscriptions;
create policy "own subscriptions" on public.subscriptions for select
  using (user_id = auth.uid() or public.has_staff_role(array['owner','finance','executive']::public.staff_role[]));
drop policy if exists "own payments" on public.payments;
create policy "own payments" on public.payments for select
  using (user_id = auth.uid() or public.has_staff_role(array['owner','finance','executive']::public.staff_role[]));

-- Promotions are discounts: finance prepares them, executives may view.
drop policy if exists "owner manages promotions" on public.promotions;
create policy "finance reads promotions" on public.promotions for select
  using (public.has_staff_role(array['owner','finance','executive']::public.staff_role[]));
create policy "finance manages promotions" on public.promotions for all
  using (public.has_staff_role(array['owner','finance']::public.staff_role[]))
  with check (public.has_staff_role(array['owner','finance']::public.staff_role[]));

-- Executives help run daily operations on the notify-me list and referrals.
drop policy if exists "staff read waitlist" on public.waitlist;
create policy "staff read waitlist" on public.waitlist for select using (public.has_staff_role(array['owner','admin','executive']::public.staff_role[]));
drop policy if exists "owner manages referrals" on public.referrals;
create policy "owner manages referrals" on public.referrals for all
  using (public.has_staff_role(array['owner','admin','executive']::public.staff_role[]))
  with check (public.has_staff_role(array['owner','admin','executive']::public.staff_role[]));

-- Pricing preview (draft prices) is for owner, finance and executives.
create or replace function public.can_preview_pricing()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_staff_role(array['owner','finance','executive']::public.staff_role[]);
$$;
grant execute on function public.can_preview_pricing() to authenticated;

-- ─── Financial audit trail ─────────────────────────────────────────
create table public.financial_audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  actor_email text,
  actor_roles text,
  source text not null,            -- 'owner_portal' (a signed-in person) or 'system' (Stripe webhook / server)
  table_name text not null,
  record_key text not null,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  changed_fields text[] not null default '{}',
  previous_values jsonb,
  new_values jsonb
);
create index financial_audit_recent_idx on public.financial_audit_log (occurred_at desc);
create index financial_audit_table_idx on public.financial_audit_log (table_name, record_key, occurred_at desc);
alter table public.financial_audit_log enable row level security;
create policy "owner and finance read" on public.financial_audit_log for select
  using (public.has_staff_role(array['owner','finance']::public.staff_role[]));
revoke all on public.financial_audit_log from anon, authenticated;
grant select on public.financial_audit_log to authenticated;
grant select, insert on public.financial_audit_log to service_role;

-- Tamper-proof: rows can never be changed or removed.
create or replace function public.financial_audit_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'The financial audit trail cannot be changed or deleted';
end;
$$;
create trigger financial_audit_no_update before update or delete on public.financial_audit_log
  for each row execute function public.financial_audit_immutable();
create trigger financial_audit_no_truncate before truncate on public.financial_audit_log
  for each statement execute function public.financial_audit_immutable();

-- Records only the fields that changed, with their previous and new values.
create or replace function public.log_financial_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  old_j jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  new_j jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  keys text[];
  prev jsonb := '{}';
  next jsonb := '{}';
  k text;
  uid uuid := auth.uid();
  key_col text := tg_argv[0];
begin
  select array_agg(x order by x) into keys from (
    select jsonb_object_keys(coalesce(new_j, old_j)) x
  ) s
  where x not in ('updated_at', 'created_at')
    and (tg_op <> 'UPDATE' or (old_j -> x) is distinct from (new_j -> x));
  if tg_op = 'UPDATE' and keys is null then
    return new; -- nothing meaningful changed
  end if;
  foreach k in array coalesce(keys, '{}') loop
    if old_j is not null then prev := prev || jsonb_build_object(k, old_j -> k); end if;
    if new_j is not null then next := next || jsonb_build_object(k, new_j -> k); end if;
  end loop;
  insert into public.financial_audit_log
    (actor_id, actor_email, actor_roles, source, table_name, record_key, operation, changed_fields, previous_values, new_values)
  values (
    uid,
    (select email::text from public.profiles where id = uid),
    (select string_agg(role::text, ', ' order by role) from public.staff_roles where user_id = uid),
    case when uid is null then 'system' else 'owner_portal' end,
    tg_table_name,
    coalesce(coalesce(new_j, old_j) ->> key_col, '?'),
    tg_op,
    coalesce(keys, '{}'),
    case when tg_op = 'INSERT' then null else prev end,
    case when tg_op = 'DELETE' then null else next end
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_pricing_config after update on public.pricing_config
  for each row execute function public.log_financial_change('id');
create trigger audit_membership_packages after insert or update or delete on public.membership_packages
  for each row execute function public.log_financial_change('slug');
create trigger audit_professional_packages after insert or update or delete on public.professional_packages
  for each row execute function public.log_financial_change('slug');
create trigger audit_membership_addons after insert or update or delete on public.membership_addons
  for each row execute function public.log_financial_change('slug');
create trigger audit_promotions after insert or update or delete on public.promotions
  for each row execute function public.log_financial_change('code');
create trigger audit_payments after insert or update or delete on public.payments
  for each row execute function public.log_financial_change('id');
create trigger audit_subscriptions after insert or update or delete on public.subscriptions
  for each row execute function public.log_financial_change('id');
-- Launch switches (live payments, public enrollment) and other settings.
create trigger audit_platform_settings after insert or update or delete on public.platform_settings
  for each row execute function public.log_financial_change('key');
-- Permission changes (who can touch finances).
create trigger audit_staff_roles after insert or delete on public.staff_roles
  for each row execute function public.log_financial_change('user_id');
