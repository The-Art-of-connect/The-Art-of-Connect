-- Owner decisions of November 27, 2026, the complimentary Résumé Builder and Business Launch Center (founder directive 31),
-- and the Capital Marketplace foundation (founder directive 30).
--
-- Owner decisions applied here:
--   1. Research testing budget approved: $25 per month, $5 per day, fictional scenarios only. Hard internal limits;
--      provider-side automatic top-ups stay off (an account setting the owner controls).
--   3. Planning and testing member budgets: Executive $15 per month, Elite $60 per month (final production limits after testing).
--   Financing is "funded" only with the lender's disbursement confirmation; an approval letter alone is not enough.
-- The division itself stays off until the provider accounts exist and the owner switches it on.

-- ─── 1 and 3. Research budget (testing only) ────────────────────────────────────────────────
alter table public.intel_settings add column testing_only boolean not null default true;
alter table public.intel_settings add column budget_note text check (char_length(budget_note) <= 1000);
update public.intel_settings set
  company_monthly_limit_cents = 2500, company_daily_limit_cents = 500,
  executive_member_monthly_cents = 1500, elite_member_monthly_cents = 6000,
  testing_only = true,
  budget_note = 'Approved by the owner on November 27, 2026: $25 per month and $5 per day for fictional test scenarios only; Executive $15 and Elite $60 per month for planning and testing. Final production limits follow cost and performance testing.';

-- While testing_only is on, research runs only for the owner, staff and designated test accounts.
create or replace function public.intel_can_spend(p_assignment uuid, p_estimate_cents integer)
returns text language plpgsql security definer set search_path = public as $$
declare s public.intel_settings; a public.intel_assignments; lvl text; member_cap integer; spent_month bigint; spent_day bigint; spent_member bigint;
begin
  select * into s from public.intel_settings;
  if not s.enabled then return 'refused:division_off'; end if;
  if s.emergency_stop then return 'refused:emergency_stop'; end if;
  if p_estimate_cents is null or p_estimate_cents <= 0 then return 'refused:no_estimate'; end if;
  select * into a from public.intel_assignments where id = p_assignment;
  if a.id is null or a.status in ('cancelled', 'complete', 'paused', 'failed') then return 'refused:not_active'; end if;
  lvl := public.intel_level(a.user_id);
  if lvl is null then return 'refused:not_entitled'; end if;
  if s.testing_only and not (exists (select 1 from public.profiles p where p.id = a.user_id and p.is_test)
                             or exists (select 1 from public.staff_roles r where r.user_id = a.user_id)) then
    return 'refused:testing_only';
  end if;
  if a.stage > s.max_stages then return 'refused:max_stages'; end if;
  if a.cost_cents + p_estimate_cents > s.per_assignment_limit_cents then return 'refused:assignment_limit'; end if;
  select coalesce(sum(greatest(cost_cents, estimated_cents)), 0) into spent_month from public.intel_jobs where created_at >= date_trunc('month', now());
  if spent_month + p_estimate_cents > s.company_monthly_limit_cents then return 'refused:company_monthly'; end if;
  select coalesce(sum(greatest(cost_cents, estimated_cents)), 0) into spent_day from public.intel_jobs where created_at >= date_trunc('day', now());
  if spent_day + p_estimate_cents > s.company_daily_limit_cents then return 'refused:company_daily'; end if;
  member_cap := case lvl when 'elite' then s.elite_member_monthly_cents else s.executive_member_monthly_cents end;
  select coalesce(sum(greatest(j.cost_cents, j.estimated_cents)), 0) into spent_member from public.intel_jobs j join public.intel_assignments x on x.id = j.assignment_id
    where x.user_id = a.user_id and j.created_at >= date_trunc('month', now());
  if spent_member + p_estimate_cents > member_cap then return 'refused:member_monthly'; end if;
  return 'allowed';
end $$;
revoke all on function public.intel_can_spend(uuid, integer) from public, anon, authenticated;
grant execute on function public.intel_can_spend(uuid, integer) to service_role;

-- Hard ceiling: the owner can raise limits, but never above these without a new migration (protects against a mistyped figure).
alter table public.intel_settings add constraint intel_settings_testing_ceiling
  check (not testing_only or (company_monthly_limit_cents <= 2500 and company_daily_limit_cents <= 500));

-- ─── Funded requires the lender's disbursement confirmation ────────────────────────────────
alter table business.room_documents drop constraint if exists room_documents_category_check;
alter table business.room_documents add constraint room_documents_category_check check (category in ('proposal', 'business_plan', 'development_plan',
  'confidentiality_agreement', 'letter_of_intent', 'memorandum_of_understanding', 'formation_document', 'operating_agreement', 'partnership_agreement',
  'shareholder_agreement', 'personal_financial_statement', 'business_financial_statement', 'tax_return', 'bank_statement', 'proof_of_funds', 'debt_schedule',
  'financing_application', 'financing_document', 'lender_correspondence', 'conditional_approval', 'commitment_letter', 'disbursement_confirmation',
  'due_diligence', 'regulatory_approval', 'purchase_agreement', 'attorney_correspondence', 'final_executed_agreement', 'projection', 'other'));

create or replace function business.guard_funding_application()
returns trigger language plpgsql security definer set search_path = business, public as $$
declare cat text;
begin
  if auth.uid() is null then raise exception 'Lender decisions are recorded by the member, never automatically.'; end if;
  if new.user_id <> auth.uid() or not exists (select 1 from business.funding_projects p where p.id = new.project_id and p.user_id = auth.uid()) then
    raise exception 'Not permitted';
  end if;
  if new.evidence_document_id is not null then
    select category into cat from business.room_documents d where d.id = new.evidence_document_id and d.uploaded_by = auth.uid();
    if cat is null then raise exception 'Attach a document you uploaded.'; end if;
  end if;
  if new.status in ('conditionally_approved', 'approved') and coalesce(cat, '') not in ('conditional_approval', 'commitment_letter', 'lender_correspondence', 'disbursement_confirmation') then
    raise exception 'Attach the lender''s approval or commitment letter before marking financing as approved.';
  end if;
  if new.status = 'funded' and coalesce(cat, '') <> 'disbursement_confirmation' then
    raise exception 'Financing is marked funded only with the lender''s disbursement confirmation. An approval letter alone is not enough.';
  end if;
  return new;
end $$;

-- ─── Professional Résumé Builder (directive 31): complimentary, private to the member ─────
create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'resume' check (kind in ('resume', 'letter')),
  title text not null check (char_length(title) between 1 and 120),
  template text not null check (template in ('signature', 'executive', 'foundation', 'transition', 'letter')),
  data jsonb not null default '{}' check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 60000),
  portfolio_authorized boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'letter') = (template = 'letter'))
);
create index resumes_user on public.resumes (user_id, updated_at desc);
create trigger touch_resumes before update on public.resumes for each row execute function public.touch_updated_at();
create table public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes (id) on delete cascade,
  version integer not null,
  label text check (char_length(label) <= 120),
  template text not null,
  data jsonb not null check (octet_length(data::text) <= 60000),
  created_at timestamptz not null default now(),
  unique (resume_id, version)
);
create or replace function public.guard_resume()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and (select count(*) from public.resumes where user_id = new.user_id) >= 25 then
    raise exception 'You can keep up to 25 résumés and letters. Remove one to add another.';
  end if;
  -- Connecting a résumé to the Opportunity Portfolio is a paid-membership feature.
  if new.portfolio_authorized and not public.has_paid_membership(new.user_id) then new.portfolio_authorized := false; end if;
  return new;
end $$;
create trigger guard_resume before insert or update on public.resumes for each row execute function public.guard_resume();
create or replace function public.number_resume_version()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.version := coalesce((select max(version) from public.resume_versions where resume_id = new.resume_id), 0) + 1;
  if new.version > 30 then
    delete from public.resume_versions where resume_id = new.resume_id and version = (select min(version) from public.resume_versions where resume_id = new.resume_id);
  end if;
  return new;
end $$;
create trigger number_resume_version before insert on public.resume_versions for each row execute function public.number_resume_version();
alter table public.resumes enable row level security;
alter table public.resume_versions enable row level security;
create policy "own" on public.resumes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own" on public.resume_versions for all to authenticated
  using (exists (select 1 from public.resumes r where r.id = resume_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.resumes r where r.id = resume_id and r.user_id = auth.uid()));
grant select, insert, update, delete on public.resumes, public.resume_versions to authenticated;
grant all on public.resumes, public.resume_versions to service_role;

-- ─── Business Launch Center (directive 31): 50 states + D.C. ───────────────────────────────
-- Official links are shown for every jurisdiction; fee and annual-report figures appear to members only after the owner
-- approves the entry (each entry is sourced from official state pages and dated).
create table public.formation_jurisdictions (
  code text primary key check (code ~ '^[A-Z]{2}$'),
  name text not null,
  filing_office text,
  filing_office_url text check (filing_office_url ~ '^https?://'),
  business_name_search_url text check (business_name_search_url ~ '^https?://'),
  online_filing_url text check (online_filing_url ~ '^https?://'),
  business_license_url text check (business_license_url ~ '^https?://'),
  revenue_department_url text check (revenue_department_url ~ '^https?://'),
  llc jsonb not null default '{}', corporation jsonb not null default '{}', nonprofit jsonb not null default '{}',
  registered_agent text,
  sources jsonb not null default '[]',
  uncertain jsonb not null default '[]',
  verified_on date,
  review_by date,
  status text not null default 'draft' check (status in ('draft', 'approved')),
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  updated_at timestamptz not null default now()
);
create or replace function public.guard_jurisdiction()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status <> 'approved' or new.llc is distinct from old.llc
     or new.corporation is distinct from old.corporation or new.nonprofit is distinct from old.nonprofit) then
    if auth.uid() is null or not public.is_owner() then new.status := 'draft'; new.approved_by := null; new.approved_at := null;
    else new.approved_by := auth.uid(); new.approved_at := now(); end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger guard_jurisdiction before insert or update on public.formation_jurisdictions for each row execute function public.guard_jurisdiction();

-- The member's businesses (planned or formed), with compliance reminders.
create table public.member_businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  entity_type text not null check (entity_type in ('llc', 'corporation', 'nonprofit', 'sole_proprietorship', 'partnership', 'undecided')),
  tax_election text check (tax_election in ('default', 's_corporation', 'c_corporation', 'tax_exempt', 'undecided')),
  state text check (state ~ '^[A-Z]{2}$'),
  stage text not null default 'planning' check (stage in ('planning', 'name_check', 'preparing', 'filed', 'formed', 'dissolved')),
  formed_on date,
  ein_status text not null default 'not_started' check (ein_status in ('not_started', 'applied', 'received')),
  annual_report_month integer check (annual_report_month between 1 and 12),
  reminders boolean not null default true,
  checklist jsonb not null default '{}' check (jsonb_typeof(checklist) = 'object'),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger touch_member_businesses before update on public.member_businesses for each row execute function public.touch_updated_at();
create or replace function public.cap_member_businesses()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.member_businesses where user_id = new.user_id) >= 10 then raise exception 'You can track up to 10 businesses.'; end if;
  return new;
end $$;
create trigger cap_member_businesses before insert on public.member_businesses for each row execute function public.cap_member_businesses();

-- Formation orders through an approved provider (Bizee). Prepared and authorized by the member; nothing is submitted or charged
-- until the owner activates the provider and payments. Every fee is disclosed separately before authorization.
create table public.formation_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid not null references public.member_businesses (id) on delete cascade,
  provider text not null check (provider in ('bizee', 'self_filed')),
  package text check (char_length(package) <= 80),
  status text not null default 'draft' check (status in ('draft', 'disclosed', 'authorized', 'submitted', 'processing', 'filed', 'completed', 'cancelled', 'refunded', 'failed')),
  government_fee_cents integer check (government_fee_cents >= 0),
  third_party_fee_cents integer check (third_party_fee_cents >= 0),
  service_charge_cents integer check (service_charge_cents >= 0),
  recurring_fees jsonb not null default '[]' check (jsonb_typeof(recurring_fees) = 'array'),
  disclosed_at timestamptz,
  authorized_at timestamptz,
  provider_order_ref text check (char_length(provider_order_ref) <= 120),
  attribution text check (char_length(attribution) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger touch_formation_orders before update on public.formation_orders for each row execute function public.touch_updated_at();
create or replace function public.guard_formation_order()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if; -- provider updates run on the server
  if new.user_id <> auth.uid() or not exists (select 1 from public.member_businesses b where b.id = new.business_id and b.user_id = auth.uid()) then raise exception 'Not permitted'; end if;
  if tg_op = 'INSERT' then
    new.status := 'draft'; new.provider_order_ref := null; new.disclosed_at := null; new.authorized_at := null;
    new.government_fee_cents := null; new.third_party_fee_cents := null; new.service_charge_cents := null;
    return new;
  end if;
  if (new.government_fee_cents, new.third_party_fee_cents, new.service_charge_cents, new.recurring_fees, new.provider_order_ref, new.disclosed_at)
     is distinct from (old.government_fee_cents, old.third_party_fee_cents, old.service_charge_cents, old.recurring_fees, old.provider_order_ref, old.disclosed_at) then
    raise exception 'Fees and order details come from the provider.';
  end if;
  if new.status is distinct from old.status then
    if new.status = 'authorized' then
      if old.status <> 'disclosed' then raise exception 'Review every fee before authorizing.'; end if;
      if new.provider = 'bizee' and not coalesce((select value = 'true' from public.platform_settings where key = 'formation_orders_live'), false) then
        raise exception 'Formation orders through a partner are not available yet.';
      end if;
      new.authorized_at := now();
    elsif new.status <> 'cancelled' or old.status not in ('draft', 'disclosed', 'authorized') then
      raise exception 'Not permitted';
    end if;
  end if;
  return new;
end $$;
create trigger guard_formation_order before insert or update on public.formation_orders for each row execute function public.guard_formation_order();
insert into public.platform_settings (key, value) values ('formation_orders_live', 'false') on conflict (key) do nothing;

-- Formation revenue (owner and finance): affiliate commissions or wholesale margins, once approved.
create table public.formation_revenue (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.formation_orders (id) on delete set null,
  kind text not null check (kind in ('affiliate_commission', 'wholesale_margin', 'refund', 'adjustment')),
  amount_cents integer not null,
  third_party_cost_cents integer not null default 0 check (third_party_cost_cents >= 0),
  status text not null default 'expected' check (status in ('expected', 'received', 'reversed', 'refunded')),
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);

alter table public.formation_jurisdictions enable row level security;
alter table public.member_businesses enable row level security;
alter table public.formation_orders enable row level security;
alter table public.formation_revenue enable row level security;
create policy "members read" on public.formation_jurisdictions for select to authenticated using (true);
create policy "owner manages" on public.formation_jurisdictions for all to authenticated
  using (public.has_staff_role(array['owner', 'executive']::public.staff_role[])) with check (public.has_staff_role(array['owner', 'executive']::public.staff_role[]));
create policy "own" on public.member_businesses for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own" on public.formation_orders for select to authenticated using (user_id = auth.uid());
create policy "own drafts" on public.formation_orders for insert to authenticated with check (user_id = auth.uid());
create policy "own updates" on public.formation_orders for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "finance" on public.formation_revenue for all to authenticated
  using (public.has_staff_role(array['owner', 'finance']::public.staff_role[])) with check (public.has_staff_role(array['owner', 'finance']::public.staff_role[]));
grant select on public.formation_jurisdictions to authenticated;
grant insert, update on public.formation_jurisdictions to authenticated;
grant select, insert, update, delete on public.member_businesses to authenticated;
grant select, insert, update on public.formation_orders to authenticated;
grant select, insert, update on public.formation_revenue to authenticated;
grant all on public.formation_jurisdictions, public.member_businesses, public.formation_orders, public.formation_revenue to service_role;

-- Owner analytics: counts and money totals only (no member names).
create or replace function public.formation_summary()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_staff_role(array['owner', 'finance', 'executive']::public.staff_role[]) then raise exception 'Not permitted'; end if;
  return jsonb_build_object(
    'businesses', (select count(*) from public.member_businesses),
    'by_stage', coalesce((select jsonb_object_agg(stage, n) from (select stage, count(*) n from public.member_businesses group by 1) s), '{}'),
    'orders', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from public.formation_orders group by 1) s), '{}'),
    'revenue_received_cents', (select coalesce(sum(amount_cents), 0) from public.formation_revenue where status = 'received'),
    'revenue_expected_cents', (select coalesce(sum(amount_cents), 0) from public.formation_revenue where status = 'expected'),
    'third_party_cost_cents', (select coalesce(sum(third_party_cost_cents), 0) from public.formation_revenue),
    'jurisdictions_approved', (select count(*) from public.formation_jurisdictions where status = 'approved'));
end $$;
grant execute on function public.formation_summary() to authenticated;

-- ─── Capital Marketplace foundation (directive 30) ─────────────────────────────────────────
-- Owner-managed lender directory. A lender is activated only with an executed partnership agreement and the owner's approval;
-- a paid commission additionally requires the transaction-compensation restriction to have been lifted after legal review.
-- Lender ranking for members never uses compensation (there is deliberately no ranking field tied to commission).
create table business.lenders (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 160),
  website text check (website ~ '^https://'),
  relationship text not null default 'research' check (relationship in ('research', 'owner_relationship')),
  lender_type text check (lender_type in ('direct_lender', 'marketplace', 'embedded_infrastructure', 'bank', 'credit_union', 'sba_lender', 'cdfi', 'equipment', 'franchise', 'commercial_real_estate', 'other')),
  partnership_contact text check (char_length(partnership_contact) <= 300),
  partner_application_url text check (partner_application_url ~ '^https://'),
  developer_docs_url text check (developer_docs_url ~ '^https://'),
  products text[] not null default '{}',
  merchant_cash_advance boolean not null default false,
  min_amount_cents bigint, max_amount_cents bigint,
  eligible_industries text check (char_length(eligible_industries) <= 1000),
  excluded_industries text check (char_length(excluded_industries) <= 1000),
  geography text check (char_length(geography) <= 300),
  min_months_in_business integer, min_annual_revenue_cents bigint, min_credit_score integer,
  qualification_notes text check (char_length(qualification_notes) <= 2000),
  capabilities jsonb not null default '{}' check (jsonb_typeof(capabilities) = 'object'),
  integration_cost_note text check (char_length(integration_cost_note) <= 1000),
  published_compensation text check (char_length(published_compensation) <= 500),
  proposed_commission_bps integer check (proposed_commission_bps between 0 and 2000),
  agreement_status text not null default 'none' check (agreement_status in ('none', 'inquiry', 'negotiating', 'executed', 'terminated')),
  agreement_signed_on date,
  compliance_notes text check (char_length(compliance_notes) <= 4000),
  regulatory_actions text check (char_length(regulatory_actions) <= 2000),
  activation_status text not null default 'inactive' check (activation_status in ('inactive', 'active', 'paused')),
  activated_by uuid references public.profiles (id),
  activated_at timestamptz,
  sources jsonb not null default '[]',
  verified_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger touch_lenders before update on business.lenders for each row execute function public.touch_updated_at();
create or replace function business.guard_lender()
returns trigger language plpgsql security definer set search_path = business, public as $$
begin
  if new.activation_status = 'active' and (tg_op = 'INSERT' or old.activation_status <> 'active') then
    if auth.uid() is null or not public.is_owner() then raise exception 'Only the owner activates a lender.'; end if;
    if new.agreement_status <> 'executed' or new.agreement_signed_on is null then raise exception 'A lender is activated only with an executed partnership agreement.'; end if;
    if business.is_restricted('external_credit_applications') then raise exception 'Sending applications to lenders stays restricted until legal review is recorded.'; end if;
    if coalesce(new.proposed_commission_bps, 0) > 0 and business.is_restricted('transaction_compensation') then
      raise exception 'Commission-paying partnerships stay restricted until legal review is recorded.';
    end if;
    new.activated_by := auth.uid(); new.activated_at := now();
  end if;
  return new;
end $$;
create trigger guard_lender before insert or update on business.lenders for each row execute function business.guard_lender();

-- Commission rules: the 5% target is the default lender-paid rate; members are never charged by these rules.
create table business.commission_rules (
  id uuid primary key default gen_random_uuid(),
  lender_id uuid references business.lenders (id) on delete cascade,
  program text check (char_length(program) <= 160),
  payer text not null default 'lender' check (payer = 'lender'),
  basis text not null default 'funded_principal' check (basis in ('funded_principal', 'flat_fee')),
  rate_bps integer not null default 500 check (rate_bps between 0 and 2000),
  flat_fee_cents integer check (flat_fee_cents >= 0),
  tiers jsonb not null default '[]' check (jsonb_typeof(tiers) = 'array'),
  renewal_rate_bps integer check (renewal_rate_bps between 0 and 2000),
  splits jsonb not null default '[]' check (jsonb_typeof(splits) = 'array'),
  restrictions text check (char_length(restrictions) <= 2000),
  is_exception boolean not null default false,
  exception_reason text check (char_length(exception_reason) <= 1000),
  status text not null default 'draft' check (status in ('draft', 'approved', 'retired')),
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  check (not is_exception or char_length(btrim(coalesce(exception_reason, ''))) >= 10)
);
insert into business.commission_rules (lender_id, program, rate_bps, status, restrictions)
  values (null, 'Standard target (all lenders)', 500, 'draft', 'Target only: applies where legally permitted and contractually agreed; lender-paid; never charged to members.');
create or replace function business.guard_commission_rule()
returns trigger language plpgsql security definer set search_path = business, public as $$
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status <> 'approved' or (new.rate_bps, new.tiers, new.splits, new.renewal_rate_bps) is distinct from (old.rate_bps, old.tiers, old.splits, old.renewal_rate_bps)) then
    if auth.uid() is null or not public.is_owner() then raise exception 'Only the owner approves compensation arrangements and exceptions.'; end if;
    if business.is_restricted('transaction_compensation') then raise exception 'Compensation arrangements stay restricted until legal review is recorded.'; end if;
    new.approved_by := auth.uid(); new.approved_at := now();
  end if;
  return new;
end $$;
create trigger guard_commission_rule before insert or update on business.commission_rules for each row execute function business.guard_commission_rule();

-- Commission ledger: recorded only for financing confirmed funded by the lender's disbursement confirmation.
create table business.commission_ledger (
  id uuid primary key default gen_random_uuid(),
  lender_id uuid not null references business.lenders (id),
  rule_id uuid references business.commission_rules (id),
  application_id uuid references business.funding_applications (id) on delete set null,
  kind text not null default 'commission' check (kind in ('commission', 'renewal', 'split_out', 'clawback', 'refund', 'adjustment')),
  funded_principal_cents bigint check (funded_principal_cents >= 0),
  rate_bps integer check (rate_bps between 0 and 2000),
  expected_cents bigint not null,
  received_cents bigint not null default 0,
  status text not null default 'expected' check (status in ('expected', 'invoiced', 'partial', 'received', 'clawed_back', 'refunded', 'written_off')),
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger touch_commission_ledger before update on business.commission_ledger for each row execute function public.touch_updated_at();
create or replace function business.guard_commission_entry()
returns trigger language plpgsql security definer set search_path = business, public as $$
begin
  if business.is_restricted('transaction_compensation') then raise exception 'Commission tracking opens after legal review of transaction-based compensation.'; end if;
  if tg_op = 'INSERT' and new.kind in ('commission', 'renewal') and not exists (select 1 from business.funding_applications a where a.id = new.application_id and a.status = 'funded') then
    raise exception 'A commission is recorded only for financing confirmed funded by the lender''s disbursement.';
  end if;
  return new;
end $$;
create trigger guard_commission_entry before insert or update on business.commission_ledger for each row execute function business.guard_commission_entry();

-- Member consent before any information goes to a specific lender (one consent per lender, revocable).
create table business.lender_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lender_id uuid not null references business.lenders (id) on delete cascade,
  project_id uuid references business.funding_projects (id) on delete set null,
  scope text[] not null check (scope <@ array['business_profile', 'funding_request', 'financial_summary', 'documents', 'contact_details']::text[] and cardinality(scope) > 0),
  credit_inquiry text not null default 'none' check (credit_inquiry in ('none', 'soft', 'hard')),
  consent_text_version text not null,
  consented_at timestamptz not null default now(),
  revoked_at timestamptz
);
create or replace function business.guard_lender_consent()
returns trigger language plpgsql security definer set search_path = business, public as $$
begin
  if tg_op = 'INSERT' then
    if new.user_id <> auth.uid() then raise exception 'Not permitted'; end if;
    if not exists (select 1 from business.lenders l where l.id = new.lender_id and l.activation_status = 'active') then
      raise exception 'This lender is not participating yet.';
    end if;
  elsif (new.scope, new.lender_id, new.user_id, new.credit_inquiry, new.consented_at) is distinct from (old.scope, old.lender_id, old.user_id, old.credit_inquiry, old.consented_at) then
    raise exception 'Record a new consent instead of changing one.';
  end if;
  return new;
end $$;
create trigger guard_lender_consent before insert or update on business.lender_consents for each row execute function business.guard_lender_consent();

alter table business.lenders enable row level security;
alter table business.commission_rules enable row level security;
alter table business.commission_ledger enable row level security;
alter table business.lender_consents enable row level security;
create policy "members see active lenders" on business.lenders for select to authenticated
  using (activation_status = 'active' or public.has_staff_role(array['owner', 'finance', 'executive']::public.staff_role[]));
create policy "owner manages" on business.lenders for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "owner and finance" on business.commission_rules for select to authenticated using (public.has_staff_role(array['owner', 'finance']::public.staff_role[]));
create policy "owner manages" on business.commission_rules for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "owner and finance" on business.commission_ledger for all to authenticated
  using (public.has_staff_role(array['owner', 'finance']::public.staff_role[])) with check (public.has_staff_role(array['owner', 'finance']::public.staff_role[]));
create policy "own" on business.lender_consents for select to authenticated using (user_id = auth.uid());
create policy "give" on business.lender_consents for insert to authenticated with check (user_id = auth.uid());
create policy "revoke" on business.lender_consents for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on business.lenders, business.commission_rules, business.commission_ledger to authenticated;
grant select, insert, update on business.lender_consents to authenticated;
grant all on business.lenders, business.commission_rules, business.commission_ledger, business.lender_consents to service_role;

-- ─── Registry, tracker and QA ──────────────────────────────────────────────────────────────
insert into public.dev_tracker (key, area, title, detail, status, next_step, sort_order, designed, built, tests_passed, merged, deployed, operational, awaiting) values
  ('resume-builder', 'Art of Becoming', 'Professional Résumé Builder (complimentary)',
   'Four résumé templates and a cover letter, guided sections with prewritten educational guidance (no AI for complimentary members), saved versions, PDF and Word downloads; paid members may authorize the résumé for their Opportunity Portfolio.',
   'built', 'Owner: try it with a fictional résumé on the free test account.', 490, true, true, true, false, false, false, null),
  ('launch-center', 'Art of Becoming', 'Business Launch Center (50 states + D.C.)',
   'State selection, structures vs tax elections (including S corporation), official name search, filing, licensing and revenue links, IRS EIN link, my businesses with compliance reminders; fees shown after owner approval of each state entry.',
   'built', 'Owner: review and approve the state entries (official sources, dated).', 491, true, true, true, false, false, false, 'owner'),
  ('bizee-integration', 'Art of Becoming', 'Bizee formation partnership',
   'Order drafts with full fee disclosure and member authorization; provider submission, tracking and documents need Bizee Platform access (sandbox first) and owner activation. Affiliate path available as an alternative.',
   'designed', 'Owner: ask Bizee about Platform access for your account (questions prepared).', 492, true, false, false, false, false, false, 'owner'),
  ('capital-marketplace', 'CONNECT 360', 'Capital Marketplace foundation (lender directory, commissions, consents)',
   'Owner-managed lender directory; activation needs an executed agreement, owner approval and recorded legal review; lender-paid commission rules (5% target, draft), ledger only for disbursement-confirmed funding; per-lender member consent; ranking never uses compensation.',
   'built', 'Owner: legal review of broker licensing and compensation before any activation.', 493, true, true, true, false, false, false, 'owner')
on conflict (key) do nothing;

insert into public.qa_features (key, department, title, tracker_key, href, purpose, steps, expected, sort) values
  ('resume-builder', 'art-of-self', 'Professional Résumé Builder', 'resume-builder', '/app/career/resume',
    'Complimentary résumés and cover letters that never invent facts.',
    array['As the free test account, create a résumé from each template with fictional details.', 'Save a version, change the template, and restore the earlier version.', 'Download the PDF and the Word file; both open and read cleanly.', 'Confirm Journey assistance is offered only to paid memberships.']::text[],
    'Private, polished and honest.', 490),
  ('launch-center', 'professional', 'Business Launch Center', 'launch-center', '/app/launch',
    'Official resources for every state and D.C.',
    array['Choose several states and open each official link.', 'Before approval, fees read "See the official fee schedule"; after the owner approves a state, its figures appear with the date checked.', 'Add a fictional business and set an annual report month; the reminder appears.']::text[],
    'Accurate, sourced and clearly dated.', 491),
  ('funded-evidence', 'professional', 'Funded needs disbursement confirmation', 'bd-foundation', null,
    'An approval letter alone never marks financing funded.',
    array['Attach a fictional commitment letter and try to mark the application Funded: refused.', 'Attach a fictional disbursement confirmation: Funded is accepted.']::text[],
    'Funded only with the lender''s disbursement confirmation.', 492)
on conflict (key) do nothing;
