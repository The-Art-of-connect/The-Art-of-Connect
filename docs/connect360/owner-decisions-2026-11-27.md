# Owner decisions of November 27, 2026: what was done and what's needed from you

_Prepared by Peace. Full research reports, with a source for each claim, are in `docs/research/`. **Research caveat:** this session's network blocked most provider and state websites. Most findings therefore come from search-result excerpts of official pages and must be checked on the live pages before you sign or approve anything. Each report marks which facts were read directly._

## 1. Research testing budget: implemented

- **Company limits:** $25 a month and $5 a day, recorded in the database with your approval note.
- **Ceiling:** while "testing only" is on, the database refuses any limit above $25 a month or $5 a day, so a mistyped figure can't raise spending.
- **Who research can run for:** only test accounts and staff while in testing. Real members are refused with `testing_only`.
- **Per-member limits:** Executive $15 and Elite $60 a month, for planning and testing only.
- **Hard controls:** every provider call must pass the spending check before it is made. This covers division on/off, emergency stop, company daily and monthly limits, per-assignment, per-member and stage limits, and requires a positive cost estimate.
- **Automatic top-ups:** these are provider account settings. When you open the accounts, **leave auto-reload off at Parallel and auto-recharge off at Exa**. At Exa, also set a $20 budget on the API key. Neither provider's own monthly limit stops spending: Parallel's only sends a notice, and Exa's only blocks a specific key.

## 2. Parallel and Exa accounts

### Settings to add in Netlify (Site configuration → Environment variables)
Mark each one **secret**. Make them available only to Functions, in production and deploy previews. Never put them in code, email or chat.

| Variable | Where to find it | Notes |
|---|---|---|
| `PARALLEL_API_KEY` | Parallel dashboard → API keys | Create a key named "The Art of Connect – production". |
| `PARALLEL_WEBHOOK_SECRET` | Parallel dashboard → Webhooks (starts with `whsec_`) | One secret per account. |
| `EXA_API_KEY` | Exa dashboard → API keys | Create a dedicated key with a **$20 key budget**. |
| `EXA_WEBHOOK_SECRET` | Shown **once**, when I register our webhook | I'll ask for it at that moment; store it immediately. |

The webhook addresses I'll register are `https://<your site>/api/intel/webhooks/parallel` and `https://<your site>/api/intel/webhooks/exa`.

Once the keys are in place, tell me. I'll confirm the site can see them (never their values) and run the fictional test scenarios. Each provider and the division are turned on in the Owner Portal, and all three switches are off today.

### Licensing: letting members receive and share reports
Your goal is for members to receive research reports and share authorized reports with their collaborators and professional advisors. Both providers' standard terms stand in the way, so this needs **written permission or a negotiated agreement** from each:
- **Parallel** (Customer Terms §2(b)–(c)):
  - A result is licensed "primarily for the use of one End Customer". It may not be "made available to other End Customers or other third parties", reused for later queries, or used to build databases.
  - Members **receiving** their own reports is allowed. **Sharing** a report with a Deal Room collaborator or an advisor needs Parallel's agreement.
- **Exa** (Terms §4.2(a)):
  - Displaying or distributing anything obtained through the service is prohibited without written permission. That covers even showing results to the member who asked.
  - Its paid Growth plan includes a negotiated agreement (MSA), but the text isn't public.

**Questions to send both providers:**
1. May we display research results, and reports written from them, to the member who requested them?
2. May that member share a specific report with named collaborators or professional advisors inside our platform, with attribution and without bulk export?
3. Do our reports, written by Journey with citations, count as your "output", or as our own work that merely cites sources?
4. What does it take to stop you from training on our requests (zero data retention), and what does it cost?
5. Will you sign a data processing agreement? What are your security reports (SOC 2) and retention periods?
6. Do you allow use for employment or casting discovery, where members, not we, make every decision?

## 3. Malware scanning for the Document Vault: recommendation (nothing purchased)
- **Recommended: Amazon GuardDuty Malware Protection for S3.**
  - **Cost:** about $0.09 per GB scanned, plus about $0.215 per 1,000 files. That is under $1 a month at 2,000 files.
  - **Privacy:** files are scanned inside an AWS account **you own**, with no outside antivirus vendor. AWS states it doesn't keep or share scanned files.
  - **What it requires:**
    - an AWS account;
    - a private holding bucket (uploads land there, are scanned, and only clean files move to our private storage);
    - one small notification step (EventBridge).
  - **Setup:** about a day of work once the AWS account exists.
- **Fallback: Cloudmersive Virus Scan API.**
  - **Cost:** free for about 800 scans a month, then $19.99 for 20,000.
  - **Privacy:** it says files are processed in memory and not kept, and it offers a GDPR data processing agreement.
  - **Caution:** no SOC 2 or US-region statement found. Get those in writing first.
- **Not recommended:**
  - MetaDefender's free tier can make scan results visible to others.
  - scanii costs more ($49 a month for 1,000 files).
  - Self-hosted ClamAV costs about $60 a month and detects threats less well.
- **Until a scanner is approved,** vault files can be opened only by the person who uploaded them, as built.

## 4. T. Turner & Associates, LLC: disclosure draft for your review
The draft below is saved but **not shown to members** until you approve it. **No referral compensation exists or is enabled.**

> **About our professional referrals.** The Art of Connect may suggest qualified professionals, including T. Turner & Associates, LLC, which has an affiliated business relationship with The Art of Connect, LLC. You are always free to choose your own accountant, attorney or advisor. Using an affiliated provider is never required and does not affect your membership. Any professional you choose provides services under their own engagement terms and fees, which are separate from your membership.

**What I need from you:**
- the nature of the affiliation, for example common ownership or management;
- whether The Art of Connect, or anyone else, receives any compensation from referrals.

If compensation is ever approved, the disclosure must say so, and transaction-based compensation stays restricted until legal review.

## 5. Stripe: requirements for a separate business proof-of-funds service
From Stripe's Financial Connections documentation and terms (last modified September 28, 2026):
1. **Separate purpose approval.**
   - Submit the new "Proposed Purpose" to Stripe **at least 14 days before first use**. Stripe must approve it in writing.
   - The existing Elite eligibility purpose does not cover this. Balance data also requires a completed Financial Connections registration before going live.
2. **Sharing must be approved explicitly.**
   - The terms forbid sharing "Connections Data" with third parties.
   - Ask Stripe in writing whether a member-authorized, derived statement ("balance at or above $X on date D") shown to collaborators that member chooses is permitted.
3. **Independent consent.** Use separate, versioned consent text for this service only. Keep consent records for the contract term plus 24 months, and get new consent for any material change.
4. **Request the minimum.** Ask only for the balances permission (10¢ per successful call). Don't request ownership, transactions or account numbers.
5. **Separation.** Use a fresh bank connection. Keep this data in its own store, never mixed with the Elite review data.
6. **Retention.** Keep only the threshold result and its as-of date. Statements expire (30 days proposed). Delete source data once the statement is produced, and let the member revoke it at any time.
7. **Clear limits on meaning.** Each statement says it is not proof of solvency, creditworthiness, committed funds or accredited-investor status.
8. **Security addendum.**
   - Encryption, access controls and access logging.
   - US-only storage and penetration testing.
   - Immediate breach notice to Stripe at fc-intake@stripe.com.
9. **Restricted businesses.** Confirm with Stripe that a platform that doesn't lend or broker, under the current restrictions, is acceptable.

## 6. Funded financing needs the lender's disbursement confirmation: implemented
- **Funded:** an application can be marked funded only with an uploaded **disbursement confirmation** from the lender. Commitment and approval letters are refused for this.
- **Approved:** needs an approval or commitment letter.
- **Commissions:** can be recorded only on funded applications.

## 7. Capital Marketplace and the 5% commission model: foundation built, everything restricted
**Built:**
- the lender directory with every field you listed;
- lender-paid commission rules, including the 5% target as a draft, tiers, renewals, splits and exceptions with reasons;
- a commission ledger covering expected, invoiced, received, clawed back and refunded amounts;
- one consent per lender before any member information is sent.

**Safeguards in place:**
- **Members are never charged:** the database allows only "lender-paid" rules.
- **Fair ranking:** no ranking uses compensation.
- **Activation requires all of:** an executed agreement, your approval, and recorded legal review of sending applications.
- **Commission tracking** additionally requires recorded legal review of transaction-based compensation.

**Why legal review comes first** (research summary, `docs/research/lending-compensation-legal-landscape-2026-11-27.md`):
- **Brokering, not referral:**
  - Collecting and sending applications through an API, or earning a percentage of funded principal, is likely to be treated as **loan brokering**.
  - California's referral exception covers only loans at 36% APR or less, and bars helping prepare applications. California will require a broker license for small-business financing from **July 1, 2028**.
  - Virginia, Connecticut and Missouri require broker registration, and Texas by **December 31, 2026**. North Dakota requires a license.
  - A percentage of principal likely defeats the broker exemptions in Florida, Kansas and Utah.
- **SBA loans:**
  - A referral agent may be paid by the lender or the borrower, not both.
  - Every fee goes on SBA Form 159.
  - Sending applications may make us a "Lender Service Provider".
- **Disclosure:** New York and others require disclosure of how and by whom the broker is paid.
- **Enforcement:** the FTC's 2025 action against a small-business financing broker (Seek Capital) ended in a permanent ban.

**Lower-risk path to consider with counsel:**
- Members compare published lender information inside The Art of Connect. The lender hosts its own application.
- Commissions are disclosed up front.
- No fees are charged to members.
- Merchant cash advances, which are not loans, are excluded.

**Partner landscape** (`docs/research/lending-partners-2026-11-27.md`):
- **Most integration-ready:** Capvant (partner API, sandbox, signed webhooks; it shares 10–20% of its own commission) and Lendflow (embedded infrastructure; pricing not public).
- **Stripe Capital:** available only to businesses that process payments on our Stripe Connect platform.
- **Referral or broker programs:** Lendio (about $125 per qualified application, third-party figure), OnDeck, Fundbox, Biz2Credit, National Business Capital, Kapitus, Credibly, Rapid Finance (an older page says "up to 5%") and Bizcap.
- **Products that are not loans:** several partners' main products are merchant cash advances, which the report flags.
- **Regulatory history:**
  - Biz2Credit settled with the FTC for $33 million in March 2024.
  - OnDeck's parent company, Enova, had a CFPB consent order about its consumer brands in 2023. It ended in 2025.

**Your existing lending relationships** can be added to the directory as "owner relationship" entries whenever you're ready.

## 8. Bizee: evaluation and next step
- **Bizee Platform** advertises an embedded API with signed webhooks, typed SDKs, a sandbox, monthly wholesale invoicing and account management. Its developer documentation is available to partners only.
- **Affiliate program:** runs on Awin with a 30-day cookie; the commission isn't confirmed.
- **Account upgrade:** no public statement on whether your customer account can be upgraded. Apply through `https://bizee.com/form/partner-with-bizee` and ask.
- **Questions to send Bizee:** see `docs/research/bizee-2026-11-27.md`. They cover:
  - account conversion and integration paths;
  - minimums and wholesale pricing;
  - API coverage, including articles and the EIN letter;
  - webhook signing and sandbox parity;
  - SOC 2 and a data processing agreement;
  - customer of record and refunds;
  - white-labeling;
  - affiliate terms.
- **Already built:**
  - formation orders that show every government fee, service charge and renewal before the member can authorize;
  - a switch that keeps partner orders off (`formation_orders_live` = false);
  - revenue tracking for commissions or margins, with third-party costs and net profit.
- **Live today:** members file directly with their state using the official links.

## 9. Business Launch Center state entries: your review needed
- **Prepared:** all 51 entries (50 states and D.C.), loaded as **drafts**. Members see every state's official links now. Fee figures appear only after you approve a state at **Owner Portal → Business Launch Center states**.
- **Each entry lists its points to confirm.** Examples: Kansas and Indiana fees conflict between official sources; D.C.'s report fees may change; Montana's annual report fee changed recently.
- **Suggestion:** approve a few states your members are most likely to choose first.
