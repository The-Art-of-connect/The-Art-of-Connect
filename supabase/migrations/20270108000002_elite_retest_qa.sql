-- Owner-reported issues from Elite eligibility testing (November 26, 2026), recorded in the QA Center.
insert into public.qa_features (key, department, title, href, purpose, steps, expected, sort) values
  ('owner-review-tab', 'admin', 'Owner review tab placement', '/app/journey', 'The owner review control never covers page content, the bottom navigation or Journey.',
    array['On a phone, open Journey and the Elite eligibility page.', 'Check the slim Review tab sits on the right edge and nothing is covered.', 'Open it, save a review, close it.']::text[],
    'Nothing obstructed; review still works.', 1170),
  ('branded-selections', 'account', 'Branded radio and checkbox selections', '/app/elite/eligibility', 'Selections use gold and orange, never the default blue.',
    array['Open the Elite eligibility page and Memberships on a phone.', 'Select options and check the gold ring with orange center.']::text[],
    'Branded selections everywhere.', 1180)
on conflict (key) do nothing;

insert into public.qa_corrections (feature_key, reported, status) values
  ('elite-expedited-fee', 'Owner testing: "Continue to secure checkout" for expedited Elite verification does nothing. Investigate the checkout request, Stripe Sandbox configuration, test-member permissions and logs; test the full $995 Sandbox checkout, including the return to the eligibility page and the payment status update.', 'open'),
  ('elite-expedited', 'Owner testing: preliminary eligibility is established by self-reported answers alone. Choosing Corporate Executive (or any pathway) must not unlock expedited verification. Implement meaningful preliminary screening before checkout.', 'open'),
  ('owner-review-tab', 'Owner testing: the floating "Review this page" button overlaps page content and the Journey interface on mobile.', 'open'),
  ('branded-selections', 'Owner testing: radio-button selections show the default blue; use the brand''s gold and orange.', 'open');
