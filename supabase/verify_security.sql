-- Read-only security verification for the live database. Prints PASS/FAIL lines.
\pset tuples_only on
\pset format unaligned
with app_tables as (
  select n.nspname as schema, c.relname as name, c.relrowsecurity as rls
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where c.relkind = 'r' and n.nspname in ('public', 'relationships', 'business', 'counseling')
    and c.relname <> 'applied_migrations'
)
select case when count(*) filter (where not rls) = 0 then 'PASS  Row-level security is on for all ' || count(*) || ' app tables'
            else 'FAIL  Row-level security is OFF for: ' || string_agg(schema || '.' || name, ', ') filter (where not rls) end
from app_tables;

-- Visitors may only submit the two public forms (notify-me list and professional interest), by design.
select case when count(*) = 0 then 'PASS  Visitors can only submit the public notify-me and professional-interest forms'
            else 'FAIL  Visitors can write to: ' || string_agg(table_schema || '.' || table_name || ' (' || privilege_type || ')', ', ') end
from information_schema.role_table_grants
where grantee = 'anon' and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
  and table_schema in ('public', 'relationships', 'business', 'counseling')
  and not (privilege_type = 'INSERT' and table_schema = 'public' and table_name in ('waitlist', 'professional_interest'));

select case when count(*) = 0 then 'PASS  No app table can be truncated through the API'
            else 'FAIL  TRUNCATE granted on: ' || string_agg(table_schema || '.' || table_name, ', ') end
from information_schema.role_table_grants
where grantee in ('anon', 'authenticated') and privilege_type = 'TRUNCATE'
  and table_schema in ('public', 'relationships', 'business', 'counseling');

select to_regclass('public.journey_settings') is not null as has_journey \gset
\if :has_journey
select case when not has_function_privilege('authenticated', 'public.journey_reserve(uuid, uuid, text, text, text, text, numeric, timestamptz, boolean)', 'EXECUTE')
            then 'PASS  Only the server can reserve Journey spending' else 'FAIL  Members can call journey_reserve' end;
select case when not (enabled and paid_usage_authorized) then 'PASS  Billable Journey AI is not authorized (as intended until the owner approves)'
            else 'NOTE  Billable Journey AI is authorized by the owner' end
from public.journey_settings;
\else
select 'INFO  Journey tables are not installed yet';
\endif

select case when coalesce((select value from public.platform_settings where key = 'payments_live')::text, 'false') <> 'true'
            then 'PASS  Live payments switch is off' else 'NOTE  Live payments switch is on' end;
select case when coalesce((select value from public.platform_settings where key = 'registrations_open')::text, 'false') <> 'true'
            then 'PASS  Public registration switch is off' else 'NOTE  Public registration switch is on' end;
select 'INFO  Minimum ages — members ' || coalesce((select value::text from public.platform_settings where key = 'minimum_member_age'), '?')
    || ', singles ' || coalesce((select value::text from public.platform_settings where key = 'minimum_singles_age'), '?')
    || ', professionals ' || coalesce((select value::text from public.platform_settings where key = 'minimum_professional_age'), '?');
