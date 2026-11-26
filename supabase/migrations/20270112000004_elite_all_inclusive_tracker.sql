-- Elite all-inclusive and at-cost usage: tracker and QA (honest stages).
insert into public.dev_tracker (key, area, title, detail, status, next_step, sort_order, designed, built, tests_passed, merged, deployed, operational, awaiting) values
  ('elite-unlimited-journey', 'Elite Concierge', 'Unlimited Journey text for Elite (fair use)', 'No message allowance or purchase prompts for Elite; hourly, daily and monthly-cost fair-use safeguards; 300 voice minutes a month kept.', 'deployed', 'Owner: set the Elite member fair-use cost ceiling and membership cap, then test.', 430, true, true, true, true, true, false, 'owner'),
  ('journey-at-cost-pricing', 'Journey', 'Additional usage at cost (no markup)', 'Voice minutes (15/30/60/120) and messages priced at the OpenAI rate plus card processing; configurable in the Journey Intelligence Center; never charged without the member choosing.', 'deployed', 'Owner: review costs and publish when ready.', 431, true, true, true, true, true, false, 'owner'),
  ('elite-all-inclusive-entitlements', 'Elite Concierge', 'All-inclusive entitlements enforced', 'All-access packages: all experiences, partner access, no couples upgrade, add-ons or onboarding fee; Private Sessions included; no message packages; membership change options replaced by the All Access summary.', 'deployed', 'Owner: test an Elite checkout in Sandbox.', 432, true, true, true, true, true, false, 'owner'),
  ('elite-platform-experience', 'Elite Concierge', 'Elite throughout the platform', 'Black-and-gold personalized dashboard, Elite privacy (Elite and connections only), priority support desk, personalized Journey Concierge guidance, Elite circles with freedom to join any eligible circle.', 'deployed', 'Owner: review as an Elite test member.', 433, true, true, true, true, true, false, 'owner')
on conflict (key) do nothing;

insert into public.qa_features (key, department, title, tracker_key, href, purpose, steps, expected, sort) values
  ('elite-all-inclusive', 'financial', 'Elite is all-inclusive', 'elite-all-inclusive-entitlements', '/app/membership',
    'No upgrade offers or extra service charges for Elite, except voice minutes at cost.',
    array['As an Elite test member: open Membership: you see Elite Membership — All Access, not upgrade options.', 'Open Journey Plus: no message packages; voice minutes show cost breakdown.', 'Open Private Sessions: each shows Included and begins without checkout.', 'Open the member home: the black-and-gold Elite dashboard appears.']::text[],
    'Nothing to buy except optional voice minutes at cost.', 1600),
  ('elite-unlimited-text', 'journey', 'Unlimited Journey text with fair use', 'elite-unlimited-journey', '/app/journey',
    'Elite text conversations never hit a message allowance.',
    array['As an Elite test member, chat with Journey: the meter shows Unlimited.', 'Confirm no purchase prompt appears anywhere in Journey.']::text[],
    'Unlimited; only fair-use messages if abused.', 1610),
  ('journey-at-cost', 'admin', 'At-cost usage pricing', 'journey-at-cost-pricing', '/admin/journey',
    'Owner sets costs; packages re-price at cost.',
    array['In the Journey Intelligence Center, change the voice cost per minute and save.', 'Confirm voice package prices update and Journey Plus shows the new breakdown.']::text[],
    'Prices equal cost plus card processing; no markup.', 1620),
  ('elite-privacy-support', 'security', 'Elite privacy and priority support', 'elite-platform-experience', '/app/support',
    'Elite-only visibility and prioritized support requests.',
    array['As an Elite test member, set profile visibility to Elite members and connections; as a non-Elite unconnected member, confirm the profile is hidden.', 'Send a support request; in the Owner Portal Support page it shows Elite priority at the top.']::text[],
    'Privacy enforced by the database; Elite requests first.', 1630)
on conflict (key) do nothing;
