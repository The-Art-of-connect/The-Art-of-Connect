-- Lifelong growth, milestones and relationship transitions (founder directives 45 with amendment, 46 and 47).
-- Audit: discovery_history already keeps every earlier answer (so earlier and present perspectives can be compared);
-- journey_memory_settings already records consent for long-term personalization; goals, analyses, Sanctuary entries,
-- résumés, businesses and funding projects already exist. This adds only what was missing.

-- ─── Growth report preferences (directive 45 amendment) ────────────────────────────────────────────────────────────────
create table if not exists public.growth_prefs (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  frequency text not null default 'quarterly' check (frequency in ('monthly', 'quarterly', 'semiannual', 'annual', 'on_demand')),
  paused boolean not null default false,
  next_due_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.growth_prefs enable row level security;
drop policy if exists growth_prefs_own on public.growth_prefs;
create policy growth_prefs_own on public.growth_prefs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.growth_prefs to authenticated;

create or replace function public.growth_interval(f text) returns interval language sql immutable as $$
  select case f when 'monthly' then interval '1 month' when 'quarterly' then interval '3 months'
                when 'semiannual' then interval '6 months' when 'annual' then interval '1 year' else null end;
$$;

-- ─── Growth reports: append-only history, member-owned ─────────────────────────────────────────────────────────────────
-- Facts are separated by source: completed platform activity, member-reported items, and (only with consent and
-- eligibility) Journey's written reflection, which is labeled as an AI observation.
create table if not exists public.growth_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('scheduled', 'on_demand')),
  period_start timestamptz not null,
  period_end timestamptz not null default now(),
  began_at timestamptz,
  activity jsonb not null default '{}'::jsonb,
  member_reported jsonb not null default '{}'::jsonb,
  journey_reflection text,
  created_at timestamptz not null default now()
);
create index if not exists growth_reports_user on public.growth_reports (user_id, created_at desc);
alter table public.growth_reports enable row level security;
drop policy if exists growth_reports_own_read on public.growth_reports;
create policy growth_reports_own_read on public.growth_reports for select using (user_id = auth.uid());
drop policy if exists growth_reports_own_delete on public.growth_reports;
create policy growth_reports_own_delete on public.growth_reports for delete using (user_id = auth.uid());
grant select, delete on public.growth_reports to authenticated;

-- ─── Milestones (member-approved; private unless the member shares them with their partner) ───────────────────────────
create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('birthday', 'anniversary', 'breakthrough', 'education', 'relationship', 'career', 'business_launch', 'business_expansion', 'funding', 'project', 'goal_completed', 'membership_anniversary', 'other')),
  title text not null check (char_length(title) between 2 and 160),
  note text check (char_length(note) <= 2000),
  occurred_on date not null default current_date,
  recurring boolean not null default false,
  visibility text not null default 'private' check (visibility in ('private', 'shared_partner')),
  source text not null default 'member' check (source in ('member', 'platform')),
  created_at timestamptz not null default now()
);
create index if not exists milestones_user on public.milestones (user_id, occurred_on desc);
alter table public.milestones enable row level security;
drop policy if exists milestones_own on public.milestones;
create policy milestones_own on public.milestones for all using (user_id = auth.uid()) with check (user_id = auth.uid() and source = 'member');
drop policy if exists milestones_partner on public.milestones;
create policy milestones_partner on public.milestones for select using (
  visibility = 'shared_partner' and exists (
    select 1 from relationships.couple_members a join relationships.couple_members b on a.couple_id = b.couple_id
    where a.user_id = auth.uid() and b.user_id = milestones.user_id));
grant select, insert, update, delete on public.milestones to authenticated;

-- ─── Relationship status (directive 47): private to the member, with history ───────────────────────────────────────────
create table if not exists relationships.status (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null check (status in ('single', 'dating', 'committed', 'engaged', 'married', 'separated', 'divorce_in_progress', 'divorced', 'relationship_ended', 'prefer_not_to_say')),
  since date,
  updated_at timestamptz not null default now()
);
create table if not exists relationships.status_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null, since date, recorded_at timestamptz not null default now()
);
alter table relationships.status enable row level security;
alter table relationships.status_history enable row level security;
drop policy if exists status_own on relationships.status;
create policy status_own on relationships.status for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists status_history_own on relationships.status_history;
create policy status_history_own on relationships.status_history for select using (user_id = auth.uid());
grant select, insert, update on relationships.status to authenticated;
grant select on relationships.status_history to authenticated;

create or replace function relationships.record_status_history()
returns trigger language plpgsql security definer set search_path = public, relationships as $$
begin
  insert into relationships.status_history (user_id, status, since) values (new.user_id, new.status, new.since);
  return new;
end $$;
drop trigger if exists status_history on relationships.status;
create trigger status_history after insert or update of status on relationships.status for each row execute function relationships.record_status_history();

-- ─── Leaving the shared Couples experience (directive 47) ──────────────────────────────────────────────────────────────
-- Either partner, alone, at any time. Access to the shared space ends immediately for the member who leaves. Their
-- account, private reflections, growth records, Journey conversations, membership and business participation are untouched.
-- Singles matchmaking is NOT switched on: their In Love profile stays paused until they choose. "Private" leaves without
-- any message to the former partner (a confidential safety pathway).
create or replace function relationships.leave_couple(p_private boolean default false)
returns text language plpgsql security definer set search_path = public, relationships as $$
declare me uuid := auth.uid(); cid uuid; other uuid;
begin
  if me is null then raise exception 'Please sign in'; end if;
  select couple_id into cid from relationships.couple_members where user_id = me;
  if cid is null then return 'not_in_couple'; end if;
  select user_id into other from relationships.couple_members where couple_id = cid and user_id <> me limit 1;
  delete from relationships.couple_members where couple_id = cid and user_id = me;
  -- Pending invitations from this member to the shared space are withdrawn.
  update relationships.partner_invitations set status = 'revoked' where couple_id = cid and inviter_id = me and status = 'pending';
  -- No automatic matchmaking: the member's In Love profile stays private until they choose.
  update relationships.profiles set track = 'single', is_visible = false where user_id = me;
  delete from relationships.couple_consents where user_id = me or partner_id = me;
  if other is not null and not p_private then
    insert into public.member_notices (user_id, kind, title, body, href)
      values (other, 'system', 'A change to your shared space', 'Your partner has chosen to step away from your shared Couples space. Your own reflections and records remain yours. Support is available in the Counseling & Wellness Center.', '/app/wellness');
  end if;
  -- If nobody remains, the shared space closes (its shared items stay with the couple record for retention rules).
  return case when other is null then 'left_and_closed' else 'left' end;
end $$;
revoke all on function relationships.leave_couple(boolean) from public, anon;
grant execute on function relationships.leave_couple(boolean) to authenticated;

-- ─── Building a growth report from real records (no invented accomplishments) ──────────────────────────────────────────
create or replace function public.growth_report_build(p_user uuid, p_kind text)
returns uuid language plpgsql security definer set search_path = public, relationships, business as $$
declare v_since timestamptz; began timestamptz; rid uuid;
begin
  select coalesce(max(period_end), (select created_at from public.profiles where id = p_user)) into v_since from public.growth_reports where user_id = p_user;
  select created_at into began from public.profiles where id = p_user;
  insert into public.growth_reports (user_id, kind, period_start, began_at, activity, member_reported)
  values (p_user, p_kind, v_since, began,
    jsonb_build_object(
      'sanctuary_entries', (select count(*) from public.sanctuary_entries where user_id = p_user and created_at > v_since),
      'discovery_updates', (select count(*) from public.discovery_history where user_id = p_user and recorded_at > v_since),
      'goals_achieved', (select count(*) from public.becoming_goals where user_id = p_user and status = 'achieved')
                      + (select count(*) from public.discovery_goals where user_id = p_user and status = 'achieved'),
      'goals_active', (select count(*) from public.becoming_goals where user_id = p_user and status = 'active')
                    + (select count(*) from public.discovery_goals where user_id = p_user and status = 'active'),
      'shared_goals_achieved', (select count(*) from relationships.couple_goals g join relationships.couple_members m on m.couple_id = g.couple_id where m.user_id = p_user and g.status = 'achieved'),
      'resume_versions', (select count(*) from public.resume_versions v join public.resumes r on r.id = v.resume_id where r.user_id = p_user and v.created_at > v_since),
      'businesses', (select count(*) from public.member_businesses where user_id = p_user),
      'funding_projects', (select count(*) from business.funding_projects where user_id = p_user)
    ),
    jsonb_build_object(
      'milestones', coalesce((select jsonb_agg(jsonb_build_object('title', title, 'kind', kind, 'on', occurred_on) order by occurred_on) from public.milestones where user_id = p_user and created_at > v_since), '[]'::jsonb),
      'relationship_changes', coalesce((select jsonb_agg(jsonb_build_object('status', status, 'since', since) order by recorded_at) from relationships.status_history where user_id = p_user and recorded_at > v_since), '[]'::jsonb)
    ))
  returning id into rid;
  return rid;
end $$;
revoke all on function public.growth_report_build(uuid, text) from public, anon, authenticated;
grant execute on function public.growth_report_build(uuid, text) to service_role;

-- Members request a report on demand (at most one a day).
create or replace function public.growth_report_request()
returns uuid language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Please sign in'; end if;
  if exists (select 1 from public.growth_reports where user_id = auth.uid() and created_at > now() - interval '1 day') then
    raise exception 'You can request one reflection a day.';
  end if;
  return public.growth_report_build(auth.uid(), 'on_demand');
end $$;
revoke all on function public.growth_report_request() from public, anon;
grant execute on function public.growth_report_request() to authenticated;

-- Scheduled reports, membership anniversaries and anniversary acknowledgments (runs with the 15-minute job).
create or replace function public.growth_tick()
returns integer language plpgsql security definer set search_path = public, relationships as $$
declare g public.growth_prefs; rid uuid; n integer := 0;
begin
  for g in select * from public.growth_prefs where not paused and frequency <> 'on_demand' and next_due_at is not null and next_due_at <= now() limit 200 loop
    rid := public.growth_report_build(g.user_id, 'scheduled');
    update public.growth_prefs set next_due_at = now() + public.growth_interval(g.frequency) where user_id = g.user_id;
    insert into public.member_notices (user_id, kind, title, body, href, ref_id)
      select g.user_id, 'growth_report', 'Your growth reflection is ready', 'Where you began, what has changed, and gentle next steps.', '/app/know-yourself/portfolio/reports/' || rid, rid
      where coalesce((select growth_reports from public.notification_prefs where user_id = g.user_id), true)
      on conflict do nothing;
    n := n + 1;
  end loop;
  -- Membership anniversaries (a platform milestone, private by default).
  insert into public.milestones (user_id, kind, title, occurred_on, source)
    select p.id, 'membership_anniversary', 'Celebrating ' || (extract(year from age(current_date, p.created_at::date)))::int || ' year' || case when extract(year from age(current_date, p.created_at::date)) > 1 then 's' else '' end || ' with The Art of Connect', current_date, 'platform'
    from public.profiles p
    where p.status = 'active' and p.created_at::date < current_date and to_char(p.created_at, 'MM-DD') = to_char(current_date, 'MM-DD')
      and not exists (select 1 from public.milestones m where m.user_id = p.id and m.kind = 'membership_anniversary' and m.occurred_on = current_date);
  -- Acknowledge recurring milestones (birthdays, anniversaries) on their day, once a year, if the member allows it.
  insert into public.member_notices (user_id, kind, title, body, href, ref_id)
    select m.user_id, 'milestone', 'Celebrating today: ' || m.title, 'A moment worth honoring.', '/app/know-yourself/portfolio#milestones', m.id
    from public.milestones m
    where (m.recurring or m.kind = 'membership_anniversary') and to_char(m.occurred_on, 'MM-DD') = to_char(current_date, 'MM-DD')
      and coalesce((select milestones from public.notification_prefs where user_id = m.user_id), true)
      and not exists (select 1 from public.member_notices x where x.user_id = m.user_id and x.kind = 'milestone' and x.ref_id = m.id and x.created_at::date = current_date)
    on conflict (user_id, kind, ref_id) do update set created_at = now(), read_at = null where public.member_notices.created_at::date < current_date;
  return n;
end $$;
revoke all on function public.growth_tick() from public, anon, authenticated;
grant execute on function public.growth_tick() to service_role;
