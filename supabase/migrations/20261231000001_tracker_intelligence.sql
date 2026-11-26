-- Journey's intelligence is tracked separately from connectivity: approved only by the owner after quality testing.
insert into public.dev_tracker (key, area, title, detail, status, next_step, sort_order, designed, built, tests_passed, merged, deployed, operational, awaiting) values
  ('journey-intelligence', 'Journey', 'Journey intelligence and personality quality',
   'Written and voice share one foundation: Blueprint, philosophy, founder principles, knowledge, training, member and page context. Voice hears the member (transcription, echo and noise filtering, patient turn-taking).',
   'deployed', 'Owner: run the nine quality tests and a voice conversation; refine the Blueprint; approve when Journey sounds like Journey.', 112,
   true, true, true, true, true, false, 'owner')
on conflict (key) do update set detail = excluded.detail, next_step = excluded.next_step, built = true, tests_passed = true, merged = true, deployed = true, operational = false, awaiting = 'owner', updated_at = now();
