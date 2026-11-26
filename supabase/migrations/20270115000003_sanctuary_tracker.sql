-- My Daily Sanctuary and Discover What's Possible: tracker and QA (honest stages; never operational or owner-approved here).
insert into public.dev_tracker (key, area, title, detail, status, next_step, sort_order, designed, built, tests_passed, merged, deployed, operational, awaiting) values
  ('daily-sanctuary', 'The Art of Becoming', 'My Daily Sanctuary',
   'Daily: manifestation, affirmation, intention, emotional check-in, reflection question, life lesson, self-discovery scenario, gratitude, growth challenge, accomplishments, evening reflection. Weekly and monthly reflections with deterministic summaries, goal review, letters to my future self. Approved prewritten content only; no AI for free accounts; all entries private.',
   'deployed', 'Owner: review and approve the starter library in Curriculum Studio → My Daily Sanctuary.', 450, true, true, true, true, true, false, 'owner'),
  ('sanctuary-library', 'The Art of Becoming', 'Sanctuary educational library and mini-courses',
   'Owner-managed lessons on identity, self-love, emotional intelligence, communication, boundaries, relationships, work ethic, financial mindset, values, confidence and intentional living, each with explanation, example, reflection and activity. Scheduling, approval and publishing in the Curriculum Studio.',
   'deployed', 'Owner: approve the starter lessons; add more in advance.', 451, true, true, true, true, true, false, 'owner'),
  ('sanctuary-discovery', 'Connection Intelligence', 'Progressive self-discovery scenarios',
   'Real-life scenarios asked once (revisit by choice); answers feed the private Discovery Portfolio and recommendations only with the member''s consent. Educational, never clinical or definitive.',
   'deployed', 'Owner: approve scenarios; review the consent wording.', 452, true, true, true, true, true, false, 'owner'),
  ('vision-board', 'The Art of Becoming', 'My Vision Board',
   'Private photographs, goals, intentions and accomplishments in eight categories; private storage (own folder only), 5 MB image limit, 30 photographs and 60 items per member.',
   'deployed', 'Owner: add a few items as a test member.', 453, true, true, true, true, true, false, 'owner'),
  ('sanctuary-reminders', 'The Art of Becoming', 'Optional Sanctuary reminders',
   'Member-chosen daily, weekly or monthly email reminders at a chosen time; off by default; no streaks, guilt or urgency.',
   'deployed', 'Owner: turn on a reminder as a test member.', 454, true, true, true, true, true, false, 'owner'),
  ('discover-whats-possible', 'Membership', 'Discover What''s Possible and What''s Happening Inside Connect',
   'Preference-based (no AI) invitations to relevant memberships once enough authorized discovery exists; owner-approved previews of genuine Connect activity with no member profiles or private content; real counts only from 10 members up; trial and membership invitations without pressure.',
   'deployed', 'Owner: approve previews in Community & Social as genuine activity appears.', 455, true, true, true, true, true, false, 'owner'),
  ('membership-conversions', 'Analytics', 'Free-to-trial and trial-to-paid conversions',
   'Owner Analytics Center: new free accounts, trials started, converted and cancelled, and direct purchases by month (counts only).',
   'deployed', 'Owner: review after the first trials in Sandbox.', 456, true, true, true, true, true, false, 'owner')
on conflict (key) do nothing;

insert into public.qa_features (key, department, title, tracker_key, href, purpose, steps, expected, sort) values
  ('daily-sanctuary', 'art-of-self', 'My Daily Sanctuary', 'daily-sanctuary', '/app/sanctuary',
    'Daily, weekly and monthly value for every account without AI.',
    array['Approve the starter library in Curriculum Studio → My Daily Sanctuary.', 'As a free test account, open My Daily Sanctuary: each practice shows approved content.', 'Record a check-in, gratitude and an accomplishment; reload: they are kept privately.', 'Open This week and This month: summaries count your own entries only.', 'Write a letter to your future self with a delivery date.']::text[],
    'Content appears only after approval; entries are private; no AI is used.', 450),
  ('sanctuary-scenarios', 'art-of-self', 'Self-discovery scenarios', 'sanctuary-discovery', '/app/sanctuary/discover',
    'Scenarios are asked once and used only with consent.',
    array['Answer a scenario: it does not appear again unless you choose Revisit.', 'With portfolio sharing off, the Discovery Portfolio shows nothing from scenarios.', 'Turn sharing on in Sanctuary settings: insights appear in your portfolio.']::text[],
    'No question repeats unasked; consent controls use.', 451),
  ('vision-board', 'art-of-self', 'My Vision Board', 'vision-board', '/app/sanctuary/vision',
    'Private, limited and secure.',
    array['Add a goal, an intention and a photograph (JPEG/PNG/WebP under 5 MB).', 'Try a 6 MB file: it is refused.', 'Mark a goal achieved.', 'As another test account, the first account''s photo link does not open.']::text[],
    'Only the member can see their board.', 452),
  ('discover-whats-possible', 'account', 'Discover What''s Possible', 'discover-whats-possible', '/app/discover',
    'Genuine previews and personalized invitations without pressure.',
    array['As a new free account, open Discover What''s Possible: it explains which activities would make suggestions more relevant.', 'Choose interests and complete a few scenarios with consent: relevant membership opportunities appear.', 'What''s Happening Inside Connect shows only approved previews; no names, photos or private content.', 'Invitations link to the 15-day trial or memberships.']::text[],
    'No fabricated activity, counts or matches; no paid features unlocked.', 453)
on conflict (key) do nothing;
