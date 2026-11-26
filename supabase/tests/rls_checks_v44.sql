-- Business & Tax Education source library.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
insert into public.test_signups (email) values ('src-free@example.com'), ('src-paid@example.com');
insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000e501', 'src-free@example.com', '{"date_of_birth":"1980-01-01"}'),
  ('00000000-0000-0000-0000-00000000e502', 'src-paid@example.com', '{"date_of_birth":"1980-01-01"}');
insert into public.experience_access (user_id, experience, status, source) values ('00000000-0000-0000-0000-00000000e502', 'business', 'active', 'subscription');
\echo 'v44-1) Only government primary sources are accepted (expect error):'
insert into public.knowledge_sources (key, title, issuer, url, summary, verified_on) values ('blog', 'A tax blog', 'IRS', 'https://example.com/tax', 'Not a primary source at all.', current_date);
insert into public.knowledge_sources (key, title, issuer, document, url, tax_year, summary, verified_on, status, prepared_by) values
  ('pub-946', 'How To Depreciate Property', 'IRS', 'Publication 946', 'https://www.irs.gov/publications/p946', 2025, 'Explains depreciation methods and limits.', current_date, 'draft', 'peace'),
  ('pub-334', 'Tax Guide for Small Business', 'IRS', 'Publication 334', 'https://www.irs.gov/publications/p334', 2025, 'Covers small business income and expenses.', current_date, 'approved', 'owner');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000e502';
\echo 'v44-2) A paid member sees approved sources only, never drafts (expect 1|pub-334):'
select count(*) || '|' || string_agg(key, ',') from public.knowledge_sources;
\echo 'v44-3) A member cannot approve sources (expect 0 rows changed):'
with u as (update public.knowledge_sources set status = 'approved' returning 1) select count(*) from u;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000e501';
\echo 'v44-4) A free account sees no sources (expect 0):'
select count(*) from public.knowledge_sources;
reset role;
reset request.jwt.claim.sub;
\echo 'v44-5) Approval records an annual review date (expect t):'
select review_by = verified_on + 365 or review_by = (verified_on + interval '1 year')::date from public.knowledge_sources where key = 'pub-334';
delete from public.knowledge_sources where key in ('pub-946', 'pub-334');
