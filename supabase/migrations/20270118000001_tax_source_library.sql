-- Business & Tax Education Center: the approved source library (founder directive 22, November 26, 2026).
-- Primary authoritative sources only (IRS, SBA, state revenue departments), each labeled by tax year and jurisdiction.
-- Journey may teach only from APPROVED sources and must cite them; nothing here is legal, tax or financial advice.
create table public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9-]{3,80}$'),
  title text not null check (char_length(title) between 3 and 300),
  issuer text not null check (issuer in ('IRS', 'SBA', 'State revenue')),
  document text check (char_length(document) <= 120),
  url text not null check (url ~ '^https://([a-z0-9-]+\.)*(irs\.gov|sba\.gov|[a-z0-9-]+\.gov)(/|$)'),
  jurisdiction text not null default 'US-federal' check (jurisdiction ~ '^US-(federal|[A-Z]{2})$'),
  tax_year integer check (tax_year between 2020 and 2100),
  revision text check (char_length(revision) <= 200),
  topics text[] not null default '{}' check (topics <@ array['business-structures', 'deductions', 'payroll', 'retirement-plans', 'depreciation',
    'financial-statements', 'cash-flow', 'business-credit', 'funding', 'expansion', 'succession', 'self-employment-tax', 'estimated-tax', 'qbi']::text[]),
  summary text not null check (char_length(summary) between 10 and 2000),
  key_facts jsonb not null default '[]' check (jsonb_typeof(key_facts) = 'array'),
  eligibility text check (char_length(eligibility) <= 2000),
  verified_on date not null,
  review_by date,
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived')),
  prepared_by text not null default 'owner' check (prepared_by in ('owner', 'peace', 'staff')),
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger touch_knowledge_sources before update on public.knowledge_sources for each row execute function public.touch_updated_at();
alter table public.knowledge_sources enable row level security;
-- Approved sources are visible to paid members (the Education Center shows its sources); drafts only to the owner and executives.
create policy "sources: approved for paid members" on public.knowledge_sources for select to authenticated
  using ((status = 'approved' and public.has_paid_membership(auth.uid())) or public.has_staff_role(array['owner', 'executive']::public.staff_role[]));
create policy "sources: studio edits" on public.knowledge_sources for all to authenticated
  using (public.has_staff_role(array['owner', 'executive']::public.staff_role[]))
  with check (public.has_staff_role(array['owner', 'executive']::public.staff_role[]));
-- Only the owner approves a source; approval is dated and an annual review date is set.
create or replace function public.guard_knowledge_source()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status <> 'approved') then
    if auth.uid() is not null and not public.is_owner() then raise exception 'Only the owner approves sources'; end if;
    new.approved_by := coalesce(auth.uid(), new.approved_by); new.approved_at := now();
    new.review_by := coalesce(new.review_by, (new.verified_on + interval '1 year')::date);
  end if;
  return new;
end $$;
create trigger guard_knowledge_source before insert or update on public.knowledge_sources for each row execute function public.guard_knowledge_source();
revoke all on public.knowledge_sources from public, anon;
grant select, insert, update, delete on public.knowledge_sources to authenticated;
grant all on public.knowledge_sources to service_role;

insert into public.dev_tracker (key, area, title, detail, status, next_step, sort_order, designed, built, tests_passed, merged, deployed, operational, awaiting) values
  ('tax-source-library', 'Executive & Elite', 'Business & Tax Education source library',
   'Primary sources only (IRS, SBA, state revenue departments), labeled by tax year, jurisdiction and revision, verified dates and annual review; owner-only approval in Curriculum Studio → Source library. Journey will teach only from approved sources.',
   'deployed', 'Owner: review and approve the first draft sources.', 481, true, true, true, true, true, false, 'owner')
on conflict (key) do nothing;
