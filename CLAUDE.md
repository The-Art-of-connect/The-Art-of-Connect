# The Art of Connect — standing development rules

- **Official names (founder directives 37 and 41, permanent). One feature. One official name. One consistent experience.** Every feature, experience, division, membership and service uses
  its one official name from `src/lib/brand.ts` (the Brand Terminology Registry): menus, headings, search, Home cards,
  membership benefits, upgrade pop-ups, Journey text and voice, emails, Owner Portal, Help and reports. CONNECT 360 is
  always "CONNECT 360"; My Intelligence Office is always "My Intelligence Office". Never rename an approved feature or
  add alternative branding without founder approval. New features are added to the registry. `tests/brand.test.ts`
  enforces this and must pass. Final decisions (directive 41): Business Deal Rooms, My Daily Sanctuary, My Personal
  Discovery Portfolio, Elite Concierge, Business Launch Center, The Art of Knowing Yourself. Former names may be search
  aliases only. Internal routes, saved progress and historical financial/audit records are never renamed.
- **Membership vs identity (directive 40).** The orange checkmark means Identity Verified only. Executive Member
  (champagne-gold/charcoal shield) and Elite Member (orange-gold/black crown shield) come only from active memberships
  via `public.member_marks`, respect visibility, and never imply any verification.
- Founder directives are recorded word for word in `docs/founder-directives/` and listed in its README.
- Production restrictions (live payments, public enrollment, production storage) stay off until the founder approves.
- **Progressive membership benefits (directive 44, permanent).** Every level up keeps every existing entitlement (societies,
  level, couples experience, Journey allowance) and adds more. Recommendations never present a plan that removes anything
  as a level up; `src/lib/recommend.ts` and `tests/recommend.test.ts` enforce this. Never erase history on downgrade.
- **Lifelong growth (directive 45, permanent).** Growth records are append-only history; reports follow the member's
  chosen frequency; Journey separates member-reported facts, platform activity and AI observations, and never invents.
