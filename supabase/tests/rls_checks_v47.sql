-- Owner decisions (testing budget, disbursement confirmation), Résumé Builder, Business Launch Center and Capital Marketplace.
reset role;
reset request.jwt.claim.sub;
insert into public.test_signups (email) values ('v47-real@example.com'), ('v47-free@example.com');
insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000f301', 'v47-real@example.com', '{"date_of_birth":"1974-01-01"}'),
  ('00000000-0000-0000-0000-00000000f302', 'v47-free@example.com', '{"date_of_birth":"1990-01-01"}');
update public.profiles set is_test = false where id = '00000000-0000-0000-0000-00000000f301';
insert into public.subscriptions (user_id, status, kind, tier_slug, tier_name, experiences, stripe_subscription_id) values
  ('00000000-0000-0000-0000-00000000f301', 'active', 'member', 'executive-private', 'Executive Private', '{business,relationships}', 'sub_test_v47_real');
insert into public.intel_assignments (user_id, title, objective, category, status) values ('00000000-0000-0000-0000-00000000f301', 'Real member', 'A non-test member''s research objective.', 'other', 'queued');
update public.intel_settings set enabled = true;
\echo 'v47-1) While testing only, research for a real (non-test) member is refused (expect refused:testing_only):'
select public.intel_can_spend((select id from public.intel_assignments where user_id = '00000000-0000-0000-0000-00000000f301'), 10);
\echo 'v47-2) The testing ceiling cannot be exceeded by a mistyped limit (expect error):'
update public.intel_settings set company_monthly_limit_cents = 250000;
\echo 'v47-3) The approved limits are in place (expect 2500|500|1500|6000|t):'
select company_monthly_limit_cents, company_daily_limit_cents, executive_member_monthly_cents, elite_member_monthly_cents, testing_only from public.intel_settings;
update public.intel_settings set enabled = false;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f201';
\echo 'v47-4) A commitment letter alone does not make financing funded (expect error):'
insert into business.room_documents (room_id, uploaded_by, category, title) select id, auth.uid(), 'commitment_letter', 'Fictional commitment letter' from business.deal_rooms limit 1;
insert into business.funding_applications (project_id, user_id, provider_name, status, evidence_document_id)
  select p.id, auth.uid(), 'Fictional Community Bank', 'funded', d.id from business.funding_projects p, business.room_documents d where d.category = 'commitment_letter' limit 1;
\echo 'v47-5) The lender''s disbursement confirmation does (expect funded):'
insert into business.room_documents (room_id, uploaded_by, category, title) select id, auth.uid(), 'disbursement_confirmation', 'Fictional disbursement confirmation' from business.deal_rooms limit 1;
insert into business.funding_applications (project_id, user_id, provider_name, status, evidence_document_id)
  select p.id, auth.uid(), 'Fictional Community Bank', 'funded', d.id from business.funding_projects p, business.room_documents d where d.category = 'disbursement_confirmation' limit 1;
select status from business.funding_applications where status = 'funded';

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f302';
\echo 'v47-6) A complimentary member builds a résumé and saves a version; portfolio link stays off without a paid membership (expect 1|1|f):'
insert into public.resumes (user_id, title, template, data, portfolio_authorized) values (auth.uid(), 'Fictional résumé', 'signature', '{"summary": "Fictional summary."}', true);
insert into public.resume_versions (resume_id, version, template, data) select id, 0, template, data from public.resumes;
select (select count(*) from public.resumes), (select max(version) from public.resume_versions), (select portfolio_authorized from public.resumes);
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f201';
\echo 'v47-7) Another member never sees it (expect 0|0):'
select (select count(*) from public.resumes where user_id = '00000000-0000-0000-0000-00000000f302'), (select count(*) from public.resume_versions);

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f302';
\echo 'v47-8) A member tracks a business and drafts a formation order; fees come only from the provider (expect error):'
insert into public.member_businesses (user_id, name, entity_type, state) values (auth.uid(), 'Fictional Bloom Studio LLC', 'llc', 'GA');
insert into public.formation_orders (user_id, business_id, provider) select auth.uid(), id, 'bizee' from public.member_businesses;
update public.formation_orders set government_fee_cents = 0;
\echo 'v47-9) An order cannot be authorized before every fee is disclosed (expect error):'
update public.formation_orders set status = 'authorized';
\echo 'v47-10) Members cannot see lenders that are not active, or commission rules (expect 0|0):'
select (select count(*) from business.lenders), (select count(*) from business.commission_rules);

reset role;
insert into business.lenders (name, website) values ('Fictional Capital Partners', 'https://example.com');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
\echo 'v47-11) The owner cannot activate a lender without an executed agreement (expect error):'
update business.lenders set activation_status = 'active' where name = 'Fictional Capital Partners';
\echo 'v47-12) Even with an agreement, activation waits for the recorded legal review (expect error):'
update business.lenders set agreement_status = 'executed', agreement_signed_on = current_date, activation_status = 'active' where name = 'Fictional Capital Partners';
\echo 'v47-13) The 5% commission rule cannot be approved while compensation is restricted (expect error):'
update business.commission_rules set status = 'approved';
\echo 'v47-14) Commission rules never charge members (expect error):'
insert into business.commission_rules (payer, rate_bps) values ('member', 500);
\echo 'v47-15) Commissions cannot be recorded while restricted (expect error):'
insert into business.commission_ledger (lender_id, expected_cents) select id, 100 from business.lenders limit 1;
\echo 'v47-16) Members cannot approve a state''s fee data (expect draft):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f302';
reset role;
insert into public.formation_jurisdictions (code, name, status) values ('ZZ', 'Fictional Territory', 'approved');
select status from public.formation_jurisdictions where code = 'ZZ';
delete from public.formation_jurisdictions where code = 'ZZ';
reset request.jwt.claim.sub;
