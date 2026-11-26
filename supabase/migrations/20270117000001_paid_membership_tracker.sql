-- Founder directive 20 (paid membership enhancement): Development Tracker and QA (honest stages; nothing operational or owner-approved).
insert into public.dev_tracker (key, area, title, detail, status, next_step, sort_order, designed, built, tests_passed, merged, deployed, operational, awaiting) values
  ('paid-audit', 'Membership', 'Paid, Executive and Elite functionality audit',
   'docs/membership/paid-membership-audit.md: operational, partial and missing features, duplicates avoided, permission review and infrastructure dependencies. Includes the Complete Society mapping for the founder to confirm.',
   'deployed', 'Owner: review the audit and confirm the membership level mapping.', 470, true, true, true, true, true, false, 'owner'),
  ('feature-directory', 'Membership', 'Paid membership phase 1: What Does This Website Offer?, What''s New, paid home',
   'Searchable, expandable feature directory with Expand All and Collapse All, driven by a central registry tied to membership levels and release status; What''s New; paid-member home with real conversations, events, connections, goals and benefits; central membership levels.',
   'deployed', 'Owner: review the directory signed out, as a free account and as each View-as membership.', 471, true, true, true, true, true, false, 'owner'),
  ('paid-p2', 'Membership', 'Paid membership phase 2: discovery, Connection Tables, Professional Society, singles, couples, growth',
   'Connect Me With Someone Who…, readiness-gated compatibility, Connection Tables (written first), Business Idea Lab and roundtables, mentorship and accountability, singles social experiences, couples Our Shared Future (merging couples moments), paid growth plans, weekly connection report.',
   'designed', 'Next build phase.', 472, true, false, false, false, false, false, null),
  ('paid-p3', 'Membership', 'Paid membership phase 3: Executive Private experience',
   'Executive dashboard, Lounge, Roundtables, Introductions, Private Meeting Suite (scheduling and invitations first), Collaboration Groups, Opportunity Exchange, Calendar, Privacy Mode, priority scheduling, Executive support.',
   'designed', 'After phase 2; live meetings need infrastructure approval.', 473, true, false, false, false, false, false, 'owner'),
  ('paid-p4', 'Membership', 'Paid membership phase 4: Elite Concierge experience',
   'Elite home expansion, Inner Circle, Bespoke Introductions, Global Boardroom, Opportunity Exchange (no securities marketplace), Travel Society, Signature Experiences, Legacy Circle, Private Affairs, case-tracked Elite service with staffing proposal.',
   'designed', 'After phase 3; staffing and infrastructure need approval.', 474, true, false, false, false, false, false, 'owner'),
  ('paid-p5', 'Membership', 'Paid membership phase 5: advanced conferencing and international communication',
   'Video, screen sharing, documents, captions and translation (coordinated with Becoming Circle phase 5).',
   'designed', 'Needs infrastructure approval.', 475, true, false, false, false, false, false, 'owner')
on conflict (key) do nothing;

insert into public.qa_features (key, department, title, tracker_key, href, purpose, steps, expected, sort) values
  ('feature-directory', 'account', 'What Does This Website Offer?', 'feature-directory', '/what-we-offer',
    'Every feature explained honestly, personalized to the member''s level.',
    array['Signed out: every feature shows who it is for; search and the category filter work; Expand all and Collapse all work.', 'As a free test account: complimentary features say Included; paid ones show a lock and Start a 15-day trial or upgrade.', 'Use View as for One Society, Complete Society (Business + Love), Executive Private and Elite: the Included labels change accordingly.', 'Features marked Coming soon have no link and are never described as available.', 'Open a paid feature''s link as a free account: the server sends you to the membership page (the directory never grants access).']::text[],
    'Accurate, honest and enforced on the server.', 470),
  ('paid-home', 'account', 'Paid member home', 'feature-directory', '/app',
    'Paid members see their own real activity.',
    array['As a paid test member, open the dashboard: conversations, events you saved, connections, requests, goals and What''s New appear.', 'With no activity, each card says so; nothing is invented.']::text[],
    'Only the member''s real data.', 471)
on conflict (key) do nothing;

-- Founder directives 21 (Executive & Elite Signature Services) and 22 (Business & Tax Education Center): recorded and planned.
insert into public.dev_tracker (key, area, title, detail, status, next_step, sort_order, designed, built, tests_passed, merged, deployed, operational, awaiting) values
  ('exec-elite-assistant', 'Executive & Elite', 'Personal Assistant Workspace, Weekly and Daily Editions',
   'Agenda, meetings, invitations, introduction requests, reminders, action items and goals from existing calendar and notification data; optional Executive Weekly Edition and Elite Daily Edition (deterministic; external industry news only from an approved source).',
   'designed', 'Owner: approve a news source before industry developments are included.', 476, true, false, false, false, false, false, 'owner'),
  ('elite-black-book', 'Elite Concierge', 'The Elite Black Book and Bespoke Global Introductions',
   'Private categories, notes and follow-ups for mutually accepted connections only (no contact details, no bulk messaging); introduction requests that stay pending until a suitable consenting member exists.',
   'designed', 'Planned for the Elite phase.', 477, true, false, false, false, false, false, null),
  ('elite-concierge-requests', 'Elite Concierge', 'How May We Assist You? and premium service request management',
   'Request center with status tracking; routine help through Journey; human requests assigned to authorized staff; member approval before any purchase, reservation or sharing; Owner Portal queue, priority, response times, feedback and costs.',
   'designed', 'Owner: approve staffing and service response standards.', 478, true, false, false, false, false, false, 'owner'),
  ('business-intelligence', 'Executive & Elite', 'Business Intelligence Center and private resource library',
   'Private business projects with invited collaborators, planning, proposals, presentations, meeting preparation and action items; owner-approved templates and worksheets in the existing library; Journey within allowances, with sources and limits shown.',
   'designed', 'Planned for the Executive phase.', 479, true, false, false, false, false, false, null),
  ('business-tax-education', 'Executive & Elite', 'Business & Tax Education Center',
   'Journey education on structures, deductions, payroll, retirement plans, depreciation, statements, cash flow, credit, funding, expansion and succession, asking about circumstances first; owner-approved dated source library by tax year and jurisdiction; illustrative calculations; consultation preparation; encrypted private document storage; referral infrastructure subject to owner approval. Educational only, never licensed advice.',
   'designed', 'Owner: approve the source library approach and Journey caps.', 480, true, false, false, false, false, false, 'owner')
on conflict (key) do nothing;
