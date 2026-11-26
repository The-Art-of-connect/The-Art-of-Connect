# Paid membership audit (founder directive 20, section 36)

_Prepared by Peace, November 26, 2026, before building. Status words are honest: **Operational** means built, deployed and
working in Sandbox; nothing here is owner-approved unless the founder says so._

## 1. Membership levels and entitlements

| Level | How it is reached today | Enforced where |
|---|---|---|
| Complimentary | Every account: The Art of Becoming | Pages, server (`requireExperience`), database (`has_experience`) |
| One Society | Professional Society **or** Personal Society / Couples (paid or 15-day trial) | Same, plus `has_paid_membership` for the social ecosystem |
| Complete Society | **Both** paid societies (Business + Love), which with the free Art of Becoming covers all three | Same |
| Executive Private | The Executive Private package | Journey Concierge mode only. **Gap:** no other distinct Executive features yet |
| Elite Concierge | Qualification, verification and owner approval, then the Elite package (verified badge) | Elite pages, Elite circles, all-inclusive Journey rules |

**Decision (confirmed by the founder, November 26, 2026):** "Complete Society" means **both paid societies — In Business
(The Professional Society) and In Love (The Personal Society)** — with The Art of Becoming remaining complimentary. One paid
society is "One Society". This is implemented in `src/lib/membership-level.ts`.

## 2. What exists today

| Area | Operational | Partial | Missing |
|---|---|---|---|
| Personal development | Art of Self, Daily Sanctuary, Who Am I Becoming?, Vision Board, Discovery Portfolio | — | Paid personalized growth plans and weekly goal reviews with Journey |
| Journey | Text, voice, Customize, Discovery Sessions, Private Sessions, memory, at-cost add-ons | Allowances exist but caps are not yet set by the owner, so Journey stays refused | — |
| Communities | Connect feed, 57 circles (open, interest, Elite), Connect Calendar, Find People Like Me, messages (mutual connection required), follows | Connection Intelligence Engine (purpose-specific matching library exists; readiness indicator built) | Connection Tables; Connect Me With Someone Who…; member-to-member compatibility gated by readiness |
| Live conversations | The Becoming Circle phase one (written) | — | Live audio, speaking turns, lounges, Create the Conversation, scheduling priority |
| Professional Society | Business dashboard, Connection Board, private business inbox, Knowledge Exchange webinars | — | Business Idea Lab, Roundtables, Problem-Solving Rooms, Collaborator Discovery, Mentorship Exchange, Accountability, Resource Library, Growth Planning |
| Personal Society — singles | Onboarding, readiness profile, love languages, singles 30+ rule | — | Dinner/brunch, companions, retirement friendships as structured experiences |
| Personal Society — couples | Couples calendar, Exclusive Connection, love languages together | Partner invitations, date invitations and surprises exist on the unmerged branch `claude/couples-moments` | Our Shared Future, shared goals and vision boards, Understanding My Partner, couples tables |
| Travel | Travel circles and member-shared events | — | Destination communities, companion discovery, planning spaces |
| Executive Private | Journey Concierge mode | — | Executive dashboard, Lounge, Roundtables, Introductions, Private Meeting Suite, Collaboration Groups, Opportunity Exchange, Calendar, Privacy Mode, priority scheduling, Executive support |
| Elite Concierge | Qualification and Stripe verification (Sandbox), black-and-gold dashboard, verified badge, 6 Elite circles, priority support desk, Elite privacy visibility, all-inclusive entitlements (no add-on charges except Journey voice at cost) | — | Inner Circle discovery, Bespoke Introductions, Global Boardroom, Opportunity Exchange, Travel Society, Signature Experiences, Legacy Circle, Private Affairs, case-tracked Elite service |
| Safety and privacy | Safety Shield (database-enforced), blocking and reporting, privacy preferences | — | My Privacy & Safety Center (consolidated) |
| Owner analytics | Free → trial → paid conversions | — | Engagement, feature usage, retention, cancellation reasons, service utilization and profitability |

## 3. Duplicates avoided

- My Daily Journey (Journey) and My Daily Sanctuary overlap in daily practices. The Sanctuary is the complimentary home; Daily Journey stays for paid members' Journey-linked goals. Consolidating is a future cleanup.
- Elite circles already exist in Find Your Circle; the Elite Inner Circle will extend them, not duplicate them.

## 4. Security and permission gaps found

- None open. Social tables, society pages and Journey are enforced in the database and server. Free accounts reach only The Art of Becoming and the complimentary Becoming Circle.
- The new feature directory shows descriptions of paid features to everyone, by design; actual use is enforced server-side.

## 5. External infrastructure dependencies (need owner approval and costs first)

- Real-time audio for live discussions, Connection Tables and Executive/Elite meetings.
- Video, screen sharing and document sharing (Global Boardroom).
- Captions and translation.
- Staffing for Executive and Elite human support and moderation.

## 6. Phases (coordinated with the Becoming Circle roadmap)

1. **Now:** feature directory, What's New, paid dashboard, central membership levels, navigation. *(this release)*
2. Personalized discovery (readiness-gated), Connection Tables (written first), Professional Society enhancements, singles, couples (merge couples moments), paid growth plans.
3. Executive Private dashboard and services; Private Meeting Suite (scheduling and invitations first; live media after infrastructure approval).
4. Elite Concierge dashboard expansion, Inner Circle, Bespoke Introductions, Opportunity Exchange (no securities marketplace), Travel Society, Legacy Circle, Private Affairs, case-tracked Elite service.
5. Advanced conferencing, accessibility, captions and translation.
