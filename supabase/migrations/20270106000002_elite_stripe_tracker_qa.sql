-- Elite verification on Stripe: Development Tracker and QA plan (honest stages: built and tested, not operational).
update public.dev_tracker set detail = 'Private evidence storage, owner verify/reject/request info, statuses, appeals, retention dates. Stripe is the verification provider.',
  next_step = 'Owner: test review flow with Stripe Sandbox results.' where key = 'elite-verification';
update public.dev_tracker set status = 'deployed', built = true, tests_passed = true, merged = true, deployed = true,
  detail = 'Stripe Checkout for the expedited fee, offered only after preliminary screening; recorded separately from membership revenue. The fee stays inactive for members until approved.',
  next_step = 'Owner: test in Sandbox with a test card; approve or change the fee before launch.' where key = 'elite-expedited-payment';
insert into public.dev_tracker (key, area, title, detail, status, next_step, sort_order, designed, built, tests_passed, merged, deployed, operational, awaiting) values
  ('elite-stripe-identity', 'Elite Concierge', 'Elite identity via Stripe Identity', 'ID document, date of birth and live selfie match through Stripe; non-biometric alternative by owner document review.', 'deployed', 'Owner: verify a test account in Sandbox. Production follows the identity verification launch switch.', 412, true, true, true, true, true, false, 'owner'),
  ('elite-stripe-financial', 'Elite Concierge', 'Elite bank verification via Stripe Financial Connections', 'Express consent; ownership matched to the verified identity; balances and 12-month deposit summaries only, owner-only, auto-erased; disconnect after collection. Supporting evidence only.', 'deployed', 'Owner: test in Sandbox; submit our Authorized Purpose to Stripe (14 days before live use) and set the publishable key.', 413, true, true, true, true, true, false, 'owner'),
  ('elite-stripe-review', 'Owner Portal', 'Stripe verification review: use case, activation, costs', 'Owner page summarizing Stripe terms, activation steps, costs and production switches.', 'deployed', 'Owner: review and decide.', 414, true, true, true, true, true, false, 'owner')
on conflict (key) do nothing;

insert into public.qa_features (key, department, title, tracker_key, href, purpose, steps, expected, sort) values
  ('elite-stripe-identity', 'security', 'Elite identity with Stripe Identity (Sandbox)', 'elite-stripe-identity', '/app/elite/eligibility', 'Identity, date of birth and selfie match through Stripe, using fictional test data.',
    array['Start a testing session, sign in as a test member and complete the preliminary questions.', 'Press Verify my identity with Stripe and choose Stripe''s test "verified" outcome.', 'Return and confirm Identity verified shows on the eligibility page and in the Elite Management Center.']::text[],
    'Identity shows verified; no ID images or date of birth are stored by the platform.', 1100),
  ('elite-stripe-financial', 'security', 'Elite bank verification with Financial Connections (Sandbox)', 'elite-stripe-financial', '/app/elite/eligibility', 'Ownership, balance and deposit summaries arrive for owner review only.',
    array['As the test member, read and accept the authorization, then connect a Stripe test institution.', 'In the Elite Management Center, check ownership, balance and 12-month deposits appear with "not income / not net worth" labels.', 'As the member, confirm no amounts are visible; then Disconnect & erase.']::text[],
    'Summaries visible only to the owner; the member sees status only; erase removes the amounts.', 1110),
  ('elite-expedited-fee', 'financial', 'Expedited verification fee (Sandbox)', 'elite-expedited-payment', '/app/elite/eligibility', 'Fee offered only after preliminary screening and paid through Stripe test mode.',
    array['As a test member, choose Expedited and answer Not yet: confirm no payment is offered.', 'Answer Yes: pay with test card 4242 4242 4242 4242.', 'Confirm the fee shows as paid in the Elite Management Center and in Stripe verification revenue (Sandbox).']::text[],
    'Payment only after passing screening; it never grants admission by itself; revenue reported separately.', 1120),
  ('elite-stripe-review', 'admin', 'Stripe verification review page', 'elite-stripe-review', '/admin/elite/verification', 'The owner can see terms, costs, status and production switches.',
    array['Open the page and read the requirements and costs.', 'Try turning production bank verification on without the purpose checkbox or APPROVE: it should refuse.']::text[],
    'Clear decision page; production stays off until explicitly approved.', 1130)
on conflict (key) do nothing;
