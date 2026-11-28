/**
 * The owner's request to Stripe for review and approval of our business model and our Stripe Identity,
 * Financial Connections and Payments use cases. Kept in code so the Stripe Verification Center always shows
 * the current version. Facts here must match how the platform actually works.
 */
export const STRIPE_APPROVAL_REQUEST_VERSION = "2026-11-26";

export const STRIPE_APPROVAL_REQUEST: { heading: string; body: string[] }[] = [
  { heading: "Request", body: [
    "The Art of Connect, LLC (United States) requests Stripe's review and written approval of (1) our business categories, including online dating and matchmaking, (2) our use of Stripe Identity, (3) our Authorized Purpose and consent screen for Stripe Financial Connections, and (4) our use of Stripe Payments and Billing, as described below.",
    "Nothing described here is live: all verification and payment features run only in Stripe test mode until we receive approval and our founder authorizes launch.",
  ]},
  { heading: "1. Our business", body: [
    "The Art of Connect is a private, adults-only membership platform (theartofconnect.com) for intentional connection In Business, In Life and In Love. Every member is 21 or older; singles matchmaking is limited to members 30 or older.",
    "Business networking: The Professional Society, a Business Connection Board and private business messaging for entrepreneurs and professionals.",
    "Personal development: The Art of Knowing Yourself, self-guided curricula (identity, emotional intelligence) and Journey, an AI personal-growth companion. Journey is not therapy, gives no clinical, legal or financial advice, and directs anyone in crisis to emergency resources.",
    "Dating and matchmaking: opt-in singles matchmaking (30+) and a couples experience, with identity verification, blocking, reporting and moderation.",
    "Elite Concierge Society: a by-invitation-only membership distinction for verified, accomplished members (described in section 4).",
    "Planned counseling services (not launched): a directory and booking service for independently licensed counselors. These services are disabled and will not launch until legal and professional approvals are obtained. Counselors will be independent licensed providers who are responsible for their own clinical records. The platform will not send health information to Stripe Identity or Financial Connections, and Stripe will be used only to process session payments.",
    "We do not offer adult content or services, escort services, gambling, lending, credit, insurance, housing or employment decisions.",
  ]},
  { heading: "2. Stripe Payments and Billing", body: [
    "Monthly and annual memberships through Stripe Checkout and Billing, with clear pricing, renewal terms and self-service cancellation; no negative-option or hidden-price practices.",
    "One-time purchases: Journey message and session packages, and an optional Elite expedited verification fee (proposed $995). The fee buys a faster review, never admission, and is offered only to applicants who first pass a preliminary eligibility screening.",
    "Future: payments for counseling sessions with licensed providers, only after those services are approved and launched.",
  ]},
  { heading: "3. Stripe Identity", body: [
    "Purpose: trust and safety, meaning confirming that members are real adults, preventing fraud, impersonation and catfishing, and enforcing minimum ages (21+, and 30+ for singles matchmaking). Identity is also required before an Elite invitation.",
    "Checks: government-issued ID document, date of birth and a live selfie match. We do not collect Social Security numbers.",
    "Data handling: Stripe holds the ID images and extracted data. The platform stores only the outcome (verified or not, and whether the minimum age is met) and never shows it to other members, apart from a \"verified\" indicator.",
    "Alternatives: a member who declines the selfie, or where law requires it, can choose private document review by our founder instead. Those documents are kept in private storage that only the founder can open, and are deleted after review.",
    "Not used for: credit, insurance, housing, employment or any FCRA permissible purpose; minors; resale; or health information.",
  ]},
  { heading: "4. Stripe Financial Connections: proposed Authorized Purpose", body: [
    "Authorized Purpose: \"With the member's express consent, confirm ownership of the member's bank account and summarize current balances and the available transaction history as supporting evidence for a private, founder-reviewed membership distinction (Elite Concierge). Only summaries are kept, visible only to the founder and the member, deleted after review, and never sold, shared or used for marketing.\"",
    "Permissions requested: ownership, balances and transactions. We do not request payment_method. The account holder name is compared with the member's Stripe Identity-verified name. From transactions, only the total and count of deposits and the date range covered are kept; individual transactions are never stored.",
    "Limits on use: deposits are never treated as verified income and balances are never treated as net worth. Partial history (Stripe provides up to about 180 days) is never presented as annual income. Income, business ownership, net worth and professional qualifications require documents and the founder's manual review. The only automatic rule we may adopt, subject to the founder's approval, treats balances on cash and investment accounts owned by the verified member as evidence of investable assets meeting a stated threshold.",
    "Eligibility never considers race, gender, disability, medical history or counseling participation. Elite status is a voluntary membership distinction, not a decision on credit, insurance, housing or employment, and the data is never used as or to create a consumer report.",
    "Consent: before Stripe's flow opens, the member must check a box that states the data received, the purpose, who can see it, retention, and their right to disconnect. Consent version and time are recorded and kept for at least 24 months.",
    "Retention and access: accounts are disconnected at Stripe once the one-time snapshot is collected, and summaries are erased automatically after the review window (90 days by default). Members can view and download their own information, request corrections, and disconnect and erase at any time.",
    "Security: summaries are stored in our database with row-level security and column-level restrictions so that only the founder and the member can read amounts. Secrets are held only on the server, and every owner action is audit-logged.",
  ]},
  { heading: "5. Safety and compliance", body: [
    "Adults only, with age enforced at registration and by Stripe Identity. Singles matchmaking is opt-in and 30+, and Elite dating participation is never automatic.",
    "Blocking, reporting, moderation, a published safety center and crisis resources are in place.",
    "Published terms, privacy policy, cancellation and refund policies are available through the platform's Legal Center.",
  ]},
  { heading: "6. Questions for Stripe", body: [
    "Does our account's approval cover online dating and matchmaking, and may Stripe Identity be used in that context?",
    "Is the Financial Connections Authorized Purpose above approved as written, or what changes do you require?",
    "Is the $1.50 instant bank verification fee charged for data-only Financial Connections sessions that do not request payment_method?",
    "Is anything further required before future counseling-session payments with independent licensed providers?",
  ]},
  { heading: "Contact", body: [
    "The Art of Connect, LLC · info@theartofconnect.com · theartofconnect.com",
  ]},
];

export const approvalRequestText = () =>
  [`Stripe approval request: The Art of Connect, LLC (version ${STRIPE_APPROVAL_REQUEST_VERSION})`, "",
    ...STRIPE_APPROVAL_REQUEST.flatMap((s) => [s.heading, ...s.body.map((b) => `- ${b}`), ""])].join("\n");
