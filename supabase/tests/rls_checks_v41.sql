-- Membership access v2: only The Art of Becoming is free; interactive experiences need a paid membership or trial.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
insert into public.test_signups (email) values ('free-f@example.com'), ('paid-p@example.com');
insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000f001', 'free-f@example.com', '{"date_of_birth":"1980-01-01"}'),
  ('00000000-0000-0000-0000-00000000f002', 'paid-p@example.com', '{"date_of_birth":"1980-01-01"}');
insert into public.experience_access (user_id, experience, status, source) values ('00000000-0000-0000-0000-00000000f002', 'relationships', 'active', 'subscription');
\echo 'v41-1) Free accounts have The Art of Becoming but no paid membership; a subscriber has both (expect f|t):'
select public.has_paid_membership('00000000-0000-0000-0000-00000000f001') || '|' || public.has_paid_membership('00000000-0000-0000-0000-00000000f002');
\echo 'v41-2) A retired free-tier grant never opens a society (expect f):'
insert into public.experience_access (user_id, experience, status, source) values ('00000000-0000-0000-0000-00000000f001', 'business', 'active', 'free_tier');
select public.has_paid_membership('00000000-0000-0000-0000-00000000f001');
delete from public.experience_access where user_id = '00000000-0000-0000-0000-00000000f001';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f001';
\echo 'v41-3) A free account cannot create a social profile (expect error):'
insert into public.social_profiles (user_id, headline) values ('00000000-0000-0000-0000-00000000f001', 'Free');
\echo 'v41-4) A free account cannot post (expect error):'
insert into public.social_posts (author_id, body, audience) values ('00000000-0000-0000-0000-00000000f001', 'Hi', 'members');
\echo 'v41-5) A free account sees no posts, members or messages (expect 0|0|0):'
select (select count(*) from public.social_posts) || '|' || (select count(*) from public.social_profiles) || '|' || (select count(*) from public.social_messages);
\echo 'v41-6) Circle descriptions stay readable to free accounts (expect t):'
select count(*) > 0 from public.social_circles;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f002';
\echo 'v41-7) A paying member can take part (expect 1):'
insert into public.social_posts (author_id, body, audience) values ('00000000-0000-0000-0000-00000000f002', 'Hello members', 'members');
select count(*) from public.social_posts where author_id = '00000000-0000-0000-0000-00000000f002';
\echo 'v41-8) A member cannot reserve a trial directly (expect error):'
select public.trial_reserve('00000000-0000-0000-0000-00000000f002', 'personal-society', 'cs_x');
reset role;
reset request.jwt.claim.sub;
\echo 'v41-9) One trial per member; Elite is never a trial (expect true|true|true: a pending reservation may be replaced):'
select (public.trial_reserve('00000000-0000-0000-0000-00000000f001', 'elite-concierge', 'cs_e') is false)::text
  || '|' || public.trial_reserve('00000000-0000-0000-0000-00000000f001', 'personal-society', 'cs_1')::text
  || '|' || public.trial_reserve('00000000-0000-0000-0000-00000000f001', 'professional-society', 'cs_2')::text;
update public.membership_trials set status = 'active' where user_id = '00000000-0000-0000-0000-00000000f001';
\echo 'v41-10) After a trial starts, another cannot be reserved (expect false|professional-society):'
select public.trial_reserve('00000000-0000-0000-0000-00000000f001', 'personal-society', 'cs_3')::text || '|' || package_slug from public.membership_trials where user_id = '00000000-0000-0000-0000-00000000f001';
\echo 'v41-11) Bundles that included Becoming are retired (expect 0):'
select count(*) from public.membership_packages where is_active and slug in ('art-of-becoming', 'business-life', 'life-love', 'complete-society');
\echo 'v41-12) Journey allows members on an active trial (expect t):'
select 'trialing' = any(entitled_statuses) from public.journey_settings;
