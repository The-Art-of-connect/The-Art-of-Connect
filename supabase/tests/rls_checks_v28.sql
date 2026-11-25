-- Journey Private Session billing: fee + included messages/credits, summary reserve, pause instead of overdraw, resume with credits.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
update public.journey_settings set enabled = true, paid_usage_authorized = true, company_monthly_limit_cents = 100000;
insert into public.journey_sessions (id, user_id, product_slug, status) values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000081', 'clarity-15', 'purchased');
\echo 'v28-1) First message uses an included message (expect t|0):'
select public.journey_reserve_session('00000000-0000-0000-0000-000000000081','00000000-0000-0000-0000-0000000000a1','session-key-1','gpt-test',0.1,'00000000-0000-0000-0000-000000000081',2,now() - interval '1 day',false) ~ '^[0-9]+$';
select credits_used from public.journey_sessions where id = '00000000-0000-0000-0000-0000000000a1';
\echo 'v28-2) The last remaining message is kept for the closing summary (expect refused:keep_for_summary):'
select public.journey_reserve_session('00000000-0000-0000-0000-000000000081','00000000-0000-0000-0000-0000000000a1','session-key-2','gpt-test',0.1,'00000000-0000-0000-0000-000000000081',2,now() - interval '1 day',false);
\echo 'v28-3) The summary may use it (expect t):'
select public.journey_reserve_session('00000000-0000-0000-0000-000000000081','00000000-0000-0000-0000-0000000000a1','session-key-3','gpt-test',0.1,'00000000-0000-0000-0000-000000000081',2,now() - interval '1 day',true) ~ '^[0-9]+$';
\echo 'v28-4) With nothing left the session pauses; no overdraw (expect refused:paused|t):'
select public.journey_reserve_session('00000000-0000-0000-0000-000000000081','00000000-0000-0000-0000-0000000000a1','session-key-4','gpt-test',0.1,'00000000-0000-0000-0000-000000000081',2,now() - interval '1 day',false);
select (paused_at is not null)::text from public.journey_sessions where id = '00000000-0000-0000-0000-0000000000a1';
\echo 'v28-5) After the member buys credits, the session resumes and uses a purchased credit (expect t|1|f):'
insert into public.journey_message_credits (holder_id, source, messages) values ('00000000-0000-0000-0000-000000000081', 'owner_grant', 5);
select public.journey_reserve_session('00000000-0000-0000-0000-000000000081','00000000-0000-0000-0000-0000000000a1','session-key-5','gpt-test',0.1,'00000000-0000-0000-0000-000000000081',2,now() - interval '1 day',false) ~ '^[0-9]+$';
select credits_used || '|' || (paused_at is not null)::text from public.journey_sessions where id = '00000000-0000-0000-0000-0000000000a1';
\echo 'v28-6) Members cannot call the billing function (expect error):'
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000081';
select public.journey_reserve_session('00000000-0000-0000-0000-000000000081','00000000-0000-0000-0000-0000000000a1','session-key-6','gpt-test',0.1,'00000000-0000-0000-0000-000000000081',999,now(),false);
reset role;
