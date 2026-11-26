-- My Daily Sanctuary and Discover What's Possible: privacy, approval and limits.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
insert into public.test_signups (email) values ('sanct-a@example.com'), ('sanct-b@example.com');
insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000c501', 'sanct-a@example.com', '{"date_of_birth":"1980-01-01"}'),
  ('00000000-0000-0000-0000-00000000c502', 'sanct-b@example.com', '{"date_of_birth":"1981-01-01"}');
\echo 'v42-1) The starter library is prepared as drafts awaiting founder approval (expect t|0):'
select (select count(*) > 50 from public.sanctuary_content where prepared_by = 'peace' and status = 'draft') || '|' || (select count(*) from public.sanctuary_content where status = 'published');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000c501';
\echo 'v42-2) A free member sees no unpublished content (expect 0):'
select count(*) from public.sanctuary_content;
\echo 'v42-3) A member cannot publish content (expect 0 rows changed):'
with u as (update public.sanctuary_content set status = 'published' returning 1) select count(*) from u;
\echo 'v42-4) A member keeps private entries (expect 1):'
insert into public.sanctuary_entries (user_id, kind, mood, response) values ('00000000-0000-0000-0000-00000000c501', 'checkin', 'calm', 'A good morning');
select count(*) from public.sanctuary_entries;
\echo 'v42-5) One check-in per day; gratitude may be recorded several times (expect error, then 2):'
insert into public.sanctuary_entries (user_id, kind, mood) values ('00000000-0000-0000-0000-00000000c501', 'checkin', 'tired');
insert into public.sanctuary_entries (user_id, kind, response) values ('00000000-0000-0000-0000-00000000c501', 'gratitude', 'My sister'), ('00000000-0000-0000-0000-00000000c501', 'gratitude', 'Sunshine');
select count(*) from public.sanctuary_entries where kind = 'gratitude';
\echo 'v42-6) A letter''s delivery date cannot be changed (expect permission error):'
insert into public.future_letters (user_id, body, deliver_on) values ('00000000-0000-0000-0000-00000000c501', 'Dear me', current_date + 365);
with u as (update public.future_letters set deliver_on = current_date + 1 returning 1) select count(*) from u;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000c502';
\echo 'v42-7) Another member sees none of it (expect 0|0|0):'
select (select count(*) from public.sanctuary_entries) || '|' || (select count(*) from public.future_letters) || '|' || (select count(*) from public.vision_items);
\echo 'v42-8) A member cannot write into someone else''s board (expect error):'
insert into public.vision_items (user_id, category, kind, title) values ('00000000-0000-0000-0000-00000000c501', 'travel', 'goal', 'Paris');
\echo 'v42-9) Photographs must live in the member''s own folder (expect error):'
insert into public.vision_items (user_id, category, kind, title, photo_path) values ('00000000-0000-0000-0000-00000000c502', 'travel', 'photo', 'Beach', 'u/00000000-0000-0000-0000-00000000c501/00000000-0000-0000-0000-000000000001.jpg');
\echo 'v42-10) Members see only approved Connect previews and cannot add their own (expect 0, then error):'
select count(*) from public.connect_previews;
insert into public.connect_previews (kind, title, summary, source_type, status) values ('event', 'Fake event', 'Not real', 'official', 'approved');
\echo 'v42-11) Conversion analytics are for the owner only (expect 0):'
select count(*) from public.membership_conversions(6);
reset role;
reset request.jwt.claim.sub;
\echo 'v42-12) Circle sizes are shown only from 10 members up (expect t):'
select bool_and(members_band is null) from public.connect_preview_stats();
