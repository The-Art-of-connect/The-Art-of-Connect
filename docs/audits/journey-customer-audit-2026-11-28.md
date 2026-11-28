# Journey customer audit, November 28, 2026: findings and status

Journey reviewed all six memberships with the fictional QA account (qa.journey@example.com) on desktop.

## Fixed in this round
| Finding | Cause | Correction |
|---|---|---|
| Journey text disabled in all six tiers; Elite showed "unlimited" on Home but "0 remaining" elsewhere | Journey answers only memberships with a paid amount above $0; the QA account's complimentary membership is $0 | The owner-listed QA account counts for Journey, still within the company Journey limit. Real members are unchanged |
| In Love, In Business, Relationship Readiness, Love Languages, Couples Calendar, Business Board and Inbox returned to Home | Intentional: In Love and In Business are not open to members yet (launch switches off), and the redirect gave no reason | The QA account previews these areas with a "Preview" banner. Members sent back now see "In Love is opening soon" with next steps |
| CONNECT 360 called "Business collaborators" on Connect and "Research" on My World | Inconsistent labels | "CONNECT 360" and "My Intelligence Office" everywhere |
| Searching "My Intelligence Office" surfaced Emotional Intelligence | CONNECT 360 pages were missing from search | Six CONNECT 360 entries added |
| Unlabeled topic dropdown, no sample request, In-depth unexplained | Form design | Visible labels, a sample request, and a description of Standard and In-depth |
| Two level-one headings on Home | Home hero plus welcome panel | One heading per page |

## Intentionally disabled (owner decision required)
- In Love and In Business for real members: launch switches in Owner Portal, Launch Controls.
- Live payments, public enrollment, production document storage.
- Journey credit purchase for Free members: needs live payments (Stripe Sandbox test first).

## Still under development
- Journey Voice and Private Sessions (marked Coming soon).
- Couples partner invitation and shared space states (Invite partner, Invitation pending, Open shared space).
- In-house counseling, live audio in The Becoming Circle, phone and text check-ins.
- Free Journey credits with price, coverage and balance shown before purchase.

## Next round (recommended order)
1. Journey re-checks Journey replies and "Take me to My Intelligence Office" routing with the QA account.
2. Couples entry states and a Singles starting point with readiness status.
3. Empty Messages and empty Portfolio sections link to the next step.
4. Fewer repeated Journey prompts in lessons; mobile and contrast check.
5. One fictional research assignment end to end (request, research, citations, delivery) within the $5 daily testing limit.
