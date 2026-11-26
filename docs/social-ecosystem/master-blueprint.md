# The Art of Connect — Social Ecosystem Master Blueprint

_Status: **designed, not built.** Every item below is recorded in the Development Tracker (area "Social Ecosystem") and
has a test plan in the Quality Assurance Center. Nothing is operational until it is built, tested and approved by the
founder. Commercial launch restrictions apply throughout._

Founder directives, kept word for word:
[08 Couples Connection Community](../founder-directives/08-couples-connection-community.md) ·
[09 The Connect Calendar](../founder-directives/09-connect-calendar.md) ·
[10 Find Your Circle & Connection Intelligence Engine](../founder-directives/10-find-your-circle.md)

> In Business. In Life. In Love. Help people discover themselves, find their people, build meaningful connections
> and experience life together — not simply interact online.

---

## 1. Principles (apply to every module)

1. **The system recommends. The member decides.** No member is assigned to a permanent category or kept out of an
   eligible community because of an assessment. Alignment labels describe opportunities, never human value.
2. **Consent first.** Private connections, shared couple content, attendance, location and data used for
   recommendations all require the member's (and, for couples, both partners') authorization.
3. **Confidential stays confidential.** Journals, private Journey conversations, counseling records, personal
   assessment answers and Elite financial verification are never shown publicly or used to rank anyone.
4. **No exact whereabouts by default.** Exact travel dates, home addresses and live locations are never published
   automatically. Public location is city-level at most; trips show month or season unless the couple chooses more.
5. **Friendship is not romance.** Couples friendship networking, professional networking and friendships are kept
   separate from singles matchmaking. No connection is ever interpreted as romantic interest unless the member chose
   a romantic intention and is eligible (singles 30+).
6. **Healthy by design.** No outrage or comparison ranking, no infinite-scroll engagement tricks. Members control their
   feeds, recommendations and notifications. Blocking, reporting, moderation and appeals everywhere.
7. **Real life over screen time.** Every module points toward real experiences: events, trips, gatherings.
8. **Reuse before building.** Extend existing systems (below) rather than duplicating them.
9. **No new paid infrastructure without approval.** No ticketing, booking, travel or media-processing services, and
   no new paid storage tiers, until the founder approves them.
10. **Never fabricate.** Concept screens use illustrative people and events; the live platform never presents
    fictional members, posts or events as real.

## 2. What already exists and will be reused

| Need | Existing system | How it's reused |
|---|---|---|
| Couples with two individual accounts | `relationships.couples`, `couple_members`, `partner_invitations` | The couple is the unit for shared content; each partner keeps their own account, privacy and consents. |
| Couples calendar | `relationships.couple_events`, `calendar_links`, `busy_blocks`, calendar feed tokens | "Add to our calendar" for events and trips; private by default. |
| Connection Moments | Branch `claude/couples-moments` (date invitations, private plans, surprises — database built, screens in progress) | Double dates and couple-to-couple invitations extend Moments. |
| Feed and saved posts | Business Connection Board (`business.posts`, `business.saved_posts`, acknowledgements) | Generalized into the Connection Feed with per-post audience (society, circle, connections). |
| Private messaging | Private business inbox (`business.messages`) | Generalized into conversations with participants: one-to-one, couple-to-couple, group, event and trip threads. |
| Events, registrations, reminders | Knowledge Exchange webinars (`business.webinars`, registrations, questions) and check-in email reminders | The Connect Calendar's event model, RSVP states and reminders; webinars appear as events. |
| Recommendation inputs | The Art of Self discovery answers, Personal Discovery Portfolio, love languages, onboarding answers | Read only with the member's authorization, through the Connection Intelligence Engine; raw answers never shown to others. |
| Journey | Journey (OpenAI), paid-only access, allowances and budget controls | Trip planning, event and circle suggestions for eligible paid members, within existing allowances. |
| Elite | Elite badge, `elite_experience_prefs` (In Business / In Life / In Love) | Elite circles, Elite experiences category and Elite couples, honoring eligibility. |
| Safety | Safety center, blocking, reporting, moderation queue, identity verification (Stripe Identity), age rules | Applied to every new surface; verified organizers use identity verification. |
| Owner controls | Owner Portal, audit log, page reviews, launch switches | New owner pages for communities, events, recommendation rules and safety. |

## 3. Shared foundations (build first)

1. **Member profiles and photo galleries** — profile, photos with per-photo visibility, moderation, EXIF/location
   stripping, storage-level privacy, membership-based photo limits, Elite badge beside names.
2. **Connections graph** — follow (one-way, public content) and connect (mutual, private messaging) with intention
   tags: friendship, business, mentorship, travel, hobbies, social, couples friendship, romance (eligible singles only).
3. **Conversations** — generalized messaging (direct, group, couple-to-couple, event, trip, circle), reporting,
   blocking, leave and mute.
4. **Notifications** — one preference center: per type, per circle, quiet hours, email and in-app; all optional.
5. **Moderation and appeals** — one queue for posts, comments, photos, events, circles and messages; appeals.

## 4. Modules

### 4.1 Connection Feed
Posts (photo, video, thought, accomplishment, life update, educational, event share) with Appreciate, Discuss, Save.
Audience per post. Chronological plus "from your circles" — no outrage-ranked feed. Feed controls and snooze.

### 4.2 Find Your Circle (Connection Circles)
- **Seeded circles:** business and entrepreneurship; executive leadership; investing and retirement planning; travel
  and adventure; personal development; conscious living; manifestations and affirmations; friendships and social
  activities; music, arts and culture; dining and entertainment; intentional singles; couples and marriage; life
  transitions; empty nesters; starting over after divorce; fitness and wellness; community involvement; professional
  mentorship; Elite connections; local, national and international communities.
- **Couples circles:** travel couples; newlyweds; entrepreneurial couples; empty nesters; couples over 50; date
  nights; marriage growth; local couples; Elite couples; shared adventures.
- **Each circle:** dashboard, member directory, feed, discussions and questions, photos and videos, upcoming events,
  group activities, group messaging, educational resources, shared recommendations, event invitations,
  announcements, optional notifications, moderation and reporting.
- **Eligibility:** age, society and Elite rules preserved (for example, intentional singles circles 30+; Elite
  circles for active Elite members; couples circles for linked couples 21+).
- **Member-created circles:** eligible members (verified identity, good standing) propose; owner approval queue;
  circle hosts get moderation tools; owner can archive or transfer.

### 4.3 Connection Intelligence Engine and Find People Like Me
- **Inputs (authorized only):** Art of Self, personality, interests, social and communication preferences,
  lifestyle, professional ambitions, values, life stage, goals, travel preferences, relationship intentions,
  hobbies.
- **My connection preferences:** members view, correct, pause and delete what the engine uses.
- **Alignment levels:** Naturally Aligned · Shared Interests · Growth Connections · Explore Beyond Your Circle ·
  Open Community — each recommendation shows *why* ("You both chose travel and personal growth").
- **Find People Like Me:** member chooses what they're seeking. Results show only members who opted in to being
  discoverable for that intention. Private connection requires mutual acceptance. Romance results only for eligible
  singles who chose a romantic intention, and never inside couples or professional discovery.
- **Excluded from ranking and from others' view:** wealth, financial verification, emotional-development scores,
  counseling participation, health, race, gender identity or disability.
- **Free members:** preference-based recommendations. **Paid members:** Journey-assisted discovery as well.

### 4.4 The Connect Calendar
- **Create or share:** name, description, photo or flyer, category, date, time and time zone, city, state and
  country, virtual or in-person, venue, admission cost, official website or registration link, organizer,
  membership eligibility, visibility and privacy.
- **Clearly labeled:** "Organized by a member" · "Shared by a member — organized by [external organizer]" ·
  "Verified organizer" (identity-verified, owner-approved) · "The Art of Connect" (official, including webinars).
- **Categories:** business networking, conferences, social gatherings, singles events, couples events, travel,
  cruises, concerts, festivals, education, webinars, wellness, community service, Elite experiences.
- **Interactions:** Interested, Attending, Request more information, Looking for someone to attend with, invite
  connections, event discussion, private event group conversation, save, share, add to personal or couples
  calendar, optional reminders, post-event photos, videos and reflections.
- **Discovery:** local, nationwide, international, virtual; filters for location, date, interests, category, price
  and membership eligibility; Journey suggestions for authorized paid members.
- **Safety:** reporting, moderation, organizer verification, fraud signals (suspicious links, duplicate listings,
  payment requests). **No payment collection on the platform** for member events; external ticket links are labeled
  external. Attendance and location are visible only with the member's consent (default: only to connections).

### 4.5 Couples Connection Community
- **Shared couple profile and gallery:** created by one partner, published only when **both** partners approve;
  each photo needs both partners' approval; either partner can withdraw consent and hide shared content.
- **Discover couples:** interests, lifestyles and goals; local (city), nationwide, international; only couples who
  opted in to discovery.
- **Connect, follow, communicate:** couple-to-couple connections (accepted on each side), shared conversations
  (all four partners), group messages, circle discussions, event invitations.
- **Plan together:** double dates and gatherings through Connection Moments and the couples calendar.
- **Privacy:** each partner's journals, Journey conversations, counseling records and assessments stay individual and
  confidential. Couples friendship networking is never shown to singles matchmaking, and partnered members do not
  appear in singles discovery.

### 4.6 Couples Travel Exchange
- **Trips:** destination (city, country), month or season by default (exact dates private unless shared), interests,
  "open to meeting other couples", visibility (private, connections, circle, community).
- **Ask and share:** destination questions; hotel, restaurant and excursion recommendations; reviews; travel photos
  and videos (location metadata stripped); voluntary itineraries.
- **Together:** discover couples going to the same destination at overlapping times (both opted in), invite couples
  to trips, private trip group conversations, trip activities on the couples calendar.
- **Journey:** trip planning, itinerary suggestions and recommendations for eligible paid members, within
  allowances. **No booking or paid travel integration** without founder approval.
- **Safety:** travel-safety guidance, meet-in-public reminders, reporting.

### 4.7 Journey integration (eligible paid members)
Connection preferences coaching, circle and event suggestions, new interests, trip planning. Journey only reads what
the member authorized; private Journey conversations are never shared with other members.

### 4.8 Owner management
Community categories, member-created groups (approval queue), recommendation rules, moderation, events and
announcements, community visibility, membership access, notification defaults, engagement analytics (aggregate only,
no individual surveillance), safety reports and community growth.

## 5. Build phases (proposed — awaiting the founder's order)

| Phase | Scope | Depends on |
|---|---|---|
| 1 | Profiles and photo galleries; connections graph; conversations; notification preferences; unified moderation | — |
| 2 | Connection Feed (generalizing the Business Connection Board) | 1 |
| 3 | The Connect Calendar (generalizing webinars and registrations) | 1 |
| 4 | Find Your Circle: seeded circles, circle pages, member-created circles with approval | 1–3 |
| 5 | Couples Connection Community: shared profiles with mutual consent, discovery, couple-to-couple communication | 1–4, Connection Moments |
| 6 | Couples Travel Exchange | 3–5 |
| 7 | Connection Intelligence Engine and Find People Like Me; Journey integration | 1–6 |
| 8 | Owner analytics and growth tools | all |

## 6. Decisions needed from the founder

1. Build order (table above) and which phase starts first.
2. Photo limits per membership and whether short video is included in phase 1 or later (storage cost).
3. Who may create circles (paid members only? identity-verified only?) and host responsibilities.
4. Free-member scope: which events and circles free members can see, share and join.
5. Elite couples circle eligibility: both partners Elite, or one partner Elite with the other's consent.
6. Any future paid ticketing, booking or travel integrations (none will be added without approval).
