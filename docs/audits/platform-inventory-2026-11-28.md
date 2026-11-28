# Platform inventory, November 28, 2026 (Founder Directive 51, section 1)

Read-only audit of the code on the current branch (last commit `38cb41b`). Every `page.tsx` and `route.ts` under `src/app` is listed:
196 pages and 33 route handlers (229 routes), plus features that have no route yet. The live database was not queried. Where a
status depends on a launch switch or the `section_status` table, the switch values given for production before launch were used:
`payments_live`, `registrations_open`, `relationships_live`, `business_live`, `counseling_live`, `identity_verification_live`,
`counselor_applications_open` and `free_business_accounts_open` are all OFF (`src/lib/launch.ts`). Owner "Coming soon" pages:
`/app/counseling/professionals`, `/app/journey/memory`, `/app/journey/plus`, `/app/journey/sessions`, `/app/journey/voice` and
`/app/relationships/exclusive`.

## How each status was chosen

- A page loading, a table existing or tests passing does **not** make a feature functional. "Fully functional" means the page's
  forms call real server actions (`src/app/actions/*`) or RPCs defined in `supabase/migrations`, its links go to real routes, and
  the members it is meant for can use it today.
- When code is built but a founder switch (launch switch, Coming soon, unpublished prices) keeps every real member out, the status
  is **Awaiting founder approval**. The Evidence column says what is built behind the switch.
- When the next blocker after approval is a key or a provider, the status is **Awaiting configuration** (keys or settings the
  company controls: OpenAI, Resend, Parallel/Exa, webhook secrets) or **Awaiting external providers** (live audio, recording or
  transcription, SMS, production document storage, Stripe Financial Connections approval, live filings).
- Membership gates: In Love pages use `requireExperience("relationships")`, In Business pages `requireExperience("business")`, The
  Art of Becoming pages `requireExperience("counseling")` (`src/lib/auth.ts:121`), and Connect pages `requirePaidAccess`
  (`src/lib/auth.ts:143`). CONNECT 360 requires Executive or higher (`src/lib/gate.ts:66`). No real member holds a paid or Executive
  membership until `payments_live` is on, so pages that need a paid membership are effectively limited to staff, owner test
  sessions and the QA account.

## Summary

| Status | Routes | Features with no route | Total |
|---|---:|---:|---:|
| Fully functional | 120 | 0 | 120 |
| Partially functional | 20 | 0 | 20 |
| Database-only | 0 | 5 | 5 |
| Interface-only | 1 | 0 | 1 |
| Disconnected from intended destination | 3 | 0 | 3 |
| Duplicated | 2 | 0 | 2 |
| Awaiting configuration | 11 | 0 | 11 |
| Awaiting founder approval | 61 | 0 | 61 |
| Awaiting external providers | 9 | 0 | 9 |
| Not yet implemented | 2 | 9 | 11 |
| **Total** | **229** | **14** | **243** |

The 120 fully functional routes include 53 Owner Portal pages and tools, plus account, information and utility routes. Of the 110
member-area routes (`/app/*`), only 35 are fully functional for a real member today: 44 are built but closed by a launch switch,
a Coming soon setting or the lack of paid memberships before live payments, and 16 are partially functional. Additional
duplicates that are not counted as a route's primary status are listed under "Dead links and duplicates".

## Public site (`src/app/(site)`)

| Route | Feature | Status | Evidence (file:line or reason) | Next step |
|---|---|---|---|---|
| `/` | Public Home, waitlist | Partially functional | Waitlist works (`WaitlistForm` → `actions/waitlist`); enrollment is closed by `registrations_open` (`(site)/page.tsx:282`) | Founder opens enrollment |
| `/life` | In Life overview | Fully functional | `ExperiencePage`, information only | — |
| `/love` | In Love overview | Fully functional | `ExperiencePage`, information only | — |
| `/business` | In Business overview | Fully functional | `ExperiencePage`, information only | — |
| `/business/explore` | Explore before you join | Fully functional | Reads feature status chips (`business/explore/page.tsx:27`) | — |
| `/elite` | Elite Concierge (public) | Fully functional | Information from the DB; links to `/join/elite` | — |
| `/emotional-intelligence` | Emotional Intelligence | Fully functional | Static content | — |
| `/emotional-intelligence/[area]` | Emotional Intelligence areas and scenarios | Fully functional | `actions/emotional-intelligence` | — |
| `/inside-preview` | Owner preview index | Fully functional | Owner only; lists every preview page | — |
| `/legal` | Legal directory | Awaiting founder approval | Documents are not in effect until attorney approval (`legal/[slug]/page.tsx:39`) | Attorney review, then publish |
| `/legal/[slug]` | Legal document | Awaiting founder approval | Same as above | Same |
| `/membership` | Memberships and builder | Awaiting founder approval | "Membership enrollment opens soon" (`membership/page.tsx:45`). No Couples upgrade price (membership-structure audit) | Set the Couples upgrade price; open payments |
| `/professionals` | For professionals | Fully functional | "Packages will be announced soon" when none are published (`professionals/page.tsx:115`) | Publish professional packages |
| `/professionals/apply` | Professional application | Awaiting founder approval | `counselor_applications_open` off. The interest form works (`actions/professionals`) | Open applications |
| `/search` | Site search (rule-based) | Fully functional | `searchEntries` over `search-index` (`search/page.tsx:27`). One of three search engines (see duplicates) | Merge with Ask Journey |
| `/webinars` | The Knowledge Exchange (public) | Partially functional | Lists only approved webinars, and there are none yet (`webinars/page.tsx:50`) | Approve the first webinars |
| `/webinars/[id]` | Webinar detail | Partially functional | Registration sends people to `/app/business/learn`, which needs `business_live` | Open In Business |
| `/wellness` | Crisis resources | Fully functional | Static. In-house counseling shown as Coming soon | — |
| `/what-we-offer` | Feature directory and What's New | Fully functional | Respects `section_status` (`what-we-offer/page.tsx:18`) | — |

## Account and enrollment (`src/app/(auth)`, `src/app/auth`)

| Route | Feature | Status | Evidence | Next step |
|---|---|---|---|---|
| `/sign-in` | Sign in | Fully functional | `AuthForms` → `actions/auth` | — |
| `/forgot-password` | Password reset request | Fully functional | `RecoveryForms`. Email goes through Supabase SMTP and Resend | Confirm Resend is configured in production |
| `/reset-password` | Set a new password | Fully functional | `RecoveryForms` | — |
| `/confirm-link` | Email link confirmation | Fully functional | `RecoveryForms`. Not linked from the app (reached from email) | — |
| `/mfa/setup` | Two-factor setup | Fully functional | `MfaForms` | — |
| `/mfa/verify` | Two-factor check | Fully functional | `MfaForms` | — |
| `/join` | Enrollment | Awaiting founder approval | `registrations_open` off (`join/page.tsx:33`). Only owners and allowlisted testers get in | Open enrollment |
| `/join/free` | Free account | Awaiting founder approval | Same switch | Same |
| `/join/business` | Business account | Awaiting founder approval | Same switch, plus `free_business_accounts_open` | Same |
| `/join/elite` | Elite application entry | Awaiting founder approval | Same switch | Same |
| `/auth/callback` | OAuth/email callback | Fully functional | Route handler | — |
| `/auth/sign-out` | Sign out | Fully functional | Route handler | — |

## Home and navigation (member area)

| Route | Feature | Status | Evidence | Next step |
|---|---|---|---|---|
| `/app` | Member Home | Partially functional | Three search entries on one screen: Ask Journey (`app/page.tsx:85`), DashboardHub search (`DashboardHub.tsx:38`) and the header `SiteSearch`. The experience cards show "Opening soon" for The Art of Becoming when `counseling_live` is off (`app/page.tsx:152`) | Keep one primary search; fix the counseling gate |
| `/app/connections` | Connect hub | Fully functional | Uses `GatedLink` doors with the upgrade pop-up (`connections/page.tsx`) | — |
| `/app/world` | My World | Fully functional | Counts from real tables (`world/page.tsx:25-33`) | — |
| `/app/explore` | Everything available to me | Partially functional | Built from legacy `NAV` groups labelled "Relationships", "Professional" and "Counseling" (`nav.ts:53,77,113`), not In Love or In Business | Regroup under the registry names |
| `/app/life` | In Life hub | Fully functional | Doors to existing routes | — |
| `/app/discover` | Discover What's Possible | Fully functional | `trial_available` RPC with preference-based offers | — |
| `/app/unlock` | Membership-aware upgrade pop-up (directive 36) | Fully functional | `UnlockPrompt`; target of every gate redirect | — |
| `/app/onboarding` | Complete my membership | Awaiting founder approval | Checkout disabled without `payments_live` (`onboarding/page.tsx`) | Founder authorizes payments |
| `/app/message-center` | Message Center | Fully functional | `actions/message-center` | — |
| `/app/assist` | Help and suggestions | Fully functional | `actions/assist` | — |
| `/app/support` | Support | Fully functional | `actions/support` | — |
| `/app/qa` | QA experience switcher | Fully functional | QA account only (`actions/qa-switcher`) | — |
| `/app/qa/participants` | QA cast | Fully functional | QA only; RPC-backed | — |

## Journey

| Route | Feature | Status | Evidence | Next step |
|---|---|---|---|---|
| `/app/journey` | Talk with Journey (text) | Awaiting configuration | `JourneyChat` → `/api/journey/message`. Needs the OpenAI key plus a paid membership with a dollar allowance (migration `20270206000001`) | Apply the allowance migration; verify OpenAI in production |
| `/app/journey/voice` | Journey Live (voice) | Awaiting founder approval | Coming soon in `section_status`. Page title is "Talk to Journey" (`voice/page.tsx:17`), not the registry name. Still computes voice minutes (`voice/page.tsx:37-44`), which the new allowance migration sets to null | Rename; move to the dollar balance; then open |
| `/app/journey/customize` | Customize Your Journey | Fully functional | `actions/customize` | — |
| `/app/journey/discover` | Discovery Sessions | Awaiting configuration | `actions/discovery`. The adaptive chat needs OpenAI | Verify OpenAI |
| `/app/journey/discover/[category]` | Discovery Session chat | Awaiting configuration | `DiscoveryChat` | Same |
| `/app/journey/daily` | My Daily Journey | Partially functional | Reads `journey_library` (a view); depends on owner-approved content (`daily/page.tsx:35`) | Approve content |
| `/app/journey/library` | The Journey Library | Partially functional | Sections with no modules show "Coming soon" (`library/page.tsx:41`) | Add modules |
| `/app/journey/sessions` | Private Sessions | Awaiting founder approval | Coming soon. Uses fallback products with "Pricing soon" (`sessions/page.tsx:14-19`); buying needs payments | Set prices; approve |
| `/app/journey/memory` | What Journey remembers | Awaiting founder approval | Coming soon; `actions/journey-member` | Approve |
| `/app/journey/plus` | My Journey allowance / Journey Plus | Partially functional | Coming soon, yet it is the profile menu's "My Journey allowance" (`nav.ts:136`). Still sells message and voice-minute packs (`plus/page.tsx:45-70`), against §5 (dollar balance, no minute conversions). "Journey Plus" is not in the registry | Rebuild as the dollar balance (§5); show the same balance on Home, Journey, Membership and the Owner Portal |
| `/app/journey/check-ins` | Notifications and check-ins | Partially functional | Email only, which needs Resend. Phone and text are disabled as "coming soon" (`check-ins/page.tsx:167-168`). Shown under two names in the nav (`nav.ts:44`, `nav.ts:138`) | SMS provider approval; one name |

## In Life / The Art of Knowing Yourself / The Art of Becoming

| Route | Feature | Status | Evidence | Next step |
|---|---|---|---|---|
| `/app/know-yourself` | The Art of Knowing Yourself (Who Am I?) | Fully functional | `actions/who-am-i` | — |
| `/app/know-yourself/who-am-i/[module]` | Who Am I? modules | Fully functional | `actions/who-am-i`; saves answers and history | — |
| `/app/know-yourself/identity-self-love` | Identity & Self-Love | Fully functional | `CurriculumPage` → `saveLessonAnswers`. Journey analysis needs OpenAI | — |
| `/app/know-yourself/emotional-intelligence` | Emotional Intelligence (member) | Fully functional | `actions/emotional-intelligence` | — |
| `/app/know-yourself/emotional-intelligence/lessons` | Emotional Intelligence lessons | Fully functional | `CurriculumPage` | — |
| `/app/know-yourself/boundaries` | Boundaries & Self-Worth | Fully functional | `actions/know-yourself` | — |
| `/app/know-yourself/love-languages` | Five Love Languages (individual) | Fully functional | `LoveLanguageForm` → `actions/love-languages`. Its "together" link goes to an In Love page that is closed (`love-languages/page.tsx:45`) | Hide or explain the link while In Love is closed |
| `/app/know-yourself/learn` | Lessons | Fully functional | Static reading, no saving | — |
| `/app/know-yourself/growth` | My growth plan | Fully functional | `discovery_goals` and `discovery_history` (first answer vs latest) | — |
| `/app/know-yourself/portfolio` | My Personal Discovery Portfolio | Fully functional | `actions/portfolio`, `actions/discovery`, `GrowthPanel`. The Journey version needs OpenAI | — |
| `/app/know-yourself/portfolio/reports/[id]` | Growth reflection report | Fully functional | `growth_report_request` RPC | — |
| `/app/sanctuary` | My Daily Sanctuary | Partially functional | Shows `AwaitingContent` until starter content is approved (`sanctuary/page.tsx:42,100`) | Founder approves starter content |
| `/app/sanctuary/week` | Sanctuary week | Partially functional | Same (`week/page.tsx:60`) | Same |
| `/app/sanctuary/library` | Sanctuary library | Partially functional | Lists only approved content | Same |
| `/app/sanctuary/library/[id]` | Sanctuary lesson | Partially functional | `actions/sanctuary` | Same |
| `/app/sanctuary/vision` | My Vision Board | Fully functional | `actions/sanctuary` | — |
| `/app/sanctuary/becoming` | Who Am I Becoming? | Fully functional | `actions/circle` (goals) | — |
| `/app/sanctuary/settings` | Sanctuary reminders | Fully functional | `actions/sanctuary`; email needs Resend | — |
| `/app/sanctuary/discover` | Sanctuary discovery | Fully functional | `actions/sanctuary` | — |
| `/app/circle` | The Becoming Circle | Partially functional | Written discussions work. "Live audio … coming soon" (`circle/page.tsx:78`) | Live audio provider approval |
| `/app/circle/[id]` | Becoming Circle topic | Partially functional | `actions/circle`, moderation heartbeat; no audio (`circle/[id]/page.tsx:88`) | Same |
| `/app/career` | My Professional Readiness | Fully functional | `actions/resume` | — |
| `/app/career/resume` | Résumé list | Fully functional | `actions/resume` | — |
| `/app/career/resume/[id]` | Résumé editor and approval | Fully functional | `ResumeEditor`. Journey enhancement needs OpenAI and is never offered to free members | — |
| `/app/career/upload/[id]` | Uploaded résumé | Fully functional | `actions/resume` (PDF/DOCX, private storage) | — |
| `/app/launch` | Business Launch Center | Partially functional | Guidance by state. Formation orders are DB-only (`public.formation_orders` is never read); Bizee sandbox only | External filing approval (directive 31) |
| `/app/counseling` | The Art of Becoming (legacy hub) | Disconnected from intended destination | Labelled "Free with every account" (`nav.ts:116`), but the layout calls `requireExperience("counseling")`, which needs `counseling_live` (`counseling/layout.tsx`, `auth.ts:126-131`), so free members are sent to `/app/unlock`. Its component is a copy of In Life (`function InLife`) | Exempt the free counseling experience from the switch, or merge into `/app/life` |
| `/app/counseling/journal` | My private journal | Disconnected from intended destination | Same layout gate; `JournalForm` → `actions/journal` works behind it | Same |
| `/app/counseling/professionals` | Therapy & Counseling Center (old) | Duplicated | Only `redirect("/app/wellness")` (`professionals/page.tsx:5`), and also marked Coming soon | Remove from `section_status` and leave the redirect |

## In Love (all pages are behind `requireExperience("relationships")`, so `relationships_live` must be on)

| Route | Feature | Status | Evidence | Next step |
|---|---|---|---|---|
| `/app/relationships` | In Love home (Singles Discover / Couples) | Awaiting founder approval | Built: `actions/in-love`, discovery RPCs. Discover lists only identity-verified singles, and verification is off, so it is empty even after opening | Open In Love and identity verification |
| `/app/relationships/connections` | Singles connections and interest | Awaiting founder approval | Built: `actions/in-love`, RPC | Same |
| `/app/relationships/profile` | In Love profile and visibility | Awaiting founder approval | Built: `actions/in-love` | Same |
| `/app/relationships/checkin` | Couples daily check-in | Awaiting founder approval | Built: `actions/in-love` | Same |
| `/app/relationships/calendar` | Our Calendar | Awaiting founder approval | Built: `CouplesCalendar` forms, `couple_availability` RPC | Same |
| `/app/relationships/love-languages` | Love languages together | Awaiting founder approval | Built: `partner_love_language` RPC; display only | Same |
| `/app/relationships/onboarding` | Personal Society onboarding | Awaiting founder approval | Built: `StageForm` → `actions/onboarding` | Same |
| `/app/relationships/onboarding/[stage]` | Onboarding stage | Awaiting founder approval | Same | Same |
| `/app/relationships/join` | Accept a partner invitation | Awaiting founder approval | Built: `acceptPartner` | Same |
| `/app/relationships/exclusive` | The Exclusive Connection | Awaiting founder approval | Coming soon in `section_status`, and also behind the switch | Approve |
| `/app/relationships/status` | Relationship status and leaving a couple (directive 47) | Disconnected from intended destination | Directive 47 places it in Settings, but it sits behind the In Love gate, so a business-only member or anyone while In Love is closed cannot reach it. `actions/growth.setRelationshipStatus`/`leaveCouple` work | Move to a member Settings page outside the In Love gate |
| `/app/readiness` | Relationship Readiness Profile | Interface-only | Hard-coded fictional results (`readiness/page.tsx:5-12`). "Personal results … once … scoring is approved" | Approved scoring, then real results |

## In Business and CONNECT 360

In Business pages are behind `requireExperience("business")` (`business/layout.tsx`), so `business_live` must be on. CONNECT 360
pages need Executive or Elite.

| Route | Feature | Status | Evidence | Next step |
|---|---|---|---|---|
| `/app/business` | In Business home | Awaiting founder approval | Built: `actions/business`, RPC | Open In Business |
| `/app/business/onboarding` | Business onboarding | Awaiting founder approval | Built: `actions/business` | Same |
| `/app/business/board` | Business Connection Board | Awaiting founder approval | Built: reads posts with filters | Same |
| `/app/business/board/new` | New board post | Awaiting founder approval | Built: `actions/business` | Same |
| `/app/business/board/[id]` | Board post | Awaiting founder approval | Built: `actions/business` | Same |
| `/app/business/inbox` | Private business inbox | Awaiting founder approval | Built: conversations list | Same |
| `/app/business/inbox/[id]` | Business conversation | Awaiting founder approval | Built: `actions/business`, `actions/connect360` | Same |
| `/app/business/learn` | The Knowledge Exchange (member) | Awaiting founder approval | Built: `actions/webinars`. No approved webinars yet. Hosting status defaults to `coming_soon` (`learn/page.tsx:57`) | Same; approve webinars |
| `/app/business/learn/[id]` | Webinar registration | Awaiting founder approval | Built: `actions/webinars` (Zoom `join_url`) | Same |
| `/app/business/learn/host/new` | Host a webinar | Not yet implemented | "Hosting … opens soon" (`host/new/page.tsx:29`) | Open the hosting feature |
| `/app/business/learn/host/[id]` | Hosted webinar management | Awaiting founder approval | Built: `WebinarForm`, `actions/webinars` | Open hosting |
| `/app/connect360` | CONNECT 360 home | Awaiting founder approval | Built: needs Executive or higher (`connect360/page.tsx:17`), and no paid Executive members exist until payments are live | Open payments |
| `/app/connect360/collaborate` | Collaborator directory and introductions | Awaiting founder approval | Built: `actions/connect360`. An approved résumé is required (`professional_ready`, `collaborate/page.tsx:29,70`) | Same |
| `/app/connect360/advisor/[token]` | Advisor invitation acceptance | Fully functional | `acceptAdvisorInvite` | — |
| `/app/connect360/rooms` | Business Deal Rooms | Awaiting founder approval | Built: `createRoom` and related actions | Same |
| `/app/connect360/rooms/[id]` | Deal Room (items, documents, participants) | Awaiting external providers | Documents use testing storage only (`api/vault/upload-url/route.ts:28-31`); production storage is not approved | Approve a production storage provider |
| `/app/connect360/rooms/[id]/meetings/[mid]` | Meeting minutes and recording (directive 48) | Awaiting external providers | Manual minutes and approval work (`actions/meetings`). The record button is disabled without `recordingAvailable` (`meetings/[mid]/page.tsx:148`). Emailing minutes needs Resend; SMS has no provider | Recording/transcription provider and consent approval |
| `/app/connect360/rooms/[id]/meetings/[mid]/print` | Printable minutes | Fully functional | For Executive members who are room participants | — |
| `/app/connect360/proposals` | Strategic Proposal Builder | Awaiting founder approval | Built: `actions/proposals` | Open payments |
| `/app/connect360/proposals/[id]` | Proposal editor | Awaiting founder approval | Built: `ProposalEditor` | Same |
| `/app/connect360/proposals/[id]/print` | Printable proposal | Fully functional | For Executive members with proposals | — |
| `/app/connect360/funding` | Capital & Funding Intelligence Center | Partially functional | Funding projects work (`actions/funding`). No lender network or marketplace (commission and lender tables are DB-only) | Legal review (directive 30) |
| `/app/connect360/funding/[id]` | Funding project | Partially functional | Same | Same |
| `/app/connect360/intelligence` | My Intelligence Office | Awaiting configuration | `actions/intelligence`. Research uses Parallel/Exa, which need keys and an approved research budget (webhooks return 503 `not_configured`). In-depth research is Elite only (`intelligence/page.tsx:55`) | Configure providers; approve the budget |
| `/app/connect360/intelligence/[id]` | Research assignment | Awaiting configuration | Same | Same |

## Connect / social (`requirePaidAccess`: a paid membership or trial)

| Route | Feature | Status | Evidence | Next step |
|---|---|---|---|---|
| `/app/connect` | The Connection Feed | Awaiting founder approval | Built: reads circles and posts. Paid or trial only, and no paid members exist before `payments_live` | Open payments |
| `/app/connect/circles` | Find Your Circle | Awaiting founder approval | Built: `actions/social` | Same |
| `/app/connect/circles/[slug]` | Circle | Awaiting founder approval | Built: `actions/social` (posts, events) | Same |
| `/app/connect/events` | The Connect Calendar | Awaiting founder approval | Built: events list | Same |
| `/app/connect/events/new` | New event | Awaiting founder approval | Built: `actions/social` | Same |
| `/app/connect/events/[id]` | Event | Awaiting founder approval | Built: `actions/social`, RPC, ICS | Same |
| `/app/connect/people` | Find People Like Me | Awaiting founder approval | Built: `actions/social` | Same |
| `/app/connect/members/[id]` | Member profile | Awaiting founder approval | Built: `actions/social` | Same |
| `/app/connect/messages` | Messages | Awaiting founder approval | Built: `actions/social` | Same |
| `/app/connect/messages/[id]` | Conversation | Awaiting founder approval | Built: `actions/social` | Same |
| `/app/connect/posts/[id]` | Post | Awaiting founder approval | Built: read only | Same |
| `/app/connect/profile` | My profile and photographs | Awaiting founder approval | Built: `actions/social`, RPC | Same |
| `/app/connect/preferences` | My connection preferences | Awaiting founder approval | Built: `actions/social` | Same |

## Wellness and safety

| Route | Feature | Status | Evidence | Next step |
|---|---|---|---|---|
| `/app/wellness` | Counseling & Wellness Center | Partially functional | `actions/wellness` works. Clinical services are "Coming soon" (`wellness/page.tsx:51,58`) | Legal and licensing approval |
| `/app/wellness/art-of-wellness` | The Art of Wellness (in-house counseling) | Not yet implemented | Coming soon placeholder (`art-of-wellness/page.tsx:26`). Counseling `appointments`, `availability`, `fees` and `session_notes` tables are never used | Legal, licensing and privacy approval |
| `/app/safety` | Privacy and safety | Fully functional | `SafetyForms` → `actions/safety`, `AppealForm` | — |
| `/app/verify` | Identity verification | Awaiting founder approval | `identity_verification_live` off (`api/identity/start/route.ts:18`). Stripe Identity charges per verification | Founder approval |

## Membership and billing

| Route | Feature | Status | Evidence | Next step |
|---|---|---|---|---|
| `/app/membership` | Membership and billing | Awaiting founder approval | `payments_live` off. Change, cancel and card routes return 403 or work in Stripe test mode only | Founder authorizes live payments |
| `/app/elite` | Elite Concierge (member) | Fully functional | `actions/elite` | — |
| `/app/elite/eligibility` | Elite eligibility and verification | Awaiting external providers | Screening works. Bank verification uses Stripe Financial Connections, which needs purpose approval (directive 27). The priority fee needs Stripe Checkout | Stripe approval; live payments |

## Owner Portal (`src/app/admin`, staff only)

| Route | Feature | Status | Evidence | Next step |
|---|---|---|---|---|
| `/admin` | Owner dashboard | Fully functional | Launch switch and queue overview | — |
| `/admin/access` | Access grants | Fully functional | `actions/admin` | — |
| `/admin/analytics` | Analytics | Fully functional | RPC-backed | — |
| `/admin/assist` | Assistance Center | Fully functional | `actions/assist` | — |
| `/admin/audit` | Audit trail | Fully functional | Read only; empty-state message if the table is missing (`audit/page.tsx:60`) | — |
| `/admin/brand` | Brand Terminology Registry | Fully functional | Read-only view of `brand.ts` with pending decisions | — |
| `/admin/business` | In Business administration | Fully functional | `actions/business-admin` | — |
| `/admin/circle` | Becoming Circle administration | Fully functional | `actions/circle-admin` | — |
| `/admin/circle/live` | Live Q&A schedule (directive 43) | Partially functional | `actions/live-admin`. Sessions are written only; live audio awaits a provider | Live audio provider |
| `/admin/counselors` | Professional applications | Fully functional | `actions/admin` | — |
| `/admin/curriculum` | Curriculum Studio | Fully functional | DB | — |
| `/admin/curriculum/[section]` | Curriculum section | Fully functional | `actions/curriculum` | — |
| `/admin/curriculum/sanctuary` | Sanctuary content | Fully functional | `actions/sanctuary-admin` | Approve starter content |
| `/admin/curriculum/sanctuary/[id]` | Sanctuary item | Fully functional | `actions/sanctuary-admin` | — |
| `/admin/curriculum/sources` | Dated source library (directive 22) | Fully functional | `actions/sources-admin` | — |
| `/admin/development` | Development tracker | Fully functional | `dev_tracker`, `actions/journey-admin` | — |
| `/admin/elite` | Elite administration | Fully functional | `actions/elite` | — |
| `/admin/elite/verification` | Elite verification review | Fully functional | `actions/elite`; identity switch shown | — |
| `/admin/forbidden` | No access | Fully functional | Static | — |
| `/admin/intelligence` | Intelligence providers | Awaiting configuration | `IntelConnections`, `IntelSelfTest`; Parallel/Exa keys | Configure providers |
| `/admin/journey` | Journey Intelligence Center | Fully functional | `actions/journey-admin`, `checkins`, `customize`. Says phone and text "not yet available" (`journey/page.tsx:243`) | Show the §5 dollar allowances here |
| `/admin/journey/evaluations` | Journey evaluations | Fully functional | `EvalRunner` | — |
| `/admin/journey/models` | Model comparison | Fully functional | `actions/journey-admin` | — |
| `/admin/journey/personality` | Master Blueprint (directive 07) | Awaiting founder approval | Draft version 1, not published | Founder publishes |
| `/admin/journey/quality` | Quality runner | Fully functional | `QualityRunner` | — |
| `/admin/journey/review` | Training review | Fully functional | `actions/journey-training` | — |
| `/admin/journey/training` | Training categories | Fully functional | `actions/journey-training` | — |
| `/admin/journey/training/[category]` | Training category | Fully functional | `actions/journey-training` | — |
| `/admin/launch-center` | Business Launch Center administration | Fully functional | `actions/business-launch` | — |
| `/admin/launch` | Launch readiness (integrations, switches) | Fully functional | Read-only checklist | — |
| `/admin/legal` | Legal documents | Fully functional | DB | — |
| `/admin/legal/[slug]` | Legal document versions | Fully functional | `actions/legal` | — |
| `/admin/legal/[slug]/print` | Printable legal document | Fully functional | — | — |
| `/admin/legal/acceptances` | Acceptances | Fully functional | Search by email | — |
| `/admin/legal/audit` | Legal audit | Fully functional | DB | — |
| `/admin/legal/compliance` | Compliance decisions | Fully functional | `actions/legal` | — |
| `/admin/marketing` | Marketing | Fully functional | `actions/admin`; marketing email off until launch | — |
| `/admin/members` | Members | Fully functional | `actions/admin` | — |
| `/admin/memberships` | Subscriptions | Fully functional | Read only; empty until payments | — |
| `/admin/moderation` | Moderation | Fully functional | `actions/admin` | — |
| `/admin/preview` | Member view preview | Fully functional | Launch switch states | — |
| `/admin/pricing` | Pricing | Fully functional | `actions/pricing`; Couples upgrade price unset | Founder sets the price |
| `/admin/qa` | Quality Assurance Center | Fully functional | `actions/owner-test` | — |
| `/admin/qa/[key]` | QA feature checklist | Fully functional | `actions/qa`, screenshots | — |
| `/admin/qa/readiness` | Launch readiness (QA) | Duplicated | Same title as `/admin/launch` (`qa/readiness/page.tsx:35` vs `launch/page.tsx:121`); reads the same `dev_tracker` as `/admin/development` | Merge into one Launch readiness page |
| `/admin/reports` | Financial reports | Fully functional | Empty until live payments | — |
| `/admin/revenue` | Revenue and refunds | Fully functional | `actions/admin` | — |
| `/admin/reviews` | Page reviews and Coming soon | Fully functional | `actions/review` → `section_status` | — |
| `/admin/safety` | Safety | Fully functional | `actions/admin`, `journey-admin` | — |
| `/admin/security` | Security | Fully functional | `actions/admin`, RPC | — |
| `/admin/settings` | Launch Controls (switches) | Fully functional | `actions/admin`; typed AUTHORIZE confirmation | — |
| `/admin/social` | Social administration | Fully functional | `actions/social` | — |
| `/admin/social/previews` | Inside Connect previews | Fully functional | `actions/sanctuary-admin` | — |
| `/admin/support` | Support queue | Fully functional | `actions/admin` | — |
| `/admin/team` | Team | Fully functional | `actions/admin`, RPC | — |
| `/admin/vault` | Document vault status | Awaiting external providers | AWS testing storage only (`api/vault/*`, `storage_provider = 'aws_testing'`) | Production storage approval |
| `/admin/webinars` | Webinar review | Fully functional | `actions/webinars` | — |

## API routes and other route handlers

| Route | Feature | Status | Evidence | Next step |
|---|---|---|---|---|
| `/api/checkout` | Membership checkout | Awaiting founder approval | 403 without `payments_live`; staff test mode only (`checkout/route.ts:48-53`) | Live payments |
| `/api/membership/change` | Change plan | Awaiting founder approval | 403 without `payments_live` (`change/route.ts:31`) | Same |
| `/api/membership/cancel` | Cancel or resume | Awaiting founder approval | Needs a Stripe subscription; none exist before payments | Same |
| `/api/membership/payment-method` | Card update portal | Awaiting founder approval | Live keys refused without `payments_live` (`payment-method/route.ts:21`) | Same |
| `/api/stripe/webhook` | Stripe webhook | Awaiting configuration | 503 without webhook secrets (`webhook/route.ts:26`) | Live webhook secret at launch |
| `/api/identity/start` | Stripe Identity session | Awaiting founder approval | 403 without `identity_verification_live` (`identity/start/route.ts:18`) | Founder approval |
| `/api/elite/expedited` | Elite priority fee | Awaiting founder approval | Stripe Checkout (`expedited/route.ts`) | Live payments |
| `/api/elite/financial/start` | Stripe Financial Connections | Awaiting external providers | Needs Stripe purpose approval (directive 27) | Stripe approval |
| `/api/elite/financial/complete` | Financial Connections completion | Awaiting external providers | Same | Same |
| `/api/elite/my-data` | Elite data export | Fully functional | — | — |
| `/api/journey/message` | Journey text | Awaiting configuration | `sendJourneyMessage`; OpenAI plus allowance checks | Verify OpenAI; apply migration `20270206000001` |
| `/api/journey/connection` | OpenAI connection check | Fully functional | Owner tool, rate limited | — |
| `/api/journey/voice/start` | Voice session key | Awaiting founder approval | Voice is Coming soon; OpenAI realtime | Approve Journey Live |
| `/api/journey/voice/end` | End voice session | Awaiting founder approval | Same | Same |
| `/api/journey/voice/preview` | Voice previews | Fully functional | Owner and customization previews | — |
| `/api/journey/voice/preview/[voice]` | Voice preview file | Fully functional | — | — |
| `/api/intel/webhooks/parallel` | Parallel webhook | Awaiting configuration | 503 `not_configured` (`parallel/route.ts:13`) | Configure |
| `/api/intel/webhooks/exa` | Exa webhook | Awaiting configuration | 503 `not_configured` (`exa/route.ts:12`) | Configure |
| `/api/cron/checkins` | Reminders, Sanctuary, Circle slots, Elite purge | Awaiting configuration | Needs the cron secret, a scheduler and Resend (`email.ts`: inactive without `RESEND_API_KEY`) | Confirm the scheduled function and email |
| `/api/live/invitation` | Live Q&A invitation | Fully functional | — | — |
| `/api/connect/events/[id]/ics` | Event calendar file | Fully functional | — | — |
| `/api/couples/calendar/[token]` | Couples calendar feed | Fully functional | Token feed (In Love itself is closed) | — |
| `/api/resume/[id]/[format]` | Résumé download | Fully functional | — | — |
| `/api/vault/upload-url` | Document upload | Awaiting external providers | Testing storage only; members refused (`upload-url/route.ts:28-31`) | Production storage |
| `/api/vault/download` | Document download | Awaiting external providers | `aws_testing` only | Same |
| `/api/vault/status` | Scan status | Awaiting external providers | Same | Same |
| `/api/owner/reviewer` | Owner review toggle | Fully functional | — | — |
| `/api/health` | Health check | Fully functional | Reports OpenAI, Stripe and vault config | — |
| `/inside-preview/enter` | Enter or exit owner preview | Fully functional | — | — |
| `/admin/legal/[slug]/download` | Legal download | Fully functional | — | — |
| `/webinars-media/[id]/qr` | Webinar QR code | Fully functional | — | — |

## Features with no route

| Feature (directive) | Status | Evidence | Next step |
|---|---|---|---|
| Opportunity Radar and Application Center (32, 33) | Not yet implemented | In `brand.ts` only; no route, action or screen | Build after the full text of 32 is received |
| Capital Marketplace and Lending API Network (30) | Database-only | `business.commission_ledger`, `commission_rules` and `lender_consents` are never read by the app | Legal review |
| Couples Connection Community (08) | Not yet implemented | No route | Build per the Social Ecosystem blueprint |
| Business & Tax Education Center (22) | Not yet implemented | Only the owner source library (`/admin/curriculum/sources`); no member screen | Build the member center |
| In-house counseling booking (05, The Art of Wellness) | Database-only | `counseling.appointments`, `availability`, `fees` and `session_notes` are never used | Legal and licensing approval |
| Couples private reflections (51 §7) | Database-only | `relationships.private_reflections` and `relationships.assessments` are never used | Build screens |
| Business formation orders (31) | Database-only | `public.formation_orders` and `formation_revenue` are never used | Live filing approval |
| CONNECT 360 watchlist (25) | Database-only | `public.intel_watchlist` is never used | Build or drop |
| Member Settings page (47, 51 §6) | Not yet implemented | No `/app/settings`. Growth frequency lives in `GrowthPanel` (Home and Portfolio); relationship status is behind the In Love gate | Add Settings with growth frequency, relationship status and notifications |
| Growth-update frequency question at enrollment (51 §6) | Not yet implemented | `saveGrowthPrefs` is not called in onboarding or join flows | Add to enrollment |
| Journey credits for free members (51 §4) | Not yet implemented | `/app/journey/plus` is Coming soon and still sells packs by message | After live payments, sell by the dollar |
| Journey Auto-Reload (04) | Not yet implemented | Admin switch and webhook exist; the member page is Coming soon | Approve |
| Live audio for The Becoming Circle and Live Q&A (19, 43) | Not yet implemented | `public.circle_presence` is never used; "coming soon" on the Circle pages | Infrastructure approval |
| SMS and phone notifications (43, 48) | Not yet implemented | Disabled checkboxes (`check-ins/page.tsx:167-168`) | Provider approval |

## Founder directive reconciliation

| # | What it requires | Where implemented | Status | Gap |
|---|---|---|---|---|
| 00 | Journey Philosophy loaded first | `content/journey/philosophy.md`, `src/lib/journey.ts` | Fully functional | — |
| 01 | Personal Society redesign: question registry, onboarding, age rules, Readiness Profile, Exclusive Connection | `src/lib/onboarding.ts`, `/app/relationships/onboarding`, `/app/readiness`, `/app/relationships/exclusive` | Partially functional | Readiness results are fictional; Exclusive is Coming soon; In Love is closed |
| 02 | Journey AI for paid members only, OpenAI, spending controls | `src/lib/journey-server.ts`, `/api/journey/message` | Awaiting configuration | OpenAI in production; no paid members before payments |
| 03 | Allowances, packages, caps, atomic reservation | `20261207000001_journey.sql`, `20270206000001_journey_dollar_allowances.sql` | Partially functional | Member allowance screen is Coming soon and still counts messages and minutes |
| 04 | Voice, member memory, Journey Plus, Auto-Reload | `/app/journey/voice`, `/memory`, `/plus`, `src/lib/journey-voice.ts` | Awaiting founder approval | All four member pages are Coming soon. README still says "Not built yet", which is out of date |
| 05 | Knowledge Library, daily development, Private Sessions, counseling center | `/app/journey/library`, `/daily`, `/sessions`, `/app/wellness/art-of-wellness` | Partially functional | Sessions are Coming soon with no prices; counseling is not built |
| 06 | Voice and tone; self-discovery invitation | Copy across societies | Fully functional | — |
| 07 | Journey Master Blueprint V1.0 | `/admin/journey/personality` (draft) | Awaiting founder approval | Not published; section 10 in progress |
| 08 | Couples Connection Community | none | Not yet implemented | No route |
| 09 | The Connect Calendar | `/app/connect/events*`, ICS route | Awaiting founder approval | Built (README says "not built", which is out of date); paid only |
| 10 | Find Your Circle and Connection Intelligence Engine | `/app/connect/circles*`, `/app/connect/people`, `src/lib/connection-intelligence.ts` | Awaiting founder approval | Built; paid only. README is out of date |
| 11 | Membership value, three directions of connection, Elite integration | `/app/connect/*`, `/app/elite*`, `src/lib/social.ts` | Partially functional | Missing from the README index |
| 12 | Open, specialized and verified Elite circles | `/app/connect/circles`, `/admin/social` | Awaiting founder approval | Missing from the README index |
| 13 | Inclusive community access | Circles open to all eligible; only Elite circles verified | Fully functional | Missing from the README index |
| 14 | Only The Art of Becoming free; everything else paid or trial | `src/lib/auth.ts:76-78,143`, `src/lib/gate.ts` | Partially functional | The free Art of Becoming (`/app/counseling*`) is blocked by `counseling_live` |
| 15 | The Art of Becoming first, never forced | `/app/discover`, `/app/onboarding`, `/join/free` | Awaiting founder approval | Enrollment closed |
| 16 | The Art of Becoming feeds the Connection Intelligence Engine | `ReadinessCard`, `/app/sanctuary/discover` | Partially functional | Member-to-member compatibility not built |
| 17 | My Daily Sanctuary | `/app/sanctuary/*`, `/admin/curriculum/sanctuary` | Partially functional | Starter content awaits founder approval |
| 18 | Discover What's Possible | `/app/discover`, `/admin/social/previews` | Fully functional | — |
| 19 | The Becoming Circle | `/app/circle*`, `/admin/circle` | Partially functional | Phases 2–5; live audio |
| 20 | Paid membership enhancement, Executive Private, Elite Concierge | `/what-we-offer`, `PaidHome`, `EliteHome` | Partially functional | Phases 2–5 |
| 21 | Executive and Elite Signature Services | `/app/elite`, `EliteHome` | Not yet implemented | News source and concierge staffing need approval |
| 22 | Business & Tax Education Center | `/admin/curriculum/sources` only | Not yet implemented | No member screen |
| 23 | Premium membership implementation | CONNECT 360, Journey cost controls | Partially functional | Executive Office and Tax Education are incomplete |
| 24 | CONNECT 360 Phase One | `/app/connect360/*`, `src/lib/connect360.ts` | Awaiting founder approval | Built for Executive members; no paid Executive members before payments |
| 25 | Global Opportunity Intelligence | `/app/connect360/intelligence*`, `src/lib/intel-engine.ts` | Awaiting configuration | Research budget approval; watchlist table unused |
| 26 | Dual Intelligence (Parallel and Exa) | `src/lib/intel-providers.ts`, `/api/intel/webhooks/*`, `/admin/intelligence` | Awaiting configuration | Keys; nothing paid is active |
| 27 | Business credibility, proof of funds | `/app/elite/eligibility`, `/api/elite/financial/*` | Awaiting external providers | Stripe purpose approval |
| 28 | Strategic Business Development Suite | `/app/connect360/proposals*`, Deal Rooms | Awaiting founder approval | No e-signature (by design) |
| 29 | Capital & Funding Intelligence Center | `/app/connect360/funding*` | Partially functional | Affiliate disclosure needs checking; no lender network |
| 30 | Capital Marketplace and lending network | DB tables only | Database-only | Legal review |
| 31 | Career and Business Launch Center | `/app/career*`, `/app/launch`, `/admin/launch-center` | Partially functional | Bizee sandbox; no live filings |
| 32 | Opportunity Radar and Application Assistance | none | Not yet implemented | Full text pending |
| 33 | Professional credibility and readiness | `/app/career*`, `professional_ready` RPC | Partially functional | Radar part not built |
| 34 | Mandatory professional résumé (Executive and Elite) | `/app/career*`; required before introductions (`collaborate/page.tsx:70`) | Fully functional | — |
| 35 | Four destinations: Home · Connect · Journey · My World | `MEMBER_TABS`, `DesktopNav.tsx` | Partially functional | `/app/explore` and `NAV` still use the old seven groups |
| 36 | Membership-aware upgrade pop-up, no silent redirects | `components/Upgrade`, `/app/unlock`, `auth.ts:131` | Partially functional | Ask Journey sends locked results to `/membership#build` instead of the pop-up |
| 37 | Brand Terminology Standard | `src/lib/brand.ts`, `tests/brand.test.ts` | Partially functional | "Talk to Journey" vs Journey Live; "Journey Plus" and "Private business inbox" are not in the registry; old group labels |
| 38 | In Love experience | `/app/relationships/*`, `src/app/actions/in-love.ts` | Awaiting founder approval | `relationships_live` and identity verification are off |
| 39 | Executive and Elite distinctions | `MembershipEmblem`, `public.member_marks` | Fully functional | — |
| 40 | Identity vs membership marks | `src/lib/member-marks.ts`, `/app/verify` | Fully functional | Identity verification itself is off |
| 41 | Final naming | `src/lib/brand.ts` | Fully functional | — |
| 42 | Intelligent membership recommendations | `src/lib/recommend.ts`, `gate-server.ts` | Fully functional | Couples upgrade price unset |
| 43 | Live Q&A and Message Center | `/admin/circle/live`, `LiveInvite`, `/app/message-center`, `/api/live/invitation` | Partially functional | Written only; no live audio; no SMS |
| 44 | Progressive membership benefits | `src/lib/recommend.ts`, `tests/recommend.test.ts`, `20270201100001_couples_level_up.sql` | Fully functional | — |
| 45 | Lifelong growth, milestones, Journey continuity | `actions/growth.ts`, `GrowthPanel`, `/app/know-yourself/portfolio*`, `/growth` | Partially functional | Frequency not asked at enrollment; no Settings page |
| 46 | Lifelong couples, professional independence | `20270201100001_couples_level_up.sql`, `journey_effective_tier` | Partially functional | Date nights, engagement and anniversary content not built; In Love closed |
| 47 | Relationship transitions | `/app/relationships/status`, `leave_couple` RPC | Disconnected from intended destination | Not in Settings; behind the In Love gate |
| 48 | Deal Room minutes and recording controls | `/app/connect360/rooms/[id]/meetings/*`, `actions/meetings.ts` | Awaiting external providers | Recording and transcription; SMS |
| 49 | Journey pre-launch QA testing | `20270205000001_qa_journey_testing.sql`, `/admin/qa/readiness` | Fully functional | Owner switch |
| 50 | — | No file | — | Number 50 is skipped in `docs/founder-directives`; confirm with the founder |
| 51 | Platform correction (inventory, luxury, Home, revenue, Journey allowances, In Life, In Love, In Business) | This file; `20270206000001_journey_dollar_allowances.sql`; `DashboardHub.tsx:37` | Partially functional | §3 competing searches; §4 free Journey credits; §5 one balance across surfaces and a Journey Plus rewrite; §6 enrollment frequency and Settings; §7 private reflections and milestones; §8 recording and storage |

## Dead links and duplicates

### Dead links

Every string literal path (`"/app/…"`, `"/admin/…"` and so on, 1,565 references in `src` and `content`) and every template-literal
path was checked against the 229 routes, with dynamic segments matched. **No hrefs point to routes that do not exist.** Links that
reach an existing route but not the intended experience:

- `/app/counseling` and `/app/counseling/journal`: the nav (`nav.ts:116-117`) and the In Life copy call them free, but
  `counseling_live` sends free members to `/app/unlock`.
- `/app/know-yourself/love-languages` → `/app/relationships/love-languages` (`love-languages/page.tsx:45`): free or business-only
  members land on the upgrade page, and everyone does while In Love is closed.
- Profile menu "My Journey allowance" → `/app/journey/plus` (`nav.ts:136`): a Coming soon page, so members have no allowance
  balance page.
- Nav "Journey Live" (`nav.ts:105`) → a page titled "Talk to Journey". The label "Talk to Journey" goes to `/app/journey/voice` in
  `JourneyOrbHero.tsx:19` and Ask Journey, but to `/app/journey` (text) in `connect/page.tsx:70`.
- `/app/counseling/professionals`: an owner Coming soon entry for a page that only redirects to `/app/wellness`.
- Routes reached only from outside the app (email, webhooks, cron), which is expected: `/confirm-link`, `/auth/callback`,
  `/api/stripe/webhook`, `/api/cron/checkins`, `/api/health`, `/api/intel/webhooks/parallel`, `/api/journey/connection`,
  `/app/connect360/advisor/[token]` and `/api/couples/calendar/[token]` (token links are built from `env.siteUrl`).

### Duplicated features and competing entry points

1. **Search (directive 51 §3).** Member Home shows Ask Journey (`AskJourney.tsx`, using `src/lib/concierge.ts` routing),
   DashboardHub's "primary search" (`DashboardHub.tsx:38` → `/search`) and the header `SiteSearch`. The mobile menu has a fourth
   (`MobileMenu.tsx:45`). That is two separate engines, `concierge.route` and `search-index`. Member searches also open the public
   `/search` page outside the member shell.
2. **The Art of Becoming / In Life.** `/app/life` (In Life hub) and `/app/counseling` (component also named `InLife`) offer
   overlapping doors. The name "The Art of Becoming" is used for `/life`, `/app/counseling` and the free tier.
3. **Counseling.** `/app/wellness`, `/app/counseling`, `/app/counseling/professionals` (a redirect) and `/app/wellness/art-of-wellness`.
4. **"Connections".** `/app/connections` (Connect hub), `/app/connect` (Connection Feed) and `/app/relationships/connections`
   (In Love) have nearly the same names.
5. **Discovery.** `/app/discover` (Discover What's Possible), `/app/journey/discover` (Discovery Sessions) and
   `/app/sanctuary/discover`.
6. **Libraries and lessons.** `/app/journey/library`, `/app/sanctuary/library` and `/app/know-yourself/learn`.
7. **Emotional Intelligence.** Public `/emotional-intelligence`, member `/app/know-yourself/emotional-intelligence` and
   `/app/know-yourself/emotional-intelligence/lessons`, all linked from the nav (`nav.ts:38-40`).
8. **One page, two names.** `/app/journey/check-ins` is "Manifestation & Intentional Living" (`nav.ts:44`) and "Notifications &
   check-ins" (`nav.ts:138`).
9. **Feature directories.** `/what-we-offer` (FeatureDirectory), `/app/explore` (legacy NAV groups) and DashboardHub's "every space
   one tap away".
10. **Owner Portal.** `/admin/launch` and `/admin/qa/readiness` are both titled "Launch readiness". `/admin/development`, `/admin/qa`
    and `/admin/qa/readiness` all read `dev_tracker`. `/admin/settings` holds the switches that `/admin/launch` reports.
11. **Love languages.** `/app/know-yourself/love-languages` (individual) and `/app/relationships/love-languages` (together). They
    complement each other but are reached through different gates.

### Pages without a clear next action

- `/app/readiness`: shows fictional results with no way to get real ones.
- `/app/wellness/art-of-wellness`: Coming soon with no alternative beyond the link back.
- `/app/business/learn/host/new`: "opens soon" with only "register your interest".
- `/app/journey/plus` (when opened by staff): shows "Pricing soon" on every pack, with no purchase or balance.
- Sanctuary pages with `AwaitingContent` until starter content is approved.
