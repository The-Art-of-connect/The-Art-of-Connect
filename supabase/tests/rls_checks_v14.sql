-- Journey Plus, Auto-Reload, memory, goals, library, sessions, voice, Exclusive Connection, appeals, tracker.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
insert into public.signup_allowlist(email) values ('ex-a@example.com'), ('ex-b@example.com'), ('ex-c@example.com');
insert into auth.users(id,email) values ('00000000-0000-0000-0000-000000000061','ex-a@example.com'), ('00000000-0000-0000-0000-000000000062','ex-b@example.com'), ('00000000-0000-0000-0000-000000000063','ex-c@example.com');
insert into public.member_private(user_id, date_of_birth) values ('00000000-0000-0000-0000-000000000061','1980-01-01'), ('00000000-0000-0000-0000-000000000062','1982-01-01'), ('00000000-0000-0000-0000-000000000063','1979-01-01');
insert into public.experience_access (user_id, experience, status, source) values
  ('00000000-0000-0000-0000-000000000061','relationships','active','owner_grant'), ('00000000-0000-0000-0000-000000000062','relationships','active','owner_grant'), ('00000000-0000-0000-0000-000000000063','relationships','active','owner_grant');
insert into relationships.profiles(user_id, headline, is_visible) values ('00000000-0000-0000-0000-000000000061','A',true), ('00000000-0000-0000-0000-000000000062','B',true), ('00000000-0000-0000-0000-000000000063','C',true);
insert into relationships.connections(requester_id, recipient_id, status) values
  ('00000000-0000-0000-0000-000000000061','00000000-0000-0000-0000-000000000062','accepted'),
  ('00000000-0000-0000-0000-000000000063','00000000-0000-0000-0000-000000000061','accepted');

\echo 'v14-1) A 25-year-old cannot be shown in singles matchmaking (expect error):'
insert into public.signup_allowlist(email) values ('young-single@example.com');
insert into auth.users(id,email) values ('00000000-0000-0000-0000-000000000064','young-single@example.com');
insert into public.member_private(user_id, date_of_birth) values ('00000000-0000-0000-0000-000000000064', current_date - interval '25 years');
insert into relationships.profiles(user_id, headline, is_visible) values ('00000000-0000-0000-0000-000000000064','too young',true);

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000061';
\echo 'v14-2) Auto-Reload: a member cannot switch it on themselves (expect error then 0):'
insert into public.journey_auto_reload (user_id, enabled) values (auth.uid(), true);
select count(*) from public.journey_auto_reload where enabled;
\echo 'v14-3) A member cannot grant themselves purchased access or mark a purchase paid (expect error, error):'
select public.journey_grant_purchase(gen_random_uuid(), 'pi_fake');
insert into public.journey_purchases (user_id, holder_id, kind, package_slug, quantity, amount_cents, status) values (auth.uid(), auth.uid(), 'messages', 'messages-25', 25, 0, 'succeeded');
\echo 'v14-4) Memory is private: A saves two memories and a goal (expect 2|1):'
insert into public.journey_memory_settings (user_id, enabled) values (auth.uid(), true);
insert into public.journey_memories (user_id, kind, content) values (auth.uid(), 'goal', 'Speak up kindly at work'), (auth.uid(), 'preference', 'Prefers a practical approach');
insert into public.journey_goals (user_id, title) values (auth.uid(), 'Run a 5K by spring');
select (select count(*) from public.journey_memories), (select count(*) from public.journey_goals);

\echo 'v14-5) A invites B, a mutually accepted connection, to an Exclusive Connection (expect t):'
select relationships.request_exclusive('00000000-0000-0000-0000-000000000062') is not null;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000062';
\echo 'v14-6) B sees no memories of A; B accepts; both profiles paused; A''s other connection closed; C notified without names (expect 0|accepted):'
select (select count(*) from public.journey_memories), relationships.respond_exclusive((select id from relationships.exclusive_requests limit 1), true);
reset role;
select string_agg(user_id::text || '=' || is_visible, ',' order by user_id) from relationships.profiles where user_id in ('00000000-0000-0000-0000-000000000061','00000000-0000-0000-0000-000000000062');
select status from relationships.connections where requester_id = '00000000-0000-0000-0000-000000000063';
select count(*), bool_and(message not like '%ex-b%' and message not like '%00000000%') from relationships.availability_notices where recipient_id = '00000000-0000-0000-0000-000000000063';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000061';
\echo 'v14-7) Either partner can end it alone; profiles stay paused until reactivated (expect ended|f):'
select relationships.end_exclusive((select id from relationships.exclusive_requests where status = 'accepted' limit 1));
reset role;
select bool_or(is_visible) from relationships.profiles where user_id in ('00000000-0000-0000-0000-000000000061','00000000-0000-0000-0000-000000000062');

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000063';
\echo 'v14-8) C files an appeal and sees only their own (expect 1):'
insert into public.account_appeals (user_id, regarding, explanation) values (auth.uid(), 'Restriction', 'I believe this was a mistake.');
select count(*) from public.account_appeals;
\echo 'v14-9) C cannot mark their own appeal reversed (expect 0 updated):'
update public.account_appeals set status = 'reversed' where user_id = auth.uid();
reset role;
select count(*) from public.account_appeals where status = 'reversed';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000063';
\echo 'v14-10) Members cannot see the development tracker, session prices before publishing, or evaluation scenarios (expect 0|0|0):'
select (select count(*) from public.dev_tracker), (select count(*) from public.journey_session_products), (select count(*) from public.journey_eval_scenarios);

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
\echo 'v14-11) The owner sees the tracker, sessions and 13 scenarios, but no member memories, goals or voice transcripts (expect t|4|13|0|0|0):'
select (select count(*) > 20 from public.dev_tracker), (select count(*) from public.journey_session_products), (select count(*) from public.journey_eval_scenarios),
       (select count(*) from public.journey_memories), (select count(*) from public.journey_goals), (select count(*) from public.journey_voice_sessions);
\echo 'v14-12) Draft library content stays hidden from members; approved content appears (expect 0 then 1):'
insert into public.journey_knowledge (mode, title, body, status, kind, art) values ('all', 'Draft boundaries module', 'draft', 'draft', 'module', 'boundaries');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000063';
select count(*) from public.journey_library where title = 'Draft boundaries module';
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
update public.journey_knowledge set status = 'approved' where title = 'Draft boundaries module';
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000063';
select count(*) from public.journey_library where title = 'Draft boundaries module';

reset role;
reset request.jwt.claim.sub;
\echo 'v14-13) The server grants purchased messages only once, after payment (expect t, f, then 25):'
insert into public.journey_purchases (id, user_id, holder_id, kind, package_slug, quantity, amount_cents) values
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000063', '00000000-0000-0000-0000-000000000063', 'messages', 'messages-25', 25, 499);
select public.journey_grant_purchase('40000000-0000-0000-0000-000000000001', 'pi_test_1');
select public.journey_grant_purchase('40000000-0000-0000-0000-000000000001', 'pi_test_1');
select sum(messages) from public.journey_message_credits where holder_id = '00000000-0000-0000-0000-000000000063';
\echo 'v14-14) Auto-Reload is refused while live payments are off, whatever the member chose (expect payments_off):'
insert into public.journey_auto_reload (user_id, enabled, package_slug, monthly_cap_cents, authorized_at, stripe_payment_method_id)
  values ('00000000-0000-0000-0000-000000000063', true, 'messages-25', null, now(), 'pm_test');
update public.journey_settings set enabled = true, paid_usage_authorized = true;
select public.journey_auto_reload_allowed('00000000-0000-0000-0000-000000000063', 499);
update public.journey_settings set enabled = false, paid_usage_authorized = false;
