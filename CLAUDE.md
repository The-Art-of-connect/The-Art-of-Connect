# The Art of Connect — standing development rules

- **Official names (founder directive 37, permanent).** Every feature, experience, division, membership and service uses
  its one official name from `src/lib/brand.ts` (the Brand Terminology Registry): menus, headings, search, Home cards,
  membership benefits, upgrade pop-ups, Journey text and voice, emails, Owner Portal, Help and reports. CONNECT 360 is
  always "CONNECT 360"; My Intelligence Office is always "My Intelligence Office". Never rename an approved feature or
  add alternative branding without founder approval. New features are added to the registry. `tests/brand.test.ts`
  enforces this and must pass.
- Founder directives are recorded word for word in `docs/founder-directives/` and listed in its README.
- Production restrictions (live payments, public enrollment, production storage) stay off until the founder approves.
