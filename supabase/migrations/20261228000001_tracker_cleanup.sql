-- Development Tracker: accurate stages for the original entries, duplicates removed,
-- and the Universal Journey Integration recorded (applied after it was merged and deployed).
delete from public.dev_tracker where key in ('openai-text', 'voice', 'sessions', 'calendar', 'therapy-center');

update public.dev_tracker t set built = true, tests_passed = true, merged = true, deployed = true,
  operational = v.operational, awaiting = v.awaiting,
  status = case when v.operational then 'functional' when v.awaiting = 'legal' then 'awaiting_legal' when v.awaiting = 'payments' then 'awaiting_payments' else 'deployed' end, next_step = coalesce(v.next_step, t.next_step), updated_at = now()
from (values
  ('philosophy', false, 'owner', 'Owner: review the Blueprint in Consolidated review.'),
  ('financial-controls', false, 'owner', 'Becomes operational when Journey is turned on.'),
  ('intelligence-center', true, null, null),
  ('memory', false, 'launch', null),
  ('daily', false, 'owner', null),
  ('library', false, 'owner', null),
  ('auto-reload', false, 'payments', null),
  ('eval', false, 'owner', 'Run once Journey is on for owner testing.'),
  ('onboarding', false, 'launch', null),
  ('readiness', false, 'legal', null),
  ('exclusive', false, 'launch', null),
  ('journal', false, 'launch', null),
  ('trust-safety', false, 'launch', null),
  ('preview', true, null, null),
  ('tracker', true, null, null),
  ('ages', false, 'legal', null),
  ('legal-journey', false, 'legal', 'Legal review of the drafted terms.'),
  ('db-tool', true, null, null)
) as v(key, operational, awaiting, next_step)
where t.key = v.key;
update public.dev_tracker set built = false, tests_passed = false, merged = false, deployed = false, operational = false, awaiting = 'launch', status = 'designed', updated_at = now()
  where key = 'matchmaking';

insert into public.dev_tracker (key, area, title, detail, status, next_step, sort_order, designed, built, tests_passed, merged, deployed, operational, awaiting) values
  ('universal-journey', 'Journey', 'Universal Journey integration', 'Talk to Journey, Chat With Journey or Continue Independently on every lesson and questionnaire; answers documented for member review; Ask Journey on every signed-in page.', 'deployed',
   'Owner: turn on Journey, then try a lesson with Chat With Journey and Review and save.', 115, true, true, true, true, true, false, 'owner')
on conflict (key) do update set detail = excluded.detail, next_step = excluded.next_step, built = true, tests_passed = true, merged = true, deployed = true, awaiting = excluded.awaiting, updated_at = now();
