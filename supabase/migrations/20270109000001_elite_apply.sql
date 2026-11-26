-- Elite Concierge: APPLY for Elite Membership. Qualification and verification required.
-- Exclusivity comes from who qualifies, not from who may apply. Four pathways:
--   direct    : anyone (no other membership needed) applies; standard verification is complimentary
--   earned    : existing members whose verified evidence and milestones satisfy the requirements
--   expedited : the same application with OPTIONAL priority processing (fee never mandatory, never admission)
--   founder   : the founder's personal verification, approval and invitation
-- Once qualified, Elite Concierge membership unlocks for purchase automatically.

alter table public.elite_candidates drop constraint elite_candidates_pathway_check;
alter table public.elite_candidates add constraint elite_candidates_pathway_check check (pathway in ('direct', 'earned', 'expedited', 'founder'));

create or replace function public.elite_evaluate(p_user uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := coalesce(p_user, auth.uid());
  s public.elite_settings; c public.elite_candidates; p public.profiles;
  identity_ok boolean; qualification_ok boolean; months numeric; answers integer; standing_ok boolean; age_ok boolean;
  progression_ok boolean; fee_ok boolean; ready boolean;
begin
  if uid is null then return null; end if;
  if p_user is not null and p_user <> coalesce(auth.uid(), p_user) and not public.has_staff_role(array['owner']::public.staff_role[]) then
    raise exception 'Not permitted';
  end if;
  select * into s from public.elite_settings;
  select * into p from public.profiles where id = uid;
  select * into c from public.elite_candidates where user_id = uid for update;
  age_ok := coalesce(p.age_eligible, false);
  standing_ok := p.status = 'active';
  identity_ok := not s.require_identity
    or exists (select 1 from public.identity_verifications v where v.user_id = uid and v.status = 'verified')
    or (c.id is not null and exists (select 1 from public.elite_evidence e where e.candidate_id = c.id and e.kind = 'identity' and e.status in ('owner_verified', 'automated_verified')));
  qualification_ok := c.id is not null and (
    c.status in ('qualification_approved', 'invitation_issued', 'invitation_accepted', 'membership_activated')
    or exists (select 1 from public.elite_evidence e where e.candidate_id = c.id and e.kind <> 'identity' and e.status in ('owner_verified', 'automated_verified')));
  select coalesce(max(extract(epoch from (now() - s2.created_at)) / 2629800), 0) into months
    from public.subscriptions s2 where s2.user_id = uid and s2.status in ('active', 'trialing');
  select count(*) into answers from public.discovery_answers d where d.user_id = uid;
  progression_ok := months >= s.min_membership_months and answers >= s.min_discovery_answers;
  fee_ok := c.id is not null and (c.fee_waived or c.fee_paid_at is not null);
  ready := c.id is not null and age_ok and standing_ok and identity_ok and qualification_ok and c.status not in ('revoked', 'expired')
    -- Direct and expedited applicants need verification only: the optional fee buys priority, never admission.
    and case c.pathway when 'earned' then progression_ok when 'founder' then c.status = 'qualification_approved' else true end;
  if ready and c.status not in ('invitation_issued', 'invitation_accepted', 'membership_activated') then
    perform set_config('app.elite_system', 'on', true);
    update public.elite_candidates set status = 'invitation_issued', invitation_expires_at = now() + make_interval(days => s.invitation_days) where id = c.id;
    c.status := 'invitation_issued';
  end if;
  return jsonb_build_object(
    'candidate', c.id is not null, 'pathway', c.pathway, 'status', c.status,
    'age', age_ok, 'standing', standing_ok, 'identity', identity_ok, 'qualification', qualification_ok,
    'months', round(months, 1), 'min_months', s.min_membership_months, 'answers', answers, 'min_answers', s.min_discovery_answers,
    'progression', progression_ok, 'fee', fee_ok, 'expedited_available', c.status in ('preliminary', 'verification_pending', 'info_required', 'manual_review') and c.screening_meets and not coalesce(c.fee_waived, false),
    'invitation_expires_at', c.invitation_expires_at);
end $$;
revoke all on function public.elite_evaluate(uuid) from public, anon;
grant execute on function public.elite_evaluate(uuid) to authenticated, service_role;

create or replace function public.elite_screen_v2(p_qualification text, p_pathway text, p_answers jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); c public.elite_candidates; s public.elite_settings;
  bands integer[] := array[0, 250000, 500000, 1000000, 2000000, 5000000, 10000000, 25000000];
  a jsonb := coalesce(p_answers, '{}'); keep jsonb; result text; why text;
  docs boolean; t_income bigint; t_revenue bigint; t_nw bigint; t_inv bigint;
  ok_income boolean; ok_revenue boolean; ok_nw boolean; ok_inv boolean;
  function_band text;
begin
  if uid is null then raise exception 'Please sign in'; end if;
  if p_pathway not in ('direct', 'expedited') or p_qualification not in ('personal_income', 'business_owner', 'executive', 'net_worth', 'investor', 'professional', 'retiree') then
    raise exception 'Unknown pathway';
  end if;
  if coalesce(a ->> 'att_truth', '') <> 'yes' or coalesce(a ->> 'att_verify', '') <> 'yes' then raise exception 'Please confirm both statements'; end if;
  select * into s from public.elite_settings;
  select * into c from public.elite_candidates where user_id = uid;
  if c.status = 'revoked' then return 'revoked'; end if;
  if c.status in ('invitation_issued', 'invitation_accepted', 'membership_activated') then return c.status; end if;

  -- Every band answer must be one of the published lower bounds.
  for function_band in select key from jsonb_each(a) where key in ('income_recent', 'income_prior', 'revenue', 'comp', 'net_worth', 'investable') loop
    if not ((a ->> function_band) ~ '^[0-9]+$' and (a ->> function_band)::integer = any(bands)) then raise exception 'Please choose from the ranges shown'; end if;
  end loop;

  docs := coalesce(a ->> 'docs', '') = 'yes';
  t_income := (s.thresholds -> 'personal_income' ->> 'amount')::bigint;
  t_revenue := (s.thresholds -> 'business_revenue' ->> 'amount')::bigint;
  t_nw := (s.thresholds -> 'net_worth' ->> 'amount')::bigint;
  t_inv := (s.thresholds -> 'investable_assets' ->> 'amount')::bigint;
  ok_income := coalesce((s.thresholds -> 'personal_income' ->> 'approved')::boolean, false);
  ok_revenue := coalesce((s.thresholds -> 'business_revenue' ->> 'approved')::boolean, false);
  ok_nw := coalesce((s.thresholds -> 'net_worth' ->> 'approved')::boolean, false);
  ok_inv := coalesce((s.thresholds -> 'investable_assets' ->> 'approved')::boolean, false);

  case p_qualification
    when 'personal_income' then
      keep := jsonb_build_object('income_recent', (a ->> 'income_recent')::int, 'income_prior', (a ->> 'income_prior')::int, 'docs', a ->> 'docs');
      if (a ->> 'income_recent')::bigint >= t_income and (a ->> 'income_prior')::bigint >= t_income and docs then
        result := case when ok_income then 'pass' else 'owner_review' end; why := 'Income threshold not yet approved.';
      else result := 'not_yet'; end if;
    when 'business_owner' then
      keep := jsonb_build_object('own_pct', a ->> 'own_pct', 'revenue', (a ->> 'revenue')::int, 'profitable', a ->> 'profitable', 'years', a ->> 'years', 'docs', a ->> 'docs');
      if a ->> 'own_pct' in ('25to50', 'over50') and (a ->> 'revenue')::bigint >= t_revenue and a ->> 'profitable' = 'yes' and a ->> 'years' in ('2to5', 'over5') and docs then
        result := case when ok_revenue then 'pass' else 'owner_review' end; why := 'Business revenue threshold not yet approved.';
      else result := 'not_yet'; end if;
    when 'executive' then
      keep := jsonb_build_object('level', a ->> 'level', 'org', a ->> 'org', 'role_years', a ->> 'role_years', 'comp', (a ->> 'comp')::int, 'docs', a ->> 'docs');
      if a ->> 'level' in ('c_suite', 'president', 'evp_svp', 'managing_partner') and (a ->> 'comp')::bigint >= t_income and ok_income and docs then
        result := 'pass';
      elsif a ->> 'level' in ('c_suite', 'president', 'evp_svp', 'managing_partner', 'vp') and a ->> 'org' in ('50to500', 'over500') and a ->> 'role_years' in ('1to3', 'over3') and docs then
        result := 'owner_review'; why := 'Executive standing needs the founder''s judgment.';
      else result := 'not_yet'; end if;
    when 'net_worth' then
      keep := jsonb_build_object('net_worth', (a ->> 'net_worth')::int, 'docs', a ->> 'docs');
      if (a ->> 'net_worth')::bigint >= t_nw and docs then result := case when ok_nw then 'pass' else 'owner_review' end; why := 'Net worth threshold not yet approved.';
      else result := 'not_yet'; end if;
    when 'investor' then
      keep := jsonb_build_object('investable', (a ->> 'investable')::int, 'docs', a ->> 'docs');
      if (a ->> 'investable')::bigint >= t_inv and docs then result := case when ok_inv then 'pass' else 'owner_review' end; why := 'Investable assets threshold not yet approved.';
      else result := 'not_yet'; end if;
    when 'professional' then
      keep := jsonb_build_object('prof_years', a ->> 'prof_years', 'licensed', a ->> 'licensed', 'distinctions', a ->> 'distinctions', 'docs', a ->> 'docs');
      if a ->> 'prof_years' in ('10to20', 'over20') and a ->> 'distinctions' in ('one_two', 'three_plus') and docs then
        result := 'owner_review'; why := 'Professional distinction needs the founder''s judgment.';
      else result := 'not_yet'; end if;
    else -- retiree
      keep := jsonb_build_object('prior', a ->> 'prior', 'net_worth', (a ->> 'net_worth')::int, 'docs', a ->> 'docs');
      if (a ->> 'net_worth')::bigint >= t_nw and ok_nw and docs then result := 'pass';
      elsif a ->> 'prior' in ('executive', 'business_owner', 'professional') and docs then result := 'owner_review'; why := 'Retiree accomplishments need the founder''s judgment.';
      else result := 'not_yet'; end if;
  end case;

  perform set_config('app.elite_system', 'on', true);
  insert into public.elite_candidates (user_id, pathway, qualification, screening, screening_result, screened_at, screening_meets, status, review_reasons)
    values (uid, p_pathway, p_qualification, keep, result, now(), result = 'pass',
      case result when 'pass' then 'preliminary' when 'owner_review' then 'manual_review' else 'not_started' end,
      case when result = 'owner_review' then array['Preliminary screening needs your review: ' || why] else '{}' end)
  on conflict (user_id) do update set pathway = excluded.pathway, qualification = excluded.qualification, screening = excluded.screening,
    screening_result = excluded.screening_result, screened_at = excluded.screened_at, screening_meets = excluded.screening_meets,
    review_reasons = excluded.review_reasons,
    status = case when public.elite_candidates.status in ('qualification_approved', 'owner_verified', 'automated_verified') then public.elite_candidates.status else excluded.status end;
  perform set_config('app.elite_system', 'off', true);
  return result;
end $$;
revoke all on function public.elite_screen_v2(text, text, jsonb) from public, anon;
grant execute on function public.elite_screen_v2(text, text, jsonb) to authenticated;

-- An approved (unlocked) or accepted candidacy may purchase Elite Concierge; no separate acceptance step.
create or replace function public.elite_checkout_allowed(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.elite_candidates c where c.user_id = p_user
    and c.status in ('invitation_issued', 'invitation_accepted', 'membership_activated')
    and (c.invitation_expires_at is null or c.invitation_expires_at > now() or c.status = 'membership_activated'));
$$;
revoke all on function public.elite_checkout_allowed(uuid) from public, anon, authenticated;
grant execute on function public.elite_checkout_allowed(uuid) to service_role;

-- Public wording.
update public.membership_packages set highlight = 'Apply · Qualification Required' where slug = 'elite-concierge';

-- ─── Elite experiences: In Business, In Life, In Love ─────────────
-- Members choose the experiences they take part in. In Love is never automatic and requires the singles
-- minimum age (30) and a single relationship status.
create table public.elite_experience_prefs (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  in_business boolean not null default false,
  in_life boolean not null default false,
  in_love boolean not null default false,
  relationship_status text check (relationship_status in ('single', 'partnered', 'married', 'prefer_not')),
  updated_at timestamptz not null default now()
);
alter table public.elite_experience_prefs enable row level security;
create policy "own elite experiences" on public.elite_experience_prefs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner reads elite experiences" on public.elite_experience_prefs for select to authenticated
  using (public.has_staff_role(array['owner']::public.staff_role[]));
revoke all on public.elite_experience_prefs from public, anon;
grant select, insert, update on public.elite_experience_prefs to authenticated;
grant all on public.elite_experience_prefs to service_role;

create or replace function public.guard_elite_love()
returns trigger language plpgsql security definer set search_path = public as $$
declare dob date;
begin
  if new.in_love then
    if coalesce(new.relationship_status, '') <> 'single' then
      raise exception 'Elite In Love is for members who are single.';
    end if;
    select date_of_birth into dob from public.member_private where user_id = new.user_id;
    if dob is null or dob > (current_date - make_interval(years => public.setting_int('minimum_singles_age', 30))) then
      raise exception 'Elite In Love is for members 30 and older.';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger guard_elite_love before insert or update on public.elite_experience_prefs for each row execute function public.guard_elite_love();
