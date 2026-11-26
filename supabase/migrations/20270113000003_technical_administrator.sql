-- Peace as Technical Administrator (founder approval, November 26, 2026):
--   • $50 monthly AI budget as a HARD limit (assist_claim refuses beyond it), alerts at 75% and 90%.
--   • Proactive monitoring: health checks and automatic error capture create reports without a member.
--   • Monthly technical operations report.
update public.assist_settings set monthly_budget_cents = 5000;
alter table public.assist_settings
  add column alert_75_sent_for date,
  add column alert_90_sent_for date,
  add column last_report_month date,
  add column last_health_at timestamptz,
  add column last_health_ok boolean;

alter table public.site_issues
  add column source text not null default 'member' check (source in ('member', 'monitor', 'owner')),
  add column fingerprint text check (char_length(fingerprint) <= 80),
  add column occurrences integer not null default 1;
create unique index site_issues_open_fingerprint on public.site_issues (fingerprint)
  where fingerprint is not null and status not in ('fixed', 'built', 'closed', 'declined', 'duplicate', 'cannot_reproduce');

-- Monitoring findings: one open report per problem; repeats only increase the count (no duplicate repairs).
create or replace function public.assist_monitor_report(p_fingerprint text, p_page text, p_description text, p_critical boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare existing uuid; new_id uuid;
begin
  select id into existing from public.site_issues where fingerprint = p_fingerprint
    and status not in ('fixed', 'built', 'closed', 'declined', 'duplicate', 'cannot_reproduce') limit 1;
  if existing is not null then
    update public.site_issues set occurrences = occurrences + 1, updated_at = now() where id = existing;
    return null;
  end if;
  insert into public.site_issues (reporter_id, kind, page_path, description, source, fingerprint, device)
    values (null, 'problem', left(p_page, 300), left(p_description, 4000), 'monitor', left(p_fingerprint, 80), 'Detected automatically')
    returning id into new_id;
  if p_critical then update public.site_issues set priority = 'critical' where id = new_id; end if;
  insert into public.site_issue_events (issue_id, actor, action, detail) values (new_id, 'system', 'detected', 'Found by monitoring');
  return new_id;
end $$;
revoke all on function public.assist_monitor_report(text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.assist_monitor_report(text, text, text, boolean) to service_role;

update public.dev_tracker set detail = detail || ' Technical Administrator: $50 monthly hard AI budget with 75%/90% alerts, proactive monitoring (health checks and error capture), monthly operations report.' where key = 'assistance-center';
