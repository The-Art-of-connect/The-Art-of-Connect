-- Elite: automatic qualification when evidence is conclusive, manual review when it isn't, and members'
-- access to (and correction of) their own verification information.
--
-- Stripe Financial Connections returns up to ~180 days of transactions depending on the bank, never a
-- guaranteed 12 months, so transaction summaries record the actual window covered and are never annualized.

-- ─── Honest transaction window ────────────────────────────────────
alter table public.elite_financial_accounts rename column deposits_12m_cents to deposits_cents;
alter table public.elite_financial_accounts rename column deposits_12m_count to deposits_count;
alter table public.elite_financial_accounts rename column months_covered to history_days;
alter table public.elite_financial_accounts add column history_start date, add column history_end date;
grant select (history_start, history_end) on public.elite_financial_accounts to authenticated;

drop function public.elite_owner_financials(uuid[]);
create function public.elite_owner_financials(p_candidates uuid[])
returns table (
  id uuid, candidate_id uuid, institution_name text, category text, subcategory text, last4 text, livemode boolean,
  ownership_result text, balance_cents bigint, balance_currency text, balance_as_of timestamptz,
  deposits_cents bigint, deposits_count integer, history_days integer, history_start date, history_end date, data_status text,
  disconnected_at timestamptz, delete_after timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_staff_role(array['owner']::public.staff_role[]) then raise exception 'Not permitted'; end if;
  return query select a.id, a.candidate_id, a.institution_name, a.category, a.subcategory, a.last4, a.livemode,
    a.ownership_result, a.balance_cents, a.balance_currency, a.balance_as_of, a.deposits_cents, a.deposits_count, a.history_days,
    a.history_start, a.history_end, a.data_status, a.disconnected_at, a.delete_after, a.created_at
    from public.elite_financial_accounts a where a.candidate_id = any(p_candidates) order by a.created_at desc;
end $$;
revoke all on function public.elite_owner_financials(uuid[]) from public, anon;
grant execute on function public.elite_owner_financials(uuid[]) to authenticated;

create or replace function public.elite_purge_financials()
returns integer language sql security definer set search_path = public as $$
  with p as (
    update public.elite_financial_accounts set balance_cents = null, balance_as_of = null, deposits_cents = null, deposits_count = null,
      history_days = null, history_start = null, history_end = null, data_status = 'purged'
    where delete_after is not null and delete_after < now() and data_status <> 'purged' returning 1)
  select count(*)::integer from p;
$$;
revoke all on function public.elite_purge_financials() from public, anon, authenticated;
grant execute on function public.elite_purge_financials() to service_role;

-- ─── Automatic qualification rules (each must be approved by the owner) ─────
alter table public.elite_settings
  add column auto_rules jsonb not null default '{"investable_assets_from_balances": false}',
  add column max_data_age_days integer not null default 30 check (max_data_age_days between 1 and 365);
alter table public.elite_candidates add column review_reasons text[] not null default '{}';

-- Decides, from the evidence on file, whether a candidacy is conclusively qualified (then it proceeds
-- automatically: verification recorded, eligibility re-evaluated, invitation issued when every other
-- requirement is met) or needs the owner (then it moves to manual review with the reasons).
-- Never approves on deposits (not income) or on balances as net worth.
create or replace function public.elite_auto_assess(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s public.elite_settings; c public.elite_candidates;
  identity_ok boolean; th jsonb; owned_cents bigint; reasons text[] := '{}'; conclusive boolean := false;
  verified_q boolean; pending_evidence boolean; has_bank boolean; mismatch boolean;
begin
  if auth.uid() is not null and not public.has_staff_role(array['owner']::public.staff_role[]) then raise exception 'Not permitted'; end if;
  select * into s from public.elite_settings;
  select * into c from public.elite_candidates where user_id = p_user for update;
  if c.id is null or c.status in ('revoked', 'expired', 'invitation_issued', 'invitation_accepted', 'membership_activated', 'not_started') then
    return jsonb_build_object('result', 'skipped');
  end if;
  perform set_config('app.elite_system', 'on', true);

  identity_ok := exists (select 1 from public.identity_verifications v where v.user_id = p_user and v.status = 'verified')
    or exists (select 1 from public.elite_evidence e where e.candidate_id = c.id and e.kind = 'identity' and e.status in ('owner_verified', 'automated_verified'));
  verified_q := c.status = 'qualification_approved'
    or exists (select 1 from public.elite_evidence e where e.candidate_id = c.id and e.kind <> 'identity' and e.status in ('owner_verified', 'automated_verified'));
  has_bank := exists (select 1 from public.elite_financial_accounts a where a.candidate_id = c.id and a.data_status in ('collected', 'partial'));
  mismatch := exists (select 1 from public.elite_financial_accounts a where a.candidate_id = c.id and a.ownership_result in ('no_match', 'partial'));

  -- Rule: investable assets from balances on accounts the verified person owns (cash and investment accounts only).
  if not verified_q and c.qualification = 'investor' then
    th := s.thresholds -> 'investable_assets';
    if coalesce((s.auto_rules ->> 'investable_assets_from_balances')::boolean, false) and coalesce((th ->> 'approved')::boolean, false) and identity_ok then
      select coalesce(sum(a.balance_cents), 0) into owned_cents from public.elite_financial_accounts a
        where a.candidate_id = c.id and a.ownership_result = 'match' and a.category in ('cash', 'investment')
          and a.balance_currency = 'usd' and a.balance_cents > 0 and a.balance_as_of > now() - make_interval(days => s.max_data_age_days);
      if owned_cents >= (th ->> 'amount')::bigint * 100 then
        insert into public.elite_evidence (candidate_id, kind, status, description, reviewed_at)
          values (c.id, 'financial_verification', 'automated_verified', 'Automated: balances on accounts owned by the verified member meet the approved investable-assets threshold (Stripe Financial Connections).', now());
        conclusive := true; verified_q := true;
      else
        reasons := array_append(reasons, 'Owned account balances do not meet the investable-assets threshold on their own.');
      end if;
    end if;
  end if;

  if not identity_ok then reasons := array_append(reasons, 'Identity not yet verified.'); end if;
  if mismatch then reasons := array_append(reasons, 'A bank account holder name does not fully match the verified identity.'); end if;
  if not verified_q then
    if c.qualification in ('personal_income', 'business_owner', 'executive', 'net_worth', 'professional', 'retiree') then
      reasons := array_append(reasons, 'This pathway cannot be conclusively verified by Stripe; documents need your review.');
    elsif c.qualification = 'investor' and not coalesce((s.auto_rules ->> 'investable_assets_from_balances')::boolean, false) then
      reasons := array_append(reasons, 'Automatic investable-assets rule is not approved; documents need your review.');
    end if;
  end if;
  pending_evidence := exists (select 1 from public.elite_evidence e where e.candidate_id = c.id and e.status = 'submitted');

  if verified_q and identity_ok then
    update public.elite_candidates set review_reasons = '{}', status = case when status in ('preliminary', 'verification_pending', 'manual_review', 'info_required') then 'automated_verified' else status end where id = c.id;
  elsif (pending_evidence or has_bank) and c.status <> 'info_required' then
    update public.elite_candidates set review_reasons = reasons, status = 'manual_review' where id = c.id;
  else
    update public.elite_candidates set review_reasons = reasons where id = c.id;
  end if;
  perform set_config('app.elite_system', 'off', true);
  return jsonb_build_object('result', case when conclusive or (verified_q and identity_ok) then 'conclusive' else 'manual_review' end, 'reasons', to_jsonb(reasons),
    'evaluation', public.elite_evaluate(p_user));
end $$;
revoke all on function public.elite_auto_assess(uuid) from public, anon;
grant execute on function public.elite_auto_assess(uuid) to authenticated, service_role;

-- ─── Members' access to their own verification information ────────
create table public.elite_data_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('access', 'correction')),
  subject text not null check (subject in ('identity', 'bank', 'evidence', 'status', 'other')),
  message text not null check (char_length(message) between 1 and 4000),
  status text not null default 'open' check (status in ('open', 'completed', 'declined')),
  response text check (char_length(response) <= 4000),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
alter table public.elite_data_requests enable row level security;
create policy "member files own data request" on public.elite_data_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'open' and response is null and resolved_at is null);
create policy "member reads own data requests" on public.elite_data_requests for select to authenticated
  using (user_id = auth.uid() or public.has_staff_role(array['owner']::public.staff_role[]));
create policy "owner resolves data requests" on public.elite_data_requests for update to authenticated
  using (public.has_staff_role(array['owner']::public.staff_role[])) with check (public.has_staff_role(array['owner']::public.staff_role[]));
revoke all on public.elite_data_requests from public, anon;
grant select, insert, update on public.elite_data_requests to authenticated;
grant all on public.elite_data_requests to service_role;

-- Everything the platform holds about the signed-in member's Elite verification (their own data only).
-- The founder's confidential notes are not included; members may request them through a data request.
create or replace function public.elite_my_verification()
returns jsonb language sql stable security definer set search_path = public as $$
  with c as (select * from public.elite_candidates where user_id = auth.uid())
  select jsonb_build_object(
    'generated_at', now(),
    'candidacy', (select jsonb_build_object('pathway', c.pathway, 'qualification', c.qualification, 'status', c.status, 'self_reported_meets', c.screening_meets,
        'review_reasons', c.review_reasons, 'fee_waived', c.fee_waived, 'fee_paid_at', c.fee_paid_at, 'invitation_expires_at', c.invitation_expires_at, 'created_at', c.created_at) from c),
    'identity_verifications', coalesce((select jsonb_agg(jsonb_build_object('provider', v.provider, 'status', v.status, 'meets_minimum_age', v.age_meets_minimum,
        'verified_at', v.verified_at, 'started_at', v.created_at) order by v.created_at desc) from public.identity_verifications v where v.user_id = auth.uid()), '[]'),
    'bank_accounts', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'institution', a.institution_name, 'category', a.category, 'last4', a.last4, 'sandbox', not a.livemode,
        'ownership_result', a.ownership_result, 'balance_cents', a.balance_cents, 'balance_currency', a.balance_currency, 'balance_as_of', a.balance_as_of,
        'deposits_cents', a.deposits_cents, 'deposits_count', a.deposits_count, 'history_start', a.history_start, 'history_end', a.history_end, 'history_days', a.history_days,
        'data_status', a.data_status, 'disconnected_at', a.disconnected_at, 'erase_after', a.delete_after) order by a.created_at desc)
        from public.elite_financial_accounts a where a.user_id = auth.uid()), '[]'),
    'bank_consents', coalesce((select jsonb_agg(jsonb_build_object('consent_version', f.consent_version, 'consented_at', f.consented_at, 'status', f.status))
        from public.elite_financial_sessions f where f.user_id = auth.uid()), '[]'),
    'documents_and_evidence', coalesce((select jsonb_agg(jsonb_build_object('kind', e.kind, 'status', e.status, 'description', e.description, 'has_document', e.storage_path is not null,
        'note_from_reviewer', e.reviewer_note, 'submitted_at', e.created_at, 'reviewed_at', e.reviewed_at, 'erase_after', e.delete_after) order by e.created_at desc)
        from public.elite_evidence e join c on c.id = e.candidate_id), '[]'),
    'payments', coalesce((select jsonb_agg(jsonb_build_object('amount_cents', p.amount_cents, 'status', p.status, 'sandbox', not p.livemode, 'paid_at', p.paid_at))
        from public.elite_verification_payments p where p.user_id = auth.uid()), '[]'),
    'review_requests', coalesce((select jsonb_agg(jsonb_build_object('status', x.status, 'message', x.message, 'response', x.response, 'created_at', x.created_at))
        from public.elite_appeals x join c on c.id = x.candidate_id), '[]'),
    'data_requests', coalesce((select jsonb_agg(jsonb_build_object('kind', r.kind, 'subject', r.subject, 'status', r.status, 'response', r.response, 'created_at', r.created_at))
        from public.elite_data_requests r where r.user_id = auth.uid()), '[]'),
    'badge', (select jsonb_build_object('status', b.status, 'issued_at', b.issued_at) from public.elite_badges b where b.user_id = auth.uid())
  );
$$;
revoke all on function public.elite_my_verification() from public, anon;
grant execute on function public.elite_my_verification() to authenticated;
