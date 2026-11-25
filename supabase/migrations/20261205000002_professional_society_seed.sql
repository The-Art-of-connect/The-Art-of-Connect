-- The Professional Society — owner-editable starting configuration.
-- No members, posts, mentors or activity are created here.

insert into public.platform_settings (key, value, description) values
  ('max_daily_business_posts', '5', 'Connection Board posts a member may create per day'),
  ('free_business_accounts_open', 'false', 'Owner switch: allow free Professional Society business accounts (also requires public registration to be open)')
on conflict (key) do nothing;

insert into business.industries (slug, name, sort_order) values
  ('accounting-finance', 'Accounting & Finance', 10), ('agriculture', 'Agriculture', 20), ('arts-design', 'Arts & Design', 30),
  ('beauty-wellness', 'Beauty & Wellness', 40), ('construction-trades', 'Construction & Trades', 50), ('consulting', 'Consulting & Professional Services', 60),
  ('education-training', 'Education & Training', 70), ('food-hospitality', 'Food & Hospitality', 80), ('healthcare', 'Healthcare', 90),
  ('insurance', 'Insurance', 100), ('legal', 'Legal Services', 110), ('manufacturing', 'Manufacturing', 120),
  ('marketing-media', 'Marketing & Media', 130), ('nonprofit', 'Nonprofit & Community', 140), ('real-estate', 'Real Estate', 150),
  ('retail-ecommerce', 'Retail & E-commerce', 160), ('technology', 'Technology & Software', 170), ('transportation-logistics', 'Transportation & Logistics', 180),
  ('travel-events', 'Travel & Events', 190), ('other', 'Other', 999);

insert into business.categories (slug, name, description, sort_order) values
  ('business-needs', 'Business Needs', 'What my business needs right now', 10),
  ('challenges', 'Business Challenges', 'A challenge I am working through', 20),
  ('seeking-expertise', 'Seeking Expertise', 'Expertise I am looking for', 30),
  ('offering-expertise', 'Offering Expertise', 'Expertise I can share with other owners', 40),
  ('strategic-partnership', 'Strategic Partnership', 'Partnership opportunities', 50),
  ('business-expansion', 'Business Expansion', 'Growing into new markets, cities or states', 60),
  ('mentorship', 'Mentorship', 'Seeking or offering mentorship', 70),
  ('collaboration', 'Business Collaboration', 'Working together on an opportunity', 80),
  ('technology-automation', 'Technology & Automation', 'Systems, software and automation', 90),
  ('leadership-operations', 'Leadership & Operations', 'Leadership and operational development', 100),
  ('acquisition', 'Business Acquisition', 'Buying or selling a business', 110),
  ('succession-retirement', 'Succession & Retirement', 'Succession and retirement planning', 120),
  ('general-questions', 'General Business Questions', 'Ask the community', 130);

insert into business.features (key, name, description, guest, free, premium, status, sort_order) values
  ('explore', 'Explore The Professional Society', 'Browse industries, categories, membership benefits and opt-in public business profiles.', true, true, true, 'available_now', 10),
  ('business_profile', 'Business profile', 'Build and edit your business profile; you decide whether any of it is public.', false, true, true, 'available_now', 20),
  ('needs_assessment', 'Basic business needs assessment', '“Let’s Talk About Your Business”: how we can help, and how you can help others.', false, true, true, 'available_now', 30),
  ('goals', 'Business goals', 'Set and track short- and long-term goals.', false, true, true, 'available_now', 40),
  ('readiness_checklist', 'Business readiness checklist', 'A practical checklist of business foundations.', false, true, true, 'available_now', 50),
  ('basic_pathway', 'Basic business development pathway', 'Suggested next steps based on your needs and goals.', false, true, true, 'available_now', 60),
  ('connection_board', 'Business Connection Board', 'Post what you need or what you can offer; browse posts from owners in other cities and states.', false, true, true, 'growing_community', 70),
  ('private_inbox', 'Private business inbox', '“I Can Help — Connect Privately”: message requests that the other owner accepts or declines.', false, true, true, 'growing_community', 80),
  ('resources', 'Business resources', 'Educational resources and tools selected by our team.', true, true, true, 'growing_community', 90),
  ('networking_events', 'Networking opportunities', 'Member networking experiences.', true, true, true, 'coming_soon', 100),
  ('advanced_compatibility', 'Advanced business compatibility assessment', 'Leadership style, values, communication and collaboration preferences.', false, false, true, 'coming_soon', 110),
  ('strategic_matching', 'Strategic business matching', 'Complementary needs and expertise, introduced only when both owners accept.', false, false, true, 'coming_soon', 120),
  ('personal_introductions', 'Personalized professional introductions', 'Curated introductions to complementary owners.', false, false, true, 'future_development', 130),
  ('collaboration_groups', 'Private collaboration groups', 'Industry and interest groups.', false, false, true, 'future_development', 140),
  ('mentorship_connections', 'Mentorship connections', 'Structured mentor and mentee pairing.', false, false, true, 'coming_soon', 150),
  ('development_roadmap', 'Personalized business development roadmap', 'A full roadmap with progress tracking and periodic reassessment.', false, false, true, 'future_development', 160),
  ('workshops', 'Business workshops', 'Expanded workshops and networking experiences.', false, false, true, 'future_development', 170),
  ('enhanced_visibility', 'Enhanced business visibility', 'Greater visibility for your profile and posts within the community.', false, false, true, 'future_development', 180);

insert into business.readiness_items (key, title, description, area, sort_order) values
  ('entity', 'Business entity formed and registered', 'Your legal structure is formed and in good standing.', 'Foundations', 10),
  ('ein-banking', 'Separate business banking', 'Business and personal finances are separated.', 'Foundations', 20),
  ('licenses', 'Licenses and permits current', 'Required licenses, permits and registrations are up to date.', 'Foundations', 30),
  ('insurance', 'Appropriate business insurance', 'Coverage reviewed for your industry and size.', 'Foundations', 40),
  ('bookkeeping', 'Bookkeeping system in place', 'Monthly books, P&L and balance sheet you can rely on.', 'Finance', 50),
  ('budget', 'Annual budget and cash-flow plan', 'You know your runway and your monthly cash needs.', 'Finance', 60),
  ('plan', 'Written business plan or strategy', 'Goals, customers, offer and priorities are documented.', 'Strategy', 70),
  ('processes', 'Documented core processes', 'Key processes are written down so others can follow them.', 'Operations', 80),
  ('technology', 'Core systems and automation', 'The tools you rely on are chosen and working together.', 'Operations', 90),
  ('team', 'Roles and responsibilities defined', 'Who does what is clear, including your own role.', 'Leadership', 100),
  ('brand', 'Clear brand and online presence', 'A consistent identity and a website or profile people can find.', 'Growth', 110),
  ('succession', 'Continuity and succession considered', 'A plan if you step away, sell or retire.', 'Future', 120);

insert into public.launch_checklist (key, category, title, description, requires_owner_approval, sort_order) values
  ('business:community', 'The Professional Society', 'Founding business community ready', 'Free business accounts authorized, features set in the Owner Portal, resources published, moderation plan in place.', true, 400),
  ('business:premium', 'The Professional Society', 'Premium membership activation decision', 'Activate the $29.99 membership only when enough members, expertise and resources are in place.', true, 410)
on conflict (key) do nothing;
