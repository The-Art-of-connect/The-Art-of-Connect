-- Elite Qualification & Verification Engine, built on Stripe.
--   • Stripe Identity: government ID, date of birth and selfie match (reuses identity_verifications).
--   • Stripe Financial Connections: member-authorized bank ownership, balances and transactions.
--     Results are SUPPORTING evidence only. Deposits are never treated as verified personal income and
--     balances are never treated as net worth: every financial result goes to the owner for manual review.
--   • Stripe Payments: the expedited verification fee (inactive until the owner approves it) is recorded
--     separately from membership revenue.
-- Production Financial Connections stays off until the owner confirms Stripe has approved our Authorized
-- Purpose and consent screen, and turns it on. Sandbox testing uses fictional data only.

alter table public.elite_settings
  add column financial_connections_live boolean not null default false,
  add column financial_purpose_approved boolean not null default false;

-- ─── Financial Connections sessions (consent record) ──────────────
create table public.elite_financial_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  candidate_id uuid not null references public.elite_candidates (id) on delete cascade,
  stripe_session_id text not null unique,
  stripe_customer_id text not null,
  livemode boolean not null default false,
  consent_version text not null,
  consented_at timestamptz not null default now(),
  status text not null default 'started' check (status in ('started', 'completed', 'canceled')),
  created_at timestamptz not null default now()
);
create index elite_financial_sessions_user on public.elite_financial_sessions (user_id, created_at desc);

-- ─── Linked accounts: summaries only, never raw transactions ──────
create table public.elite_financial_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  candidate_id uuid not null references public.elite_candidates (id) on delete cascade,
  session_id uuid references public.elite_financial_sessions (id) on delete set null,
  stripe_account_id text not null unique,
  livemode boolean not null default false,
  institution_name text check (char_length(institution_name) <= 200),
  category text check (char_length(category) <= 40),
  subcategory text check (char_length(subcategory) <= 40),
  last4 text check (last4 ~ '^[0-9]{0,4}$'),
  -- Account holder name compared with the Stripe Identity verified name. No names are stored.
  ownership_result text not null default 'pending' check (ownership_result in ('pending', 'match', 'partial', 'no_match', 'unavailable')),
  -- CONFIDENTIAL (owner only). Not income, not net worth.
  balance_cents bigint,
  balance_currency text check (balance_currency ~ '^[a-z]{3}$'),
  balance_as_of timestamptz,
  deposits_12m_cents bigint,
  deposits_12m_count integer,
  months_covered integer,
  data_status text not null default 'pending' check (data_status in ('pending', 'collected', 'partial', 'failed', 'purged')),
  disconnected_at timestamptz,
  delete_after timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index elite_financial_accounts_candidate on public.elite_financial_accounts (candidate_id);
create trigger touch_elite_financial_accounts before update on public.elite_financial_accounts for each row execute function public.touch_updated_at();

-- ─── Expedited verification fee (reported separately from membership revenue) ─────
create table public.elite_verification_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  candidate_id uuid not null references public.elite_candidates (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd',
  livemode boolean not null default false,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded', 'partially_refunded', 'canceled')),
  refunded_cents integer not null default 0,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index elite_verification_payments_candidate on public.elite_verification_payments (candidate_id);

-- ─── Security ─────────────────────────────────────────────────────
alter table public.elite_financial_sessions enable row level security;
alter table public.elite_financial_accounts enable row level security;
alter table public.elite_verification_payments enable row level security;

create policy "own or owner reads fc sessions" on public.elite_financial_sessions for select to authenticated
  using (user_id = auth.uid() or public.has_staff_role(array['owner']::public.staff_role[]));
create policy "own or owner reads fc accounts" on public.elite_financial_accounts for select to authenticated
  using (user_id = auth.uid() or public.has_staff_role(array['owner']::public.staff_role[]));
create policy "own or owner reads verification payments" on public.elite_verification_payments for select to authenticated
  using (user_id = auth.uid() or public.has_staff_role(array['owner']::public.staff_role[]));

revoke all on public.elite_financial_sessions, public.elite_financial_accounts, public.elite_verification_payments from public, anon, authenticated;
-- Members (and the owner's ordinary session) see only non-financial columns. Amounts are read through
-- elite_owner_financials(), which checks the owner role. Writes come only from the server (service role).
grant select (id, user_id, candidate_id, status, consented_at, livemode, created_at) on public.elite_financial_sessions to authenticated;
grant select (id, user_id, candidate_id, institution_name, category, last4, livemode, ownership_result, data_status, disconnected_at, created_at)
  on public.elite_financial_accounts to authenticated;
grant select (id, user_id, candidate_id, amount_cents, currency, livemode, status, paid_at, created_at) on public.elite_verification_payments to authenticated;
grant all on public.elite_financial_sessions, public.elite_financial_accounts, public.elite_verification_payments to service_role;

-- Owner only: confidential financial summaries for review.
create or replace function public.elite_owner_financials(p_candidates uuid[])
returns table (
  id uuid, candidate_id uuid, institution_name text, category text, subcategory text, last4 text, livemode boolean,
  ownership_result text, balance_cents bigint, balance_currency text, balance_as_of timestamptz,
  deposits_12m_cents bigint, deposits_12m_count integer, months_covered integer, data_status text,
  disconnected_at timestamptz, delete_after timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_staff_role(array['owner']::public.staff_role[]) then raise exception 'Not permitted'; end if;
  return query select a.id, a.candidate_id, a.institution_name, a.category, a.subcategory, a.last4, a.livemode,
    a.ownership_result, a.balance_cents, a.balance_currency, a.balance_as_of,
    a.deposits_12m_cents, a.deposits_12m_count, a.months_covered, a.data_status, a.disconnected_at, a.delete_after, a.created_at
    from public.elite_financial_accounts a where a.candidate_id = any(p_candidates) order by a.created_at desc;
end $$;
revoke all on function public.elite_owner_financials(uuid[]) from public, anon;
grant execute on function public.elite_owner_financials(uuid[]) to authenticated;

-- Separate Elite verification revenue (owner only).
create or replace function public.elite_verification_revenue()
returns table (livemode boolean, paid_count bigint, gross_cents bigint, refunded_cents bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_staff_role(array['owner']::public.staff_role[]) then raise exception 'Not permitted'; end if;
  return query select p.livemode, count(*) filter (where p.paid_at is not null), coalesce(sum(p.amount_cents) filter (where p.paid_at is not null), 0)::bigint,
    coalesce(sum(p.refunded_cents), 0)::bigint from public.elite_verification_payments p group by p.livemode;
end $$;
revoke all on function public.elite_verification_revenue() from public, anon;
grant execute on function public.elite_verification_revenue() to authenticated;

-- Retention: purge financial amounts once the review window has passed (called by the daily cron).
create or replace function public.elite_purge_financials()
returns integer language sql security definer set search_path = public as $$
  with p as (
    update public.elite_financial_accounts set balance_cents = null, balance_as_of = null, deposits_12m_cents = null, deposits_12m_count = null,
      months_covered = null, data_status = 'purged'
    where delete_after is not null and delete_after < now() and data_status <> 'purged' returning 1)
  select count(*)::integer from p;
$$;
revoke all on function public.elite_purge_financials() from public, anon, authenticated;
grant execute on function public.elite_purge_financials() to service_role;
