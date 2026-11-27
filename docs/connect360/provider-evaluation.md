# CONNECT 360 — Parallel and Exa provider evaluation

_Prepared by Peace, November 27, 2026, for founder directives 24–29. It is based only on each provider's official documentation, pricing pages and terms, read on this date. No account was created, no key requested and no paid call made. Prices are in US dollars and change often, so re-check them before approving a budget. Full sourced notes, with a URL and quotation for each claim, are kept in Peace's working files._

## 1. Recommendation in one paragraph

Use both providers as you decided, each in the role it is built for.
- **Parallel** handles multi-step investigations with cited, per-field reasoning (Task API), entity discovery with verification (FindAll), watchlist monitoring (Monitor) and page extraction (Extract).
- **Exa** handles broad discovery of organizations and professionals (Websets) and fast web search.
- **Journey** stays the only member-facing voice.

Three terms issues have to be settled before members see any results:
1. **Exa's Terms forbid displaying or distributing results** without its written permission (ToS §4.2(a)). We need that permission in writing, or a negotiated agreement, before Exa results reach members.
2. **Both providers may train on what we send** unless we buy their zero-data-retention tier. Parallel offers it only on Enterprise. Exa offers it on Growth at $1,000 a month, and not for Websets at all. So research requests must carry only public, non-personal objectives, which your directives already require.
3. **Parallel licenses each result to one end customer.** Results cannot be cached and shown to a different member, so research is per member.

Until those are settled, testing can run with the providers' **free credits**, using fictional scenarios and visible only to you.

## 2. Side-by-side

| Criterion | Parallel Web Systems | Exa |
|---|---|---|
| **Deep research** | Task API with 9 depth levels, from lite to ultra8x. It returns structured fields, each with citations, reasoning and a high, medium or low confidence. Runs take 10 seconds to 2 hours; the lite tier is typically about 45 seconds and ultra about 4 minutes. | The Research API was retired (it now returns 410). Deep Search and Agent replace it. Agent returns grounding citations with a confidence level. |
| **Discovery** (organizations, professionals) | FindAll (public beta) turns a plain-language request into a verified, enriched list. | Websets is Exa's strongest product: up to 5 criteria, each result judged yes, no or unclear with its reasoning and sources. Exa claims 1B+ people, 70M+ companies, and 300M+ person profiles across 190+ countries. |
| **Verification** | Per-field citations and confidence. FindAll checks each match against your criteria. | A yes/no/unclear verdict per criterion, with sources. |
| **Cross-verification** | Exa discoveries can be passed to Parallel Task to investigate and confirm. | Parallel findings can seed Exa searches for similar organizations. |
| **Webhooks** | Standard Webhooks HMAC-SHA256 signing with one account-wide secret. Failed deliveries are retried with backoff for 48 hours, and duplicates are possible. | Signed with HMAC-SHA256 in an `Exa-Signature` header, with a separate secret for each webhook, shown only once. The retry policy is not published. |
| **Monitoring** | Monitor API, from hourly to every 30 days. $3 or $10 per 1,000 executions. | Monitors, $2 per 1,000 requests. |
| **International** | Search can target 37 countries. Turbo search is English and Japanese only; other modes are recommended for other languages. No full language list for Task. | Searches can be targeted by country; examples cover several European cities. No per-country coverage figures are published. |
| **Licensing and redistribution** | Allowed inside our product for the member who asked. Results cannot be shared with other members, cached for later reuse, or used to build databases or training data. | **Display and distribution are prohibited without written permission (§4.2(a)).** Resale and sublicensing need consent. Growth and Enterprise include a negotiated agreement whose text is not public. |
| **Employment and people data** | Automated decisions with significant effects in employment, finance or housing must have human oversight (§8(e)). No FCRA language. | No FCRA or employment-screening policy is published. Exa markets recruiting use. Contact details (email or phone) are a paid add-on, which **we will never enable**. |
| **Retention and training** | Data is stored in the US. It may be used for training unless we have an Enterprise zero-data-retention agreement. Scale ($1,000 a month) adds partial zero retention, but asynchronous results are still kept up to 8 days. A data processing agreement must be signed before sending personal data. SOC 2 Type I and II. | Queries may be used for training without zero retention. Zero retention requires Growth and does not cover Websets. Its privacy policy says not to put personal information in queries. Data processing agreement and SOC 2 Type II available. |
| **Spending controls** | Prepaid balance. Its monthly limits **only notify and never block**; requests stop only when the balance runs out (402). | Each key can have a budget that returns 402 when reached. Monthly cap on auto-recharge, usage alerts, and a per-run cost cap on Agent. No per-Webset cap. |
| **Free credits for testing** | $5 a month with a card on file, plus up to $80 at signup. | $10 a month on Starter, plus a one-time $10 bonus. |

**What this means for our controls.** Neither provider will reliably stop spending at an amount we choose: Parallel's limits only notify, and Exa has no per-Webset cap. So our own **spending guard is the real limit**. That is `intel_can_spend`, which every call must pass, covering company daily and monthly limits, a per-assignment limit, per-member monthly limits and an emergency stop. Provider accounts will hold small prepaid balances with **auto-reload off**, so the most that could ever be lost is the balance on deposit.

## 3. Prices that drive our costs

**Parallel**
- **Task, per 1,000 runs:** lite $5, base $10, core $25, pro $100, ultra $300.
- **FindAll:** preview $0.10 per run; base $0.25 plus $0.03 per match; core $2 plus $0.15 per match; pro $10 plus $1 per match.
- **Search:** $1–$5 per 1,000.
- **Extract:** $1 per 1,000 pages.
- **Monitor:** $3–$10 per 1,000 runs.
- Failed runs are not billed.

**Exa**
- **Websets:** $0.10 per compute unit plus $5 per 1,000 searches. Exa's published examples come to roughly $0.001–$0.044 per verified match.
- **Search:** $4–$7 per 1,000.
- **Contents:** $1 per 1,000 pages.
- **Monitors:** $2 per 1,000.
- **Agent:** $0.012–$1.00 per run.

**Journey (OpenAI, already configured):** about $0.005 per message, used for planning, follow-up questions, evaluation and report writing.

## 4. Fictional scenario comparison (from the documentation, not live runs)

| Scenario | Exa (discovery) | Parallel (investigation) | Journey | Estimated cost |
|---|---|---|---|---|
| **Sports franchise ownership:** a fictional member explores minority ownership in an expansion league | Webset of leagues and teams with announced expansion or ownership openings | Task (pro) on each league's published ownership rules, approval process, capital disclosures and regulator | Clarifies goals; marks league requirements as **confirmed only when the league's own source says so**; recommends a sports attorney | $1.50–$4 |
| **Head coach discovery:** a fictional club seeks candidates | Webset of coaches matching published experience criteria (records, levels coached) | Task (core) on each shortlisted coach's public career record | Presents **leads for the member to evaluate**. Never ranks people for hiring decisions, never gathers contact details, uses only job-related public facts. Introductions only with consent. | $1–$3 |
| **Business acquisition:** a fictional logistics firm for sale | Webset of comparable companies and brokers in the region | Task (pro) on registration, ownership history, regulatory records and public reputation; FindAll on comparable transactions | Sorts findings into confirmed, self-reported, unresolved concern and not established, and builds the due diligence checklist | $2–$6 |
| **International expansion:** a fictional food brand entering a new country | Search and Webset of distributors and regulators in the country | Task (pro) on the country's import rules, licensing and labeling | Flags jurisdiction-specific items for professional review | $1.50–$4 |
| **Manufacturing and suppliers** | Webset of manufacturers meeting criteria (certifications, capacity) | Extract and Task on each manufacturer's published certifications | Builds a supplier comparison and questions to ask | $1–$3 |
| **Board and advisory seats** | Webset of organizations recruiting board members (non-profits, associations) | Task on each organization's governance and published requirements | Matches against the member's stated qualifications only | $0.75–$2 |
| **Retirement and legacy:** succession for a fictional family business | Search for succession advisors and programs | Task on SBA and IRS succession resources (official sources) | Educational only; refers to attorney or CPA | $0.50–$1.50 |
| **Funding (directive 29):** fictional equipment loan | Webset of lenders and CDFIs offering the product | Task on each lender's **published** requirements, rates and fees, with dates | Comparison report labeling estimates; never predicts approval | $1–$3 |

**Live head-to-head testing.** These estimates come from the documentation. A true head-to-head needs both accounts. Both providers' free credits ($5–$85 for Parallel and $10–$20 for Exa) would cover these eight fictional scenarios at standard depth without spending money. **Creating those accounts requires your approval**, because each needs a card on file.

## 5. Cost model and recommended limits

| | Standard assignment (Executive) | Deep assignment (Elite) |
|---|---|---|
| **Typical mix** | 1 Webset of about 25 results, 2–3 Parallel core Tasks, Extract, Journey | Webset of about 100 results, FindAll core, 3–5 Parallel pro or ultra Tasks, cross-verification, Journey |
| **Estimated cost** | **$0.60–$1.80** | **$4–$10** |
| **Monitoring** (each Elite watchlist objective, weekly) | — | about $0.05–$0.30 a month, plus any follow-up research it triggers |

**Recommended limits.** These are proposals for your approval; every limit is $0 today.

| Setting | Testing (fictional only) | At launch |
|---|---|---|
| Company monthly limit | **$25** | $300, reviewed monthly |
| Company daily limit | **$5** | $40 |
| Per standard assignment | $3 | $3 |
| Per deep assignment (Elite) | $12 | $12 |
| Executive member monthly | — | **$15** (about 8–20 standard assignments) |
| Elite member monthly | — | **$60** (about 6–12 deep assignments plus monitoring) |
| Emergency stop | Always available to you | Trips automatically at the company daily limit |
| Provider prepaid balance | Free credits, then up to $20 each | Up to one month of company limit; **auto-reload off** |

## 6. Exactly what I would need from you (only after you approve)

**Accounts.** You create them and own them; I never sign up on your behalf.
1. **Parallel:** a Build (pay-as-you-go) account under The Art of Connect, LLC. Set the monthly spend notification at the testing limit and leave auto-reload off.
2. **Exa:** a Starter or Developer account. Create a dedicated API key with a **key budget** (for example $20) and leave auto-recharge off.

**Keys and settings.** They go into **Netlify environment variables** for the production site, marked secret, and are never placed in the code or the chat.

| Name | From | Purpose |
|---|---|---|
| `PARALLEL_API_KEY` | Parallel dashboard, API keys | Calls Task, FindAll, Monitor and Extract |
| `PARALLEL_WEBHOOK_SECRET` | Parallel dashboard, webhooks (starts with `whsec_`) | Verifies Parallel's completion notices |
| `EXA_API_KEY` | Exa dashboard, API keys (the budgeted key) | Calls Websets, Search, Contents and Monitors |
| `EXA_WEBHOOK_SECRET` | Shown once when I register our webhook | Verifies Exa's notices |

The webhook addresses I'll register are `https://<our site>/api/intel/webhooks/parallel` and `https://<our site>/api/intel/webhooks/exa`.

**Agreements, before members see any results:**
- **Exa:** written permission to display results to our members, or its negotiated agreement.
- **Parallel:** its data processing agreement, before any personal data (such as the names of a company's representatives) is sent.
- **Legal review:** FCRA and employment use (head coach and leadership discovery), and the lending, brokerage and securities items in directives 27–29.

## 7. Integration design (ready to build once approved)

1. **Journey plans** the assignment: it clarifies the objective with the member, writes the structured requirements, and picks the stages and providers.
2. **Every provider call first passes `intel_can_spend`**, using the estimate from the price table. A refusal pauses the assignment with a plain explanation.
3. **Long-running work** starts from a server action. Results arrive through signed webhooks: the signature is verified, timestamps outside 5 minutes are rejected, and duplicates are removed using the delivery ID. A cron job polls as a backstop.
4. **The cost ledger** (`intel_jobs`) records the estimate before each call and the actual cost after it. The owner sees the totals.
5. **Cross-verification:** Exa discoveries become Parallel investigations; Parallel findings seed further Exa discovery. Journey compares them and labels each finding confirmed, corroborated, self-reported, unresolved concern, conflicting, outdated or not established.
6. **Privacy filter before sending:** only the public research objective and public identifiers go out. Never member names, financial information, documents, contact details or private notes. The Safety Shield runs on the outgoing text.
7. **Per-member results:** no sharing of results between members, as Parallel's terms require. Any cache is kept per member only.
8. **People results** show only public professional facts, never contact details. Introductions go through the existing consent-based process.

Nothing in this design runs until you (1) approve the testing budget, (2) create the two accounts, and (3) switch on the division and each provider in the Owner Portal. All three are off today.
