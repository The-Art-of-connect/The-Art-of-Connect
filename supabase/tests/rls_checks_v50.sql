-- My Intelligence Office: depth entitlement and finding integrity.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f101';
\echo 'v50-1) Executive members cannot request in-depth (Elite) research (expect error):'
insert into public.intel_assignments (user_id, title, objective, category, depth) values (auth.uid(), 'Deep test', 'A fictional in-depth research objective for testing.', 'other', 'deep');
\echo 'v50-2) Standard research is available to Executive members (expect 1):'
insert into public.intel_assignments (user_id, title, objective, category, depth) values (auth.uid(), 'Standard test', 'A fictional standard research objective for testing.', 'other', 'standard');
select count(*) from public.intel_assignments where title = 'Standard test';
reset role;
insert into public.intel_findings (assignment_id, kind, title, verification) select id, 'resource', 'Fictional lead', 'suggestion' from public.intel_assignments where title = 'Standard test';
set role authenticated;
\echo 'v50-3) Members can save a finding but cannot relabel its verification (expect error):'
update public.intel_findings set verification = 'confirmed' where title = 'Fictional lead';
\echo 'v50-4) Saving works (expect t):'
update public.intel_findings set saved = true where title = 'Fictional lead';
select saved from public.intel_findings where title = 'Fictional lead';
reset role;
reset request.jwt.claim.sub;
