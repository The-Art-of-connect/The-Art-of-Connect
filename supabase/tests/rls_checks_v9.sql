-- Legal & Policy Center: drafts private, owner-only publication with recorded
-- attorney approval, immutable approved text and acceptance evidence.
reset role;
reset request.jwt.claim.sub;

\echo 'v9-1) Seeded: 19 documents, all drafts, 15 requirements, 30 decisions (expect 19|19|0|15|30):'
select (select count(*) from public.legal_documents), (select count(*) from public.legal_document_versions where status = 'draft'),
       (select count(*) from public.legal_document_versions where status <> 'draft'),
       (select count(*) from public.legal_compliance_items where kind = 'requirement'), (select count(*) from public.legal_compliance_items where kind = 'decision');

set role anon;
\echo 'v9-2) Public sees titles but no draft text, nothing in effect (expect 19|0|t):'
select jsonb_array_length(public.get_public_legal()),
       (select count(*) from jsonb_array_elements(public.get_public_legal()) e where (e->>'in_effect')::boolean),
       (public.get_public_legal('terms-of-service')->0->>'body') is null;
\echo 'v9-3) Anonymous reads draft versions directly (expect permission denied):'
select count(*) from public.legal_document_versions;
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000008';
\echo 'v9-4) A member cannot read drafts or the compliance checklist (expect 0|0):'
select (select count(*) from public.legal_document_versions), (select count(*) from public.legal_compliance_items);
\echo 'v9-5) A member cannot accept a document that is not in effect (expect error):'
select public.record_legal_acceptance(array['terms-of-service'], 'registration', 'I agree');

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000021';
\echo 'v9-6) Executive edits a draft and sends it for review (expect 1):'
update public.legal_document_versions set body = body || E'\n\nExecutive edit.', status = 'pending_owner_review' where document_slug = 'terms-of-service';
select count(*) from public.legal_document_versions where document_slug = 'terms-of-service' and status = 'pending_owner_review';
\echo 'v9-7) Executive tries to approve or publish (expect error):'
update public.legal_document_versions set status = 'approved' where document_slug = 'terms-of-service';
\echo 'v9-8) Executive tries to record attorney approval (expect error):'
update public.legal_document_versions set legal_approved_at = now(), legal_approved_by_name = 'Fake' where document_slug = 'terms-of-service';

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
\echo 'v9-9) Owner tries to publish without a recorded attorney approval (expect error):'
update public.legal_document_versions set status = 'published' where document_slug = 'terms-of-service';
\echo 'v9-10) Owner records attorney approval, approves and publishes (expect published|t):'
update public.legal_document_versions set status = 'pending_legal_review', legal_reviewer = 'Counsel LLP', legal_review_requested_at = now() where document_slug = 'terms-of-service';
update public.legal_document_versions set legal_approved_by_name = 'Jane Counsel, Esq.', legal_approved_at = now() where document_slug = 'terms-of-service';
update public.legal_document_versions set status = 'approved' where document_slug = 'terms-of-service';
update public.legal_document_versions set status = 'published' where document_slug = 'terms-of-service';
select status, published_by = '00000000-0000-0000-0000-000000000001' from public.legal_document_versions where document_slug = 'terms-of-service';
\echo 'v9-11) Published text cannot be edited (expect error):'
update public.legal_document_versions set body = 'changed' where document_slug = 'terms-of-service';
\echo 'v9-12) Scheduling needs a future time (expect error):'
update public.legal_document_versions set legal_approved_at = now(), legal_approved_by_name = 'Jane Counsel, Esq.', status = 'scheduled', scheduled_for = now() - interval '1 day' where document_slug = 'privacy-policy';
reset role;

set role anon;
\echo 'v9-13) Public now sees the published Terms in full (expect t|t):'
select (public.get_public_legal('terms-of-service')->0->>'in_effect')::boolean, length(public.get_public_legal('terms-of-service')->0->>'body') > 1000;
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000008';
\echo 'v9-14) Member accepts the Terms; evidence holds version and text fingerprint (expect 1|t|t):'
select public.record_legal_acceptance(array['terms-of-service'], 'registration', 'I have read and agree to the Terms of Service.', 'abcdef0123456789', 'test-agent');
select count(*), bool_and(length(body_sha256) = 64), bool_and(version_label = '2026-12-draft-1') from public.legal_acceptances where user_id = auth.uid();
\echo 'v9-15) Member cannot insert or alter acceptance records directly (expect error, 0):'
insert into public.legal_acceptances(user_id, document_slug, version_id, version_label, body_sha256, context, statement)
  select auth.uid(), 'privacy-policy', id, 'x', 'x', 'registration', 'x' from public.legal_document_versions limit 1;
update public.legal_acceptances set statement = 'changed' where user_id = auth.uid();
select count(*) from public.legal_acceptances where statement = 'changed';
\echo 'v9-16) Pending acceptances exclude what was accepted (expect 0 for terms):'
select count(*) from public.pending_legal_acceptances() where slug = 'terms-of-service';

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
\echo 'v9-17) Owner publishes a new version requiring re-acceptance; the old one is archived (expect archived|published):'
insert into public.legal_document_versions (document_slug, version_label, title, summary, body) select document_slug, '2027-01-v2', title, summary, body || E'\n\nUpdated.' from public.legal_document_versions where document_slug = 'terms-of-service';
update public.legal_document_versions set legal_approved_by_name = 'Jane Counsel, Esq.', legal_approved_at = now(), requires_reacceptance = true where version_label = '2027-01-v2';
update public.legal_document_versions set status = 'published' where version_label = '2027-01-v2';
select string_agg(status::text, '|' order by created_at) from public.legal_document_versions where document_slug = 'terms-of-service';

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000008';
\echo 'v9-18) Member is asked to accept the updated Terms (expect updated):'
select reason from public.pending_legal_acceptances() where slug = 'terms-of-service';
reset role;
reset request.jwt.claim.sub;

\echo 'v9-19) Acceptance evidence survives and cannot be deleted, even by the superuser (expect error, 1):'
delete from public.legal_acceptances;
select count(*) from public.legal_acceptances;
\echo 'v9-20) Legal audit trail records the publication and cannot be changed (expect t, error):'
select exists (select 1 from public.legal_audit_log where table_name = 'legal_document_versions' and new_values ->> 'status' = 'published' and actor_email is not null);
delete from public.legal_audit_log;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000008';
\echo 'v9-21) A member cannot record acceptance on behalf of another account (expect permission denied):'
select public.record_legal_acceptance_for('00000000-0000-0000-0000-000000000001', array['terms-of-service'], 'registration', 'x');
reset role;
reset request.jwt.claim.sub;
