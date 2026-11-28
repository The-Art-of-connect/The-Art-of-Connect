-- Directive 51 §4 and §7: couples' Private Reflections and the Couples Connection Community (directive 08).
reset role;
reset request.jwt.claim.sub;
insert into public.test_signups (email) values ('v63-a@example.com'), ('v63-b@example.com'), ('v63-c@example.com');
insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000f631', 'v63-a@example.com', '{"date_of_birth":"1975-01-01","display_name":"Ada Test"}'),
  ('00000000-0000-0000-0000-00000000f632', 'v63-b@example.com', '{"date_of_birth":"1976-01-01","display_name":"Ben Test"}'),
  ('00000000-0000-0000-0000-00000000f633', 'v63-c@example.com', '{"date_of_birth":"1977-01-01","display_name":"Cal Test"}');
insert into public.experience_access (user_id, experience, status, source)
  select id, 'relationships', 'active', 'subscription' from public.profiles where id::text like '00000000-0000-0000-0000-00000000f63%'
  on conflict (user_id, experience) do update set status = 'active', source = 'subscription';
-- Cal chose the couples society but has no partner in a shared space: not an active couple.
update public.profiles set primary_society = 'couples' where id = '00000000-0000-0000-0000-00000000f633';
insert into relationships.couples (id, created_by) values ('00000000-0000-0000-0000-0000000c0630', '00000000-0000-0000-0000-00000000f631');
insert into relationships.couple_members (couple_id, user_id) values ('00000000-0000-0000-0000-0000000c0630', '00000000-0000-0000-0000-00000000f631'), ('00000000-0000-0000-0000-0000000c0630', '00000000-0000-0000-0000-00000000f632');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f631';
\echo 'v63-1) A member saves reflections and reads them back, then edits one and reads the change back (expect 2|f, then Ada private thought, revised):'
insert into relationships.private_reflections (user_id, prompt, body) values (auth.uid(), 'v63', 'Ada private thought');
insert into relationships.private_reflections (user_id, prompt, body) values (auth.uid(), 'v63', 'Ada shared thought');
select count(*), bool_or(shared_at is not null) from relationships.private_reflections where user_id = auth.uid();
update relationships.private_reflections set body = 'Ada private thought, revised', updated_at = now() where user_id = auth.uid() and body = 'Ada private thought';
select body from relationships.private_reflections where user_id = auth.uid() and updated_at is not null;
\echo 'v63-2) A partner cannot read the other''s unshared reflection (expect 0):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f632';
select count(*) from relationships.private_reflections where user_id = '00000000-0000-0000-0000-00000000f631';
\echo 'v63-3) A partner cannot share, edit or delete the other''s reflection (expect 0, 0):'
with u as (update relationships.private_reflections set shared_at = now(), shared_couple_id = '00000000-0000-0000-0000-0000000c0630' where user_id = '00000000-0000-0000-0000-00000000f631' returning 1) select count(*) from u;
with d as (delete from relationships.private_reflections where user_id = '00000000-0000-0000-0000-00000000f631' returning 1) select count(*) from d;
\echo 'v63-4) A member cannot share into a couple they are not in (expect error):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f633';
insert into relationships.private_reflections (user_id, body, shared_at, shared_couple_id) values (auth.uid(), 'Intrusion', now(), '00000000-0000-0000-0000-0000000c0630');
\echo 'v63-5) Nobody can ask whether another member is in a couple (expect f):'
select relationships.in_active_couple('00000000-0000-0000-0000-00000000f631');
\echo 'v63-6) The author shares one reflection; the partner reads only that one and is told without its content (expect 1|Ada shared thought, then 1|f):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f631';
update relationships.private_reflections set shared_at = now(), shared_couple_id = '00000000-0000-0000-0000-0000000c0630' where user_id = auth.uid() and body = 'Ada shared thought';
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f632';
select count(*), max(body) from relationships.private_reflections where user_id = '00000000-0000-0000-0000-00000000f631';
select count(*), bool_or(coalesce(body, '') || title like '%Ada shared thought%') from public.member_notices where user_id = auth.uid() and href = '/app/relationships/reflections';
\echo 'v63-7) Someone outside the couple never sees it (expect 0):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f633';
select count(*) from relationships.private_reflections where user_id = '00000000-0000-0000-0000-00000000f631';
\echo 'v63-8) A member who is not in an active couple cannot join a couples-only circle (expect error):'
insert into public.social_circle_members (circle_id, user_id) select id, auth.uid() from public.social_circles where slug = 'date-nights';
\echo 'v63-9) ...nor propose a Couples Connection Circle (expect error):'
insert into public.social_circles (slug, name, category, eligibility, status, created_by) values ('v63-couples-proposal', 'Weekend Couples', 'couples', 'couples', 'proposed', auth.uid());
\echo 'v63-10) A member of an active couple may join and propose one for approval, and their partner may join (expect 1, then 2):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f631';
insert into public.social_circle_members (circle_id, user_id) select id, auth.uid() from public.social_circles where slug = 'date-nights';
insert into public.social_circles (slug, name, category, kind, eligibility, status, created_by) values ('v63-couples-proposal', 'Weekend Couples', 'couples', 'specialized', 'couples', 'proposed', auth.uid());
select count(*) from public.social_circles where slug = 'v63-couples-proposal' and status = 'proposed';
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f632';
insert into public.social_circle_members (circle_id, user_id) select id, auth.uid() from public.social_circles where slug = 'date-nights';
select count(*) from public.social_circle_members m join public.social_circles c on c.id = m.circle_id where c.slug = 'date-nights' and m.user_id::text like '00000000-0000-0000-0000-00000000f63%';
\echo 'v63-11) A couple member posts in the circle and reads it back; the other couple member reads it too (expect 1, then 1):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f631';
insert into public.social_posts (author_id, body, audience, circle_id) select auth.uid(), 'v63 double date on Friday?', 'circle', id from public.social_circles where slug = 'date-nights';
select count(*) from public.social_posts where author_id = auth.uid() and body = 'v63 double date on Friday?';
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f632';
select count(*) from public.social_posts where body = 'v63 double date on Friday?';
\echo 'v63-12) After Ada leaves the couple, the shared reflection is no longer readable by Ben and his notice is withdrawn (expect left, then 0|0):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f631';
select relationships.leave_couple(true);
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f632';
select (select count(*) from relationships.private_reflections where user_id = '00000000-0000-0000-0000-00000000f631'),
       (select count(*) from public.member_notices where user_id = auth.uid() and href = '/app/relationships/reflections');
\echo 'v63-13) Ada keeps every reflection, sharing ended rather than carrying over, and she can still delete her own (expect 2|0, then 1):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f631';
select count(*), count(shared_at) from relationships.private_reflections where user_id = auth.uid();
with d as (delete from relationships.private_reflections where user_id = auth.uid() and body = 'Ada shared thought' returning 1) select count(*) from d;
\echo 'v63-14) Neither former partner remains in couples-only circles, and a single member cannot rejoin (expect 0, then error):'
reset role;
reset request.jwt.claim.sub;
select count(*) from public.social_circle_members m join public.social_circles c on c.id = m.circle_id where c.category = 'couples' and m.user_id::text like '00000000-0000-0000-0000-00000000f63%';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f632';
insert into public.social_circle_members (circle_id, user_id) select id, auth.uid() from public.social_circles where slug = 'date-nights';
reset role;
reset request.jwt.claim.sub;
delete from public.social_posts where body = 'v63 double date on Friday?';
delete from public.social_circles where slug = 'v63-couples-proposal';
