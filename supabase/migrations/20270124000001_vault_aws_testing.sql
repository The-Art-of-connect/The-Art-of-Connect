-- Document Vault on Amazon S3 + GuardDuty Malware Protection: TESTING ONLY (owner approval of November 27, 2026).
-- Production document storage is not available: the only states are 'off' and 'aws_testing', and testing storage accepts
-- uploads only from the owner, staff and designated test accounts with fictional documents.

alter table business.suite_settings add column vault_storage text not null default 'off' check (vault_storage in ('off', 'aws_testing'));
alter table business.document_versions add column storage_provider text not null default 'none' check (storage_provider in ('none', 'aws_testing'));
alter table business.document_versions add column scan_checked_at timestamptz;

-- Nobody opens a file until the malware scan says it is clean: not even the person who uploaded it.
create or replace function business.can_open_version(vid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = business, public as $$
  select exists (select 1 from business.document_versions v where v.id = vid and business.can_see_document(v.document_id, uid) and v.scan_status = 'clean');
$$;

-- Who may upload to testing storage: the owner, staff and test accounts.
create or replace function business.vault_upload_allowed(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = business, public as $$
  select (select vault_storage from business.suite_settings) = 'aws_testing'
     and (exists (select 1 from public.profiles p where p.id = uid and p.is_test) or exists (select 1 from public.staff_roles r where r.user_id = uid));
$$;
grant execute on function business.vault_upload_allowed(uuid) to authenticated, service_role;

-- Owner-run security self-tests against the real AWS role and bucket (results only; no document contents, keys or tokens).
create table public.vault_security_runs (
  id uuid primary key default gen_random_uuid(),
  started_by uuid references public.profiles (id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'complete', 'failed')),
  objects jsonb not null default '{}' check (jsonb_typeof(objects) = 'object'),
  results jsonb not null default '[]' check (jsonb_typeof(results) = 'array')
);
alter table public.vault_security_runs enable row level security;
create policy "owner reads" on public.vault_security_runs for select to authenticated using (public.is_owner());
grant select on public.vault_security_runs to authenticated;
grant all on public.vault_security_runs to service_role;

insert into public.dev_tracker (key, area, title, detail, status, next_step, sort_order, designed, built, tests_passed, merged, deployed, operational, awaiting) values
  ('vault-aws-testing', 'CONNECT 360', 'Document Vault on S3 with GuardDuty (testing)',
   'Temporary credentials (15-minute role sessions with External ID); uploads by signed link bound to exact size and type; downloads only after the live GuardDuty tag reads NO_THREATS_FOUND (enforced by role, bucket policy, database and application); tag changes denied; owner-run security self-test against the real bucket.',
   'built', 'Owner: run the security self-test in Owner Portal → Document Vault security.', 496, true, true, true, false, false, false, 'owner')
on conflict (key) do nothing;
