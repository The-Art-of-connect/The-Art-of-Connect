-- Curriculum versions: owner edits and publishes; members read only the published version.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
\echo 'v21-1) The owner saves two draft versions (expect 2):'
insert into public.curriculum_versions (section, version, content, created_by) values ('identity-self-love', 1, '{"title":"v1"}', auth.uid()), ('identity-self-love', 2, '{"title":"v2"}', auth.uid());
select count(*) from public.curriculum_versions;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000051';
\echo 'v21-2) A member sees no drafts (expect 0):'
select count(*) from public.curriculum_versions;
\echo 'v21-3) A member cannot write a version (expect error):'
insert into public.curriculum_versions (section, version, content) values ('identity-self-love', 9, '{}');
\echo 'v21-4) A member cannot publish (expect error):'
select public.publish_curriculum_version((select id from public.curriculum_versions limit 1));
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select public.publish_curriculum_version(id) from public.curriculum_versions where version = 1;
select public.publish_curriculum_version(id) from public.curriculum_versions where version = 2;
\echo 'v21-5) Publishing v2 archives v1 and keeps it (expect 1:archived|2:published):'
select string_agg(version || ':' || status, '|' order by version) from public.curriculum_versions;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000051';
\echo 'v21-6) A member reads only the published version (expect v2):'
select content->>'title' from public.curriculum_versions;
reset role;
