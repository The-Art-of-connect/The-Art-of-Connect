-- Development Tracker honesty rules.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
\echo 'v29-1) A feature cannot be marked operational unless built, tested, merged and deployed (expect error):'
update public.dev_tracker set operational = true where key = 'session-quotes';
\echo 'v29-2) A feature cannot be owner-approved before the owner has tested it (expect error):'
update public.dev_tracker set owner_approved = true where key = 'journey-text';
\echo 'v29-3) Recording owner testing stamps the date (expect t):'
update public.dev_tracker set owner_tested = true where key = 'journey-text';
select tested_by_owner_at is not null from public.dev_tracker where key = 'journey-text';
