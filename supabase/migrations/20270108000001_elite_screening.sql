-- Elite preliminary screening that means something. Replaces the single self-reported yes/no.
-- Answers are ranges and categories (never exact amounts). The database decides the result:
--   pass         → objective criteria meet an APPROVED threshold and documents are available
--   owner_review → plausible but subjective, or the threshold isn't approved yet (the founder decides)
--   not_yet      → doesn't meet the pathway today
-- Only "pass", or the founder approving a review, unlocks expedited verification.

alter table public.elite_candidates
  add column screening jsonb not null default '{}',
  add column screening_result text check (screening_result in ('pass', 'owner_review', 'not_yet')),
  add column screened_at timestamptz;

-- The old one-question screening can no longer be called.
drop function if exists public.elite_screen(text, boolean, text);

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
  if p_pathway not in ('earned', 'expedited') or p_qualification not in ('personal_income', 'business_owner', 'executive', 'net_worth', 'investor', 'professional', 'retiree') then
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

-- Anyone who passed only the old one-question screening must complete the new screening before expedited
-- verification unlocks. Founder invitations are unaffected.
update public.elite_candidates set screening_meets = false,
  status = case when status = 'preliminary' then 'not_started' else status end
  where screening_result is null and pathway <> 'founder';
