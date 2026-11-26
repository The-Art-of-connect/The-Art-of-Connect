-- Elite: automatic qualification, member data access/correction, honest transaction window. Honest stages.
update public.dev_tracker set detail = 'Express consent; ownership matched to the verified identity; balance and deposit summaries over the actual history Stripe provides (up to ~180 days, never annualized); owner and member only; auto-erased; disconnect after collection. Supporting evidence only.'
  where key = 'elite-stripe-financial';
insert into public.dev_tracker (key, area, title, detail, status, next_step, sort_order, designed, built, tests_passed, merged, deployed, operational, awaiting) values
  ('elite-auto-qualification', 'Elite Concierge', 'Automatic Elite qualification and invitations', 'Conclusive evidence (Stripe Identity, owner-verified documents, founder invitations and the owner-approved investable-assets rule) proceeds to invitation automatically; inconclusive evidence moves to manual review with reasons.', 'deployed', 'Owner: decide whether to approve the investable-assets rule; test in Sandbox.', 415, true, true, true, true, true, false, 'owner'),
  ('elite-member-data', 'Elite Concierge', 'Members review, download and correct their verification information', 'My verification information on the eligibility page, a downloadable copy, and access and correction requests answered by the owner.', 'deployed', 'Owner: test with a test member.', 416, true, true, true, true, true, false, 'owner'),
  ('elite-stripe-approval-request', 'Owner Portal', 'Stripe approval request', 'Complete request covering networking, personal development, dating, matchmaking, planned counseling and Elite financial verification.', 'deployed', 'Owner and counsel: review, then submit to Stripe.', 417, true, true, true, true, true, false, 'owner'),
  ('elite-benefits-display', 'Elite Concierge', 'Elite card and page: what members receive', 'Membership card layout fixed; badge and In Business / In Love / In Life connections shown, with unbuilt connections marked In preparation.', 'deployed', 'Owner: review on phone.', 418, true, true, true, true, true, false, 'owner')
on conflict (key) do nothing;

insert into public.qa_features (key, department, title, tracker_key, href, purpose, steps, expected, sort) values
  ('elite-auto-qualification', 'account', 'Automatic qualification and manual-review routing', 'elite-auto-qualification', '/admin/elite', 'Qualified candidates proceed without you; inconclusive ones come to you with reasons.',
    array['As a test member on the income pathway, verify identity in Sandbox and connect a test bank: the candidacy should show Manual review with reasons.', 'In the Elite Management Center, mark the income document Verified: the invitation should issue automatically (earned pathway also needs milestones; expedited needs the fee or a waiver).', 'Optional: approve the investable-assets rule and an investable-assets threshold, then test the Established investor pathway with a test bank.']::text[],
    'No invitation from deposits or balances alone (except the approved investable-assets rule); reasons are shown for every manual review.', 1140),
  ('elite-member-data', 'security', 'My verification information: review, download, correct', 'elite-member-data', '/app/elite/eligibility', 'Members see only their own information and can ask for corrections.',
    array['As a test member, open My verification information and Download a copy.', 'Send a correction request; answer it in the Elite Management Center.', 'As a second test member, confirm none of the first member''s information is visible.']::text[],
    'Own data only; the downloaded file matches the page; corrections are tracked to completion.', 1150),
  ('elite-card-layout', 'account', 'Elite card layout and benefits', 'elite-benefits-display', '/membership', 'The Elite card reads cleanly on phone and shows what members receive.',
    array['Open Memberships on a phone and find the Elite Concierge card.', 'Check nothing overlaps and the benefits list shows In preparation where appropriate.', 'Open the Elite page and check the same benefits.']::text[],
    'No overlapping text; benefits are clear and honest.', 1160)
on conflict (key) do nothing;
