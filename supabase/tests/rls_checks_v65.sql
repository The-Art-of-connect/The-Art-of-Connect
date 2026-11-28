-- Directive 51 item 4: My Global Watchlist, Opportunity Radar and the Application Center (privacy, owner-curated
-- opportunities, approved résumés only, append-only history, and one deadline notice per deadline).
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
insert into public.test_signups (email) values ('v65-elite@example.com'), ('v65-exec@example.com'), ('v65-one@example.com');
insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000f651', 'v65-elite@example.com', '{"date_of_birth":"1975-01-01"}'),
  ('00000000-0000-0000-0000-00000000f652', 'v65-exec@example.com', '{"date_of_birth":"1975-01-01"}'),
  ('00000000-0000-0000-0000-00000000f653', 'v65-one@example.com', '{"date_of_birth":"1975-01-01"}');
insert into public.subscriptions (user_id, status, kind, tier_slug, tier_name, experiences, stripe_subscription_id) values
  ('00000000-0000-0000-0000-00000000f651', 'active', 'member', 'elite-concierge', 'Elite Concierge', '{business,relationships}', 'sub_test_v65_elite'),
  ('00000000-0000-0000-0000-00000000f652', 'active', 'member', 'executive-private', 'Executive Private', '{business,relationships}', 'sub_test_v65_exec'),
  ('00000000-0000-0000-0000-00000000f653', 'active', 'member', 'professional-society', 'The Professional Society', '{business}', 'sub_test_v65_one');
-- The owner's curated opportunity (fictional) and a draft that members must not see.
insert into public.radar_opportunities (id, title, organization, category, summary, official_url, deadline, status) values
  ('00000000-0000-0000-0000-0000000f6501', 'Fictional small business grant', 'Example Foundation', 'grant', 'A fictional grant used only for testing.', 'https://example.org/grant', current_date + 30, 'published'),
  ('00000000-0000-0000-0000-0000000f6502', 'Fictional draft listing', 'Example Studio', 'casting', 'A fictional draft used only for testing.', 'https://example.org/draft', null, 'draft');
insert into public.resumes (id, user_id, title, template, status) values
  ('00000000-0000-0000-0000-0000000f6511', '00000000-0000-0000-0000-00000000f652', 'Approved', 'signature', 'approved'),
  ('00000000-0000-0000-0000-0000000f6512', '00000000-0000-0000-0000-00000000f652', 'Draft', 'signature', 'draft');

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f651';
\echo 'v65-1) Elite members add companies, topics and people in public roles to My Global Watchlist (expect 1):'
insert into public.intel_watchlist (user_id, objective, subject_kind, subject) values ('00000000-0000-0000-0000-00000000f651', 'New casting announcements', 'company', 'Example Studio');
select count(*) from public.intel_watchlist;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f652';
\echo 'v65-2) Another member never sees someone else''s watchlist (expect 0):'
select count(*) from public.intel_watchlist;
\echo 'v65-3) Executive members see published opportunities only (expect 1):'
select count(*) from public.radar_opportunities;
\echo 'v65-4) Members cannot create Opportunity Radar opportunities (expect error):'
insert into public.radar_opportunities (title, organization, category, summary, official_url, status) values ('Made up', 'Nobody', 'grant', 'Members never add opportunities.', 'https://example.org/x', 'published');
\echo 'v65-5) Members cannot change an opportunity (expect 0 rows changed):'
with u as (update public.radar_opportunities set title = 'Changed' returning 1) select count(*) from u;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f653';
\echo 'v65-6) One Society members do not see Opportunity Radar opportunities (expect 0):'
select count(*) from public.radar_opportunities;
\echo 'v65-7) The Application Center is part of Executive Private and Elite Concierge (expect error):'
insert into public.member_applications (user_id, title) values ('00000000-0000-0000-0000-00000000f653', 'Fictional application');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f652';
\echo 'v65-8) Only an approved résumé can be linked (expect error):'
insert into public.member_applications (user_id, title, resume_id) values ('00000000-0000-0000-0000-00000000f652', 'Fictional board seat', '00000000-0000-0000-0000-0000000f6512');
\echo 'v65-9) An application with an approved résumé, a deadline and a checklist saves and reads back (expect 1|preparing|2):'
insert into public.member_applications (id, user_id, title, kind, deadline, resume_id, opportunity_id, checklist) values
  ('00000000-0000-0000-0000-0000000f6521', '00000000-0000-0000-0000-00000000f652', 'Fictional small business grant', 'grant', current_date + 3,
   '00000000-0000-0000-0000-0000000f6511', '00000000-0000-0000-0000-0000000f6501', '[{"label":"Business plan","done":false},{"label":"Budget","done":true}]');
select count(*), min(status), max(jsonb_array_length(checklist)) from public.member_applications;
\echo 'v65-10) Members save and dismiss Radar items privately (expect 1):'
insert into public.radar_marks (user_id, source, item_id, state) values ('00000000-0000-0000-0000-00000000f652', 'opportunity', '00000000-0000-0000-0000-0000000f6501', 'saved');
select count(*) from public.radar_marks;
\echo 'v65-11) Members cannot set their own reminder record (expect null):'
update public.member_applications set reminded_for = current_date + 3 where id = '00000000-0000-0000-0000-0000000f6521';
select reminded_for from public.member_applications where id = '00000000-0000-0000-0000-0000000f6521';
\echo 'v65-12) Members cannot run the reminder job (expect error):'
select public.application_deadline_tick();
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f651';
\echo 'v65-13) Another member never sees someone else''s applications, history or Radar marks (expect 0|0|0):'
select (select count(*) from public.member_applications), (select count(*) from public.member_application_history), (select count(*) from public.radar_marks);
\echo 'v65-14) And cannot change them (expect 0 rows changed):'
with u as (update public.member_applications set status = 'withdrawn' returning 1) select count(*) from u;
reset role;
reset request.jwt.claim.sub;
\echo 'v65-15) A deadline within seven days creates one Message Center notice, once (expect 1, then 0, then 1):'
select public.application_deadline_tick();
select public.application_deadline_tick();
select count(*) from public.member_notices where kind = 'application_deadline' and ref_id = '00000000-0000-0000-0000-0000000f6521';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f652';
\echo 'v65-16) Status changes are kept as history (expect preparing,submitted and a submitted date):'
update public.member_applications set status = 'submitted' where id = '00000000-0000-0000-0000-0000000f6521';
select string_agg(status, ',' order by id) from public.member_application_history;
select submitted_on is not null from public.member_applications where id = '00000000-0000-0000-0000-0000000f6521';
\echo 'v65-17) History cannot be erased (expect error):'
delete from public.member_application_history;
\echo 'v65-18) The member reads back their own deadline reminder (expect 1):'
select count(*) from public.member_notices where kind = 'application_deadline';
\echo 'v65-19) Members cannot link an unpublished opportunity (expect error):'
insert into public.member_applications (user_id, title, opportunity_id) values ('00000000-0000-0000-0000-00000000f652', 'Fictional draft listing', '00000000-0000-0000-0000-0000000f6502');
\echo 'v65-20) Opportunity Radar preferences save and read back (expect t|{grant}|film):'
insert into public.radar_preferences (user_id, opted_in, categories, keywords) values ('00000000-0000-0000-0000-00000000f652', true, '{grant}', 'film')
  on conflict (user_id) do update set opted_in = excluded.opted_in, categories = excluded.categories, keywords = excluded.keywords;
select opted_in, categories, keywords from public.radar_preferences;
\echo 'v65-21) My Global Watchlist stays part of Elite Concierge (expect error):'
insert into public.intel_watchlist (user_id, objective, subject_kind, subject) values ('00000000-0000-0000-0000-00000000f652', 'Board openings', 'topic', 'Board service');
\echo 'v65-22) A second application with a deadline in two days (expect 1):'
insert into public.member_applications (id, user_id, title, deadline) values ('00000000-0000-0000-0000-0000000f6522', '00000000-0000-0000-0000-00000000f652', 'Fictional speaking engagement', current_date + 2);
select count(*) from public.member_applications where id = '00000000-0000-0000-0000-0000000f6522';
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f651';
\echo 'v65-23) Another member never sees someone else''s reminders or Radar preferences (expect 0|0):'
select (select count(*) from public.member_notices where kind = 'application_deadline'), (select count(*) from public.radar_preferences);
\echo 'v65-24) The watchlist item reads back as saved, then can be removed (expect company|Example Studio, then 0):'
select subject_kind, subject from public.intel_watchlist;
delete from public.intel_watchlist;
select count(*) from public.intel_watchlist;
reset role;
reset request.jwt.claim.sub;
\echo 'v65-25) A changed deadline earns exactly one more reminder (expect 1, 1, 0 and one notice):'
select public.application_deadline_tick();
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f652';
update public.member_applications set deadline = current_date + 5 where id = '00000000-0000-0000-0000-0000000f6522';
reset role;
reset request.jwt.claim.sub;
select public.application_deadline_tick();
select public.application_deadline_tick();
select count(*) from public.member_notices where kind = 'application_deadline' and ref_id = '00000000-0000-0000-0000-0000000f6522';
\echo 'v65-26) The owner, signed in with two-factor, adds and publishes an opportunity (expect 1):'
insert into public.staff_roles (user_id, role) values ('00000000-0000-0000-0000-00000000f653', 'owner');
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000f653","aal":"aal2"}';
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f653';
with i as (insert into public.radar_opportunities (id, title, organization, category, summary, official_url, status) values
  ('00000000-0000-0000-0000-0000000f6503', 'Fictional board seat', 'Example Council', 'board', 'A fictional listing used only for testing.', 'https://example.org/board', 'published') returning 1)
select count(*) from i;
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
delete from public.staff_roles where user_id = '00000000-0000-0000-0000-00000000f653';
delete from public.radar_opportunities where id = '00000000-0000-0000-0000-0000000f6503';
delete from public.member_notices where kind = 'application_deadline';
delete from public.member_applications where user_id in ('00000000-0000-0000-0000-00000000f651', '00000000-0000-0000-0000-00000000f652', '00000000-0000-0000-0000-00000000f653');
delete from public.radar_opportunities where id in ('00000000-0000-0000-0000-0000000f6501', '00000000-0000-0000-0000-0000000f6502');
