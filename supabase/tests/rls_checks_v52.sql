-- QA preview access: the owner-listed fictional QA account previews closed experiences; members still wait for launch.
reset role;
reset request.jwt.claim.sub;
update public.platform_settings set value = 'false'::jsonb where key = 'relationships_live';
insert into public.test_signups (email) values ('v52-qa@example.com'), ('v52-member@example.com');
insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000f521', 'v52-qa@example.com', '{"date_of_birth":"1975-01-01"}'),
  ('00000000-0000-0000-0000-00000000f522', 'v52-member@example.com', '{"date_of_birth":"1975-01-01"}');
insert into public.experience_access (user_id, experience, status, source) values
  ('00000000-0000-0000-0000-00000000f521', 'relationships', 'active', 'comp'),
  ('00000000-0000-0000-0000-00000000f522', 'relationships', 'active', 'comp');
insert into public.qa_switchers (user_id) values ('00000000-0000-0000-0000-00000000f521');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f522';
\echo 'v52-1) A member with In Love waits for launch (expect f):'
select public.has_experience('relationships');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f521';
\echo 'v52-2) The QA account previews In Love before launch (expect t):'
select public.has_experience('relationships');
\echo 'v52-3) The QA account still needs the experience itself (expect f):'
select public.has_experience('business');
\echo 'v52-4) A regular member is not a QA account (expect f):'
select public.is_qa_account('00000000-0000-0000-0000-00000000f522');
reset role;
reset request.jwt.claim.sub;
\echo 'v52-5) An expired QA listing no longer previews (expect f):'
update public.qa_switchers set expires_at = now() - interval '1 minute' where user_id = '00000000-0000-0000-0000-00000000f521';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f521';
select public.has_experience('relationships');
reset role;
reset request.jwt.claim.sub;
