-- Document Vault on S3 (testing): only scanned-clean files open; testing storage is off by default and limited to test and staff accounts.
reset role;
reset request.jwt.claim.sub;
\echo 'v48-1) Testing storage is off by default (expect off|f):'
select vault_storage, business.vault_upload_allowed('00000000-0000-0000-0000-00000000f201') from business.suite_settings;
\echo 'v48-2) There is no production storage setting (expect error):'
update business.suite_settings set vault_storage = 'aws_production';
update business.suite_settings set vault_storage = 'aws_testing';
\echo 'v48-3) With testing on, a test account may upload; a real (non-test) member may not (expect t|f):'
select business.vault_upload_allowed('00000000-0000-0000-0000-00000000f201'), business.vault_upload_allowed('00000000-0000-0000-0000-00000000f301');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f201';
insert into business.document_versions (document_id, version, storage_path, file_name, mime_type, size_bytes, sha256, uploaded_by, storage_provider, scan_status)
  select id, 0, 'pending-x', 'fictional.pdf', 'application/pdf', 100, repeat('c', 64), auth.uid(), 'aws_testing', 'clean' from business.room_documents where not privileged and category = 'letter_of_intent' limit 1;
\echo 'v48-4) A member cannot mark their own upload clean, and cannot open it before the scan, not even as the uploader (expect pending|f):'
select v.scan_status, business.can_open_version(v.id) from business.document_versions v where v.file_name = 'fictional.pdf';
reset role;
reset request.jwt.claim.sub;
update business.document_versions set scan_status = 'infected' where file_name = 'fictional.pdf';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f201';
\echo 'v48-5) An infected file never opens (expect f):'
select business.can_open_version(id) from business.document_versions where file_name = 'fictional.pdf';
reset role;
reset request.jwt.claim.sub;
update business.document_versions set scan_status = 'clean' where file_name = 'fictional.pdf';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f201';
\echo 'v48-6) Once clean, a participant may open it (expect t):'
select business.can_open_version(id) from business.document_versions where file_name = 'fictional.pdf';
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f205';
\echo 'v48-7) Another member outside the Deal Room cannot see or open it (expect 0|f):'
select (select count(*) from business.document_versions where file_name = 'fictional.pdf'),
       business.can_open_version((select id from business.document_versions where file_name = 'fictional.pdf' limit 1));
\echo 'v48-8) Members cannot change scan results (expect 0 rows changed):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f201';
with u as (update business.document_versions set scan_status = 'infected' where file_name = 'fictional.pdf' returning 1) select count(*) from u;
\echo 'v48-9) Only the owner reads security self-test results (expect 0):'
select count(*) from public.vault_security_runs;
reset role;
update business.suite_settings set vault_storage = 'off';
reset request.jwt.claim.sub;
