-- Social Ecosystem phase 1: honest stages (built, tested, merged, deployed; NOT operational until the owner tests
-- and approves) and direct testing links. Items still to build remain "designed".
update public.dev_tracker set status = 'deployed', built = true, tests_passed = true, merged = true, deployed = true, operational = false, awaiting = 'owner',
  next_step = 'Owner: test in an owner testing session with two test accounts.'
where key in ('social-home', 'social-profiles-photos', 'social-connections-graph', 'social-conversations', 'social-moderation', 'social-feed',
  'calendar-events', 'calendar-interactions', 'calendar-discovery', 'calendar-safety', 'social-circles', 'social-circles-member-created',
  'connection-intelligence', 'connection-alignment', 'find-people-like-me', 'social-owner-controls', 'couples-circles', 'couples-singles-separation');
update public.dev_tracker set detail = detail || ' Phase 1: preference-based v1 with purpose-specific matching and reasons; Art of Self inputs (with consent) are next.' where key = 'connection-intelligence';
update public.dev_tracker set detail = detail || ' Phase 1: event reminders by email. Full preference center is next.', status = 'deployed', built = true, tests_passed = true, merged = true, deployed = true, awaiting = 'owner' where key = 'social-notifications';
update public.dev_tracker set next_step = 'Phase 2 (next): shared couple profile with both partners'' consent, couple-to-couple discovery cards, double dates via Connection Moments.' where key in ('social-couples-connection', 'couples-shared-profile', 'couples-communication');
update public.dev_tracker set next_step = 'Phase 3: trips, recommendations and trip conversations (reuses events and conversations).' where key = 'social-couples-travel';
update public.dev_tracker set next_step = 'Next: Journey reads authorized preferences to suggest circles, people and events (paid members, within allowances).' where key = 'social-journey';

insert into public.dev_tracker (key, area, title, detail, status, next_step, sort_order, designed, built, tests_passed, merged, deployed, operational, awaiting) values
  ('connection-purposes', 'Social Ecosystem', 'Purpose-specific Connection Intelligence (directive 11)', 'Separate logic for business, peers, mentorship (seeking and offering), friendship, social, hobbies, travel, couples friendships and exploring. Shared and complementary qualities; no universal score; reasons always shown; never uses income, Elite status or membership level. Couples consider both partners.', 'deployed', 'Owner: test with test accounts answering different preferences.', 525, true, true, true, true, true, false, 'owner'),
  ('connection-directions', 'Social Ecosystem', 'Three directions: upward, alongside, through contribution', 'Members choose what they are available for: seeking a mentor, offering mentorship, compatible peers, friendships, business, travel, exploring. Nobody is required to mentor.', 'deployed', 'Owner: test.', 526, true, true, true, true, true, false, 'owner'),
  ('elite-only-connections', 'Social Ecosystem', 'Elite-only connections by choice', 'Elite members may keep chosen activities among verified Elite peers and still take part in the broader community.', 'deployed', 'Owner: test with an Elite test account.', 527, true, true, true, true, true, false, 'owner'),
  ('specialized-circles', 'Social Ecosystem', 'Open, specialized and Verified Elite circles (directives 12–13)', '57 seeded circles across 15 owner-managed categories, e.g. Affordable Adventures, Luxury Travel, Cruise Enthusiasts, Aspiring Entrepreneurs, Established Business Owners, Elite Business. Ordinary and luxury-interest circles are open to every member; only Elite circles require verification.', 'deployed', 'Owner: review the circle list; rename, add or archive in Community & Social.', 528, true, true, true, true, true, false, 'owner'),
  ('connection-preferences-assessment', 'Social Ecosystem', 'Progressive, private connection preferences', 'Short sections (how you connect, business, social, travel) answered over time; viewable, editable and deletable; never shown to others.', 'deployed', 'Next: reuse Art of Self and readiness answers with consent.', 529, true, true, true, true, true, false, 'owner')
on conflict (key) do nothing;

-- Direct links for functional testing.
update public.qa_features set href = '/app/connect/profile' where key = 'social-profiles-photos';
update public.qa_features set href = '/app/connect/people' where key in ('social-connections', 'find-people');
update public.qa_features set href = '/app/connect' where key = 'social-feed';
update public.qa_features set href = '/app/connect/events/new' where key = 'calendar-create-share';
update public.qa_features set href = '/app/connect/events' where key in ('calendar-rsvp', 'calendar-discovery-filters');
update public.qa_features set href = '/admin/social' where key in ('calendar-safety', 'circles-member-created', 'social-owner-controls');
update public.qa_features set href = '/app/connect/circles' where key in ('circles-discover-join', 'couples-circles');
update public.qa_features set href = '/app/connect/preferences' where key = 'connection-preferences';

insert into public.qa_features (key, department, title, tracker_key, href, purpose, steps, expected, sort) values
  ('connection-purpose-scenarios', 'account', 'Compatible and incompatible recommendations by purpose', 'connection-purposes', '/app/connect/people',
    'Each connection type is matched on what matters for it, with reasons.',
    array['With test account A: in My connection preferences choose Travel style Luxury and pace Relaxed; Social activities Dining and Arts. Profile: available for Travel and Friendships, discoverable.',
          'With test account B: Travel style Value, pace Packed; Social activities Dining and Arts; same availability, discoverable.',
          'As A, open Find People Like Me → Friendships: B appears with "You both enjoy dining out and arts & culture".',
          'As A, choose Travel companions: B does NOT appear (travel styles and pace differ).',
          'Business: give A needs Finance and B expertise Finance; as A choose Business networking: B appears with "Their expertise in finance & funding complements what you''re looking for".',
          'Mentorship: A seeking a mentor, B offering mentorship; confirm B appears for A under Find a mentor, and A for B under Offer mentorship.']::text[],
    'Friendship fit is not travel fit; reasons are shown; nobody is matched because of income or Elite status.', 1500),
  ('specialized-circles-open', 'security', 'Lifestyle circles open to everyone; Elite circles verified', 'specialized-circles', '/app/connect/circles?category=travel',
    'Members choose freely; only Elite circles require verification.',
    array['As a non-Elite test member, join Luxury Travel and Affordable Adventures.', 'Try to join Elite Travel: it should be refused.', 'Leave a circle and rejoin it.']::text[],
    'Every ordinary circle is open; only Verified Elite circles are restricted.', 1510),
  ('elite-only-choice', 'security', 'Elite-only connections', 'elite-only-connections', '/app/connect/preferences',
    'Elite members choose where they prefer Elite-only connections.',
    array['As an Elite test member, choose Elite-only for Travel companionship.', 'As a non-Elite test member, search travel companions: the Elite member does not appear.', 'As the Elite member, confirm other activities still show broader members.']::text[],
    'Elite-only applies only to the activities chosen.', 1520),
  ('circle-community', 'account', 'A circle''s community', 'social-circles', '/app/connect/circles',
    'Feed, events, members, photos and group messages inside a circle.',
    array['Join a circle; post in its feed with a photo.', 'Share an event with the circle; check it appears under Events.', 'Connect with another member of the circle and start a group conversation from the circle.']::text[],
    'Circle content stays inside the circle; group messages only include connections.', 1530),
  ('messages-private', 'security', 'Private messages', 'social-conversations', '/app/connect/messages',
    'Only connections can message; conversations are private.',
    array['Try messaging a member you are not connected with (no Message button).', 'Connect, then message; confirm a third test account cannot see it.', 'Block a member; confirm they can no longer message you.']::text[],
    'Messaging requires a connection; blocking stops contact.', 1540)
on conflict (key) do nothing;
