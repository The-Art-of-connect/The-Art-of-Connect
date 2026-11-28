-- Membership distinctions (directive 39): entitlement-driven, automatic, privacy-respecting, never self-assigned.
reset role;
reset request.jwt.claim.sub;
insert into public.test_signups (email) values ('v53-viewer@example.com'), ('v53-exec@example.com'), ('v53-elite@example.com'), ('v53-hidden@example.com');
insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000f531', 'v53-viewer@example.com', '{"date_of_birth":"1975-01-01"}'),
  ('00000000-0000-0000-0000-00000000f532', 'v53-exec@example.com', '{"date_of_birth":"1975-01-01"}'),
  ('00000000-0000-0000-0000-00000000f533', 'v53-elite@example.com', '{"date_of_birth":"1975-01-01"}'),
  ('00000000-0000-0000-0000-00000000f534', 'v53-hidden@example.com', '{"date_of_birth":"1975-01-01"}');
insert into public.subscriptions (user_id, status, kind, tier_slug, tier_name, experiences, stripe_subscription_id) values
  ('00000000-0000-0000-0000-00000000f532', 'active', 'member', 'executive-private', 'Executive Private', '{business,relationships}', 'sub_test_v53_exec'),
  ('00000000-0000-0000-0000-00000000f534', 'active', 'member', 'executive-private', 'Executive Private', '{business,relationships}', 'sub_test_v53_hidden');
insert into public.elite_badges (user_id, status) values ('00000000-0000-0000-0000-00000000f533', 'active');
insert into business.profiles (user_id, is_visible) values ('00000000-0000-0000-0000-00000000f532', true), ('00000000-0000-0000-0000-00000000f533', true), ('00000000-0000-0000-0000-00000000f534', false);
update public.profiles set identity_verified_at = now() where id = '00000000-0000-0000-0000-00000000f533';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f531';
\echo 'v53-1) Visible members show their distinction, from their membership (expect executive|f, elite|t):'
select distinction, identity_verified from public.member_marks(array['00000000-0000-0000-0000-00000000f532','00000000-0000-0000-0000-00000000f533']::uuid[]) order by distinction desc;
\echo 'v53-2) A member who is not visible to the viewer returns nothing (expect 0):'
select count(*) from public.member_marks(array['00000000-0000-0000-0000-00000000f534']::uuid[]);
\echo 'v53-3) Members cannot give themselves an Elite badge (expect error):'
insert into public.elite_badges (user_id, status) values (auth.uid(), 'active');
\echo 'v53-4) Members cannot give themselves Executive Private (expect error):'
insert into public.subscriptions (user_id, status, kind, tier_slug, experiences) values (auth.uid(), 'active', 'member', 'executive-private', '{business}');
\echo 'v53-5) Members cannot call the internal distinction check directly (expect error):'
select public.membership_distinction('00000000-0000-0000-0000-00000000f532');
\echo 'v53-6) Members can read their own marks (expect 1 row, no distinction):'
select count(*), max(distinction) from public.member_marks(array[auth.uid()]);
reset role;
reset request.jwt.claim.sub;
update public.subscriptions set status = 'canceled' where stripe_subscription_id = 'sub_test_v53_exec';
update public.elite_badges set expires_at = now() - interval '1 minute' where user_id = '00000000-0000-0000-0000-00000000f533';
insert into public.blocks (blocker_id, blocked_id) values ('00000000-0000-0000-0000-00000000f531', '00000000-0000-0000-0000-00000000f533');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f531';
\echo 'v53-7) Distinctions update automatically when membership ends (expect one row, empty distinction):'
select count(*), max(distinction) from public.member_marks(array['00000000-0000-0000-0000-00000000f532']::uuid[]);
\echo 'v53-8) A blocked member is never shown (expect 0):'
select count(*) from public.member_marks(array['00000000-0000-0000-0000-00000000f533']::uuid[]);
reset role;
reset request.jwt.claim.sub;
\echo 'v53-9) An expired Elite badge no longer counts (expect f):'
select public.social_is_elite('00000000-0000-0000-0000-00000000f533');
delete from public.blocks where blocker_id = '00000000-0000-0000-0000-00000000f531';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f531';
\echo 'v53-10) Elite expired: the crown is removed, identity verification stays (expect <none>|t):'
select coalesce(distinction, '<none>'), identity_verified from public.member_marks(array['00000000-0000-0000-0000-00000000f533']::uuid[]);
reset role;
reset request.jwt.claim.sub;
insert into public.subscriptions (user_id, status, kind, tier_slug, tier_name, experiences, stripe_subscription_id) values
  ('00000000-0000-0000-0000-00000000f533', 'active', 'member', 'executive-private', 'Executive Private', '{business,relationships}', 'sub_test_v53_downgrade');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f531';
\echo 'v53-11) Elite downgraded to Executive Private: Executive Member, identity unchanged (expect executive|t):'
select distinction, identity_verified from public.member_marks(array['00000000-0000-0000-0000-00000000f533']::uuid[]);
reset role;
reset request.jwt.claim.sub;
update public.subscriptions set status = 'past_due' where stripe_subscription_id = 'sub_test_v53_downgrade';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f531';
\echo 'v53-12) A paused (past due) membership shows no emblem, identity unchanged (expect <none>|t):'
select coalesce(distinction, '<none>'), identity_verified from public.member_marks(array['00000000-0000-0000-0000-00000000f533']::uuid[]);
reset role;
reset request.jwt.claim.sub;
update public.elite_badges set status = 'revoked', expires_at = null where user_id = '00000000-0000-0000-0000-00000000f533';
update public.subscriptions set status = 'active' where stripe_subscription_id = 'sub_test_v53_downgrade';
\echo 'v53-13) A revoked Elite badge never shows the crown (expect f):'
select public.social_is_elite('00000000-0000-0000-0000-00000000f533');
\echo 'v53-14) An Executive Member who never verified identity shows no orange check (expect executive|f):'
update public.subscriptions set status = 'active' where stripe_subscription_id = 'sub_test_v53_exec';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f531';
select distinction, identity_verified from public.member_marks(array['00000000-0000-0000-0000-00000000f532']::uuid[]);
reset role;
reset request.jwt.claim.sub;
