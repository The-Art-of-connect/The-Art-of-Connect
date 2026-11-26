-- Elite: open application. Tracker and QA updates with honest stages.
update public.dev_tracker set title = 'Elite Concierge: apply, qualification and verification required',
  detail = 'Public wording is Apply for Elite Membership — Qualification and Verification Required. Elite unlocks for purchase once approved; checkout is refused until then.',
  next_step = 'Owner: test a direct application in a testing session.' where key = 'elite-invitation';
update public.dev_tracker set title = 'Direct, earned, priority and founder admission pathways',
  detail = 'Direct application with no other membership; earned invitations for members; optional priority verification (never required); founder invitations.'
  where key = 'elite-pathways';
insert into public.dev_tracker (key, area, title, detail, status, next_step, sort_order, designed, built, tests_passed, merged, deployed, operational, awaiting) values
  ('elite-direct-application', 'Elite Concierge', 'Direct Elite application (new visitors)', 'Apply page creates an account with no other membership, then screening, Stripe Identity, evidence and automatic unlock on approval.', 'deployed', 'Owner: apply as a new test visitor in a testing session.', 419, true, true, true, true, true, false, 'owner'),
  ('elite-experiences', 'Elite Concierge', 'Elite experiences: In Business, In Life, In Love', 'Members choose their experiences; In Love requires single status and age 30+ and is never automatic. Connection features themselves are in preparation.', 'deployed', 'Build Elite connections for each experience; owner review.', 420, true, true, true, true, true, false, 'owner'),
  ('elite-photos', 'Elite Concierge', 'Member photographs and galleries', 'Not built yet: photo uploads, galleries, privacy and moderation for all members.', 'designed', 'Build next, with storage-level privacy.', 421, true, false, false, false, false, false, null)
on conflict (key) do nothing;

insert into public.qa_features (key, department, title, tracker_key, href, purpose, steps, expected, sort) values
  ('elite-direct-apply', 'account', 'Apply for Elite as a new visitor (standard, no fee)', 'elite-direct-application', '/join/elite', 'A new visitor applies directly and is unlocked on approval without paying any verification fee.',
    array['Start a testing session, sign out, and open Memberships: the Elite card says Apply for Elite Membership.', 'Apply, create a test account, confirm the email and sign in.', 'Answer the High-income questions (both years $500,000+, documents Yes), choose Standard verification.', 'Verify identity with Stripe (Sandbox "verified") and upload a test document.', 'As the owner, mark the document Verified: the applicant sees "Approved: Elite membership unlocked".', 'Choose Elite Concierge in Membership & billing and pay with test card 4242 4242 4242 4242; the gold badge appears.']::text[],
    'No fee needed to be approved; Elite unlocks automatically after verification; badge on activation.', 1190),
  ('elite-priority-apply', 'financial', 'Priority (expedited) verification is optional', 'elite-expedited-payment', '/app/elite/eligibility', 'Priority is offered only after passing screening and identity, and is never required.',
    array['As a test applicant who passed screening, choose Priority verification and verify identity.', 'Pay $995 with a Stripe test card; return and see the payment confirmed.', 'In the Elite Management Center, the applicant is marked Priority and listed first.']::text[],
    'Optional, Sandbox only, priority marker shown; admission still depends on verification.', 1200),
  ('elite-experiences', 'account', 'Elite experiences and In Love rules', 'elite-experiences', '/app/elite', 'Members choose In Business, In Life and In Love.',
    array['As an active Elite test member, choose experiences and save.', 'Choose In Love with status Married: it should be refused.', 'With a test member under 30, In Love should be refused.']::text[],
    'Choices saved; In Love only for single members 30+.', 1210)
on conflict (key) do nothing;
