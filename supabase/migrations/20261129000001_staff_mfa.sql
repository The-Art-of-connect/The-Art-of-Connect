-- ════════════════════════════════════════════════════════════════════
-- Multi-factor authentication for staff
-- When require_mfa_for_staff is on (default), staff privileges apply only
-- to sessions that have completed MFA (Supabase "aal2"). A stolen password
-- alone therefore grants no Owner Portal access — enforced in the database,
-- not just the app. Direct database/service access (no JWT) is unaffected.
-- ════════════════════════════════════════════════════════════════════
insert into public.platform_settings (key, value, description) values
  ('require_mfa_for_staff', 'true', 'Staff permissions require a multi-factor authenticated session')
on conflict (key) do nothing;

create or replace function public.staff_session_ok()
returns boolean language sql stable security definer set search_path = public as $$
  select auth.jwt() is null
      or not public.setting_enabled('require_mfa_for_staff')
      or coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

create or replace function public.has_staff_role(roles public.staff_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select public.staff_session_ok() and exists (
    select 1 from public.staff_roles where user_id = auth.uid() and role = any(roles)
  );
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select public.staff_session_ok() and exists (select 1 from public.staff_roles where user_id = auth.uid());
$$;

grant execute on function public.staff_session_ok() to anon, authenticated, service_role;

-- ─── Refund tracking ───────────────────────────────────────────────
alter table public.payments
  add column stripe_payment_ref text,           -- Stripe PaymentIntent behind the invoice (used for refunds)
  add column refunded_amount_cents integer not null default 0 check (refunded_amount_cents >= 0);
create index payments_stripe_ref_idx on public.payments (stripe_payment_ref);
