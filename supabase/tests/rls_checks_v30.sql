-- Voice owner tests respect the owner's private testing budget.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
update public.journey_settings set enabled = true, paid_usage_authorized = true, voice_enabled = true,
  company_monthly_limit_cents = 100000, owner_test_monthly_limit_cents = 50;
\echo 'v30-1) An owner voice test larger than the testing budget is refused (expect refused:test_budget):'
select public.journey_voice_start((select id from public.profiles limit 1), (select id from public.profiles limit 1), null, 600, true, 60);
\echo 'v30-2) A member voice session is not limited by the owner testing budget (expect a session id, not refused):'
select left(public.journey_voice_start((select id from public.profiles limit 1), (select id from public.profiles limit 1), null, 600, false, 60), 8) <> 'refused:';
delete from public.journey_voice_sessions;
update public.journey_settings set enabled = false, paid_usage_authorized = false, voice_enabled = false, owner_test_monthly_limit_cents = null;
