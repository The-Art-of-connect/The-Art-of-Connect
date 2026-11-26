-- Elite Concierge: invitation only, private evidence, badge controlled by the system and owner.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
insert into public.test_signups (email) values ('elite-a@example.com'), ('elite-b@example.com');
insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'elite-a@example.com', '{"date_of_birth":"1975-01-01"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'elite-b@example.com', '{"date_of_birth":"1980-01-01"}');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
\echo 'v33-1) A member screens privately for the expedited pathway (expect preliminary):'
select public.elite_screen('personal_income', true, 'expedited');
\echo 'v33-2) No amounts are stored, only the pathway and self-reported yes (expect personal_income|t):'
select qualification, screening_meets from public.elite_candidates where user_id = '00000000-0000-0000-0000-0000000000e1';
\echo 'v33-3) A member cannot approve themselves (expect 0 rows changed):'
with u as (update public.elite_candidates set status = 'qualification_approved' where user_id = '00000000-0000-0000-0000-0000000000e1' returning 1) select count(*) from u;
\echo 'v33-4) A member cannot give themselves a badge (expect error):'
insert into public.elite_badges (user_id) values ('00000000-0000-0000-0000-0000000000e1');
\echo 'v33-5) Without verification, no invitation is issued (expect f|f|preliminary):'
select (r->>'identity')::boolean, (r->>'qualification')::boolean, r->>'status' from (select public.elite_evaluate() r) x;
\echo 'v33-6) Another member cannot see this candidacy (expect 0):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e2';
select count(*) from public.elite_candidates;
\echo 'v33-7) Elite checkout is refused without an accepted invitation (expect f):'
reset role;
reset request.jwt.claim.sub;
select public.elite_checkout_allowed('00000000-0000-0000-0000-0000000000e1');
\echo 'v33-8) Owner verifies identity and qualification and waives the fee: the invitation issues automatically (expect invitation_issued):'
insert into public.elite_evidence (candidate_id, kind, status) select id, 'identity', 'owner_verified' from public.elite_candidates where user_id = '00000000-0000-0000-0000-0000000000e1';
insert into public.elite_evidence (candidate_id, kind, status) select id, 'financial_verification', 'owner_verified' from public.elite_candidates where user_id = '00000000-0000-0000-0000-0000000000e1';
update public.elite_candidates set fee_waived = true where user_id = '00000000-0000-0000-0000-0000000000e1';
select public.elite_evaluate('00000000-0000-0000-0000-0000000000e1')->>'status';
\echo 'v33-9) The member accepts, and only then may check out (expect accepted|t):'
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select public.elite_accept_invitation();
reset role;
reset request.jwt.claim.sub;
select public.elite_checkout_allowed('00000000-0000-0000-0000-0000000000e1');
\echo 'v33-10) A paid Elite subscription activates the badge (expect active|membership_activated):'
insert into public.subscriptions (user_id, status, tier_slug, billing_interval, kind) values ('00000000-0000-0000-0000-0000000000e1', 'active', 'elite-concierge', 'month', 'member');
select b.status, c.status from public.elite_badges b join public.elite_candidates c on c.user_id = b.user_id where b.user_id = '00000000-0000-0000-0000-0000000000e1';
\echo 'v33-11) Other members can learn only that a badge is active (expect 1):'
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e2';
select count(*) from public.elite_badge_holders(array['00000000-0000-0000-0000-0000000000e1'::uuid, '00000000-0000-0000-0000-0000000000e2'::uuid]);
\echo 'v33-12) ...and cannot read the evidence (expect 0):'
select count(*) from public.elite_evidence;
reset role;
reset request.jwt.claim.sub;
\echo 'v33-13) A founder invitation to a non-member attaches when they join with that email (expect founder|qualification_approved):'
insert into public.elite_candidates (invitee_email, pathway, qualification, status) values ('elite-new@example.com', 'founder', 'founder_selected', 'qualification_approved');
insert into public.test_signups (email) values ('elite-new@example.com');
insert into auth.users(id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000e3', 'elite-new@example.com', '{"date_of_birth":"1970-05-05"}');
select pathway, status from public.elite_candidates where user_id = '00000000-0000-0000-0000-0000000000e3';
