# Commercial Lending Partner Evaluation: 12 Providers

Research date: 2026-11-27. Read-only desk research. No accounts were created, no forms were submitted, and no one was contacted.

## Method and limits

- **Direct page fetching was blocked.** This research session's network policy did not allow the provider hosts (for example lendflow.com, docs.lendflow.com, lendio.com and fundbox.com all failed DNS resolution). Every fact below therefore comes from web-search result extracts of the cited pages. The search tool paraphrases pages, so the short quotes are search-extract text, not verbatim captures. **Check each figure on the live URL before you rely on it in a contract or member-facing material.**
- Official provider pages are preferred. Third-party sources (review sites, PartnerStack/FlexOffers listings, API catalogs, press coverage) are labeled **[3P]**.
- Published eligibility figures differ between a provider's own pages and the review sites, and sometimes between a provider's own pages. Where they conflict, both are shown.
- **MCA flag:** a merchant cash advance (MCA) or "revenue-based financing" product structured as a *purchase of future receivables* is **not a loan**. Usury and lending-licence rules, disclosures and cost metrics (factor rate, not APR) all differ. These products are marked **[MCA]**.

---

## Summary table

| Provider | Type | Products | Partner program | API/embedded | Sandbox | Webhooks | Published compensation | Partner link |
|---|---|---|---|---|---|---|---|---|
| Lendflow | Embedded-lending infrastructure (SaaS + lender marketplace) | Platform for others' products: term loans, LOC, MCA, etc. via lender network | Platform customers, not referrers | Yes: API, embeddable funnels, "Lendflow Connect" | Not confirmed publicly | Yes (blog: submitted/approved/funded/declined) | Not public. Pricing models listed (% of revenue, transaction fee, per-module, software fee), no rates published | https://www.lendflow.com/pricing |
| Lendio | Marketplace/broker (75+ lenders) plus embedded marketplace | Term, LOC, SBA (7(a), 504, Express), equipment, invoice factoring, RBF/MCA [MCA] | Yes: referral (PartnerStack) and Embedded Financing | Yes: JS widget, auth API, offers via API, partner portal | Not found publicly | Not found publicly (offers "delivered via API") | $125 per qualified application [3P, PartnerStack]. Embedded rev-share not public | https://www.lendio.com/embedded-financing ; https://market.partnerstack.com/page/lendio |
| Fundbox | Direct lender (fintech) | Revolving line of credit (≤$250K) | Yes: referral Partner Program plus embedded track | Yes: "APIs, SDKs" (FAQ). Partner API listed [3P] | Not found publicly | Not found publicly | Not public ("benefits for each successful referral") | https://fundbox.com/partner |
| OnDeck (Enova) | Direct lender | Term loans, lines of credit | Yes: ISO/broker, affiliate, accountant, enterprise | Yes: enterprise API (e.g. QuickBooks). No public docs | Not found publicly | Not found publicly | ISO: "competitive commissions" (no figure). Affiliate: "up to $10,000 per referral" (website-owner program) | https://www.ondeck.com/partner ; https://partners.ondeck.com/ |
| Biz2Credit | Direct lender/funder plus SaaS (Biz2X) | Term, LOC, RBF [MCA-type, verify], CRE, working capital | Yes: affiliate/referral, CPA portal | Yes: Biz2X embedded ("full API access with webhooks") | Not found publicly ("no-code pilot") | Yes (Biz2X marketing) | Not public ("referral fees") | https://www.biz2credit.com/partners/affiliate-program |
| National Business Capital | Marketplace/broker | Term, LOC, SBA, equipment, RBF [MCA], PO/invoice financing | Yes: referral partner program with dashboard | Not found publicly | Not found publicly | Not found publicly | Not public ("High Commission", book-of-business and override payments) | https://www.nationalbusinesscapital.com/partners-v2/ |
| Kapitus | Direct funder plus partner products | RBF [MCA, "not a loan"], equipment financing, other loans via partners | Yes: Sales Partner (ISO/broker), Equipment Provider program | Not found publicly | Not found publicly | Not found publicly | Not public ("volume-based bonuses") | https://kapitus.com/partner/ |
| Credibly | Direct funder plus marketplace for partner products | MCA [MCA], working capital loan, RBF [MCA], LOC/SBA via partners | Yes: referral and broker partnerships | Lender API via Cloudsquare Broker CRM [3P]. No public docs | Not found publicly | Not found publicly | Not public ("commission on funded deals") | https://credibly.com/partner/referral-partnerships/ |
| Rapid Finance | Direct lender plus embedded/bank partner programs | LOC, short-term loans, others | Yes: broker/ISO, Rocket Pro TPO, bank/CU embedded, fintech partners | Embedded (Q2 integration). Partner Portal | Not found publicly | Not found publicly | Rocket Pro TPO page: "up to 5% of the financing or draw amount" plus renewals (co-branded, may be dated) | https://partner.rapidfinance.com/partner-resources ; https://www.rapidfinance.com/partner-programs/embedded-lending/ |
| Stripe Capital | Embedded financing for Stripe-processing businesses (Stripe plus bank partners) | US: flex loan, MCA [MCA], fixed-term loan, LOC (private preview) | Platform program for Connect platforms only | Yes: no-code, embedded components, full API | Test mode (Stripe standard; Capital specifics not confirmed) | Yes (offer status events) | Rev-share exists but terms not public ("contact your account team"). Platform may not charge users extra fees | https://docs.stripe.com/capital/how-capital-for-platforms-works |
| Capvant | Marketplace/introducer (not a lender) | Working capital, LOC, equipment, invoice, term, SBA, secured/unsecured, MCA [MCA], RBF | Yes: accountants, platforms, deal advisers, vendors | Yes: Partner API, widgets, tracked links | Yes ("test-referral sandbox") | Yes ("signed webhooks for status and commission events") | 10% / 15% / 20% of Capvant's commission (Bronze/Silver/Gold) | https://capvant.com/us/partners |
| Bizcap (US) | Direct funder (formerly NewCo Capital Group, US arm) | RBF/cash-advance-type products [MCA, likely], Line of Capital / Line of Capital Ultra (≤$2M) | Yes: ISO/broker program plus ISO Partner Portal. Affiliate via FlexOffers | Partner Portal only. No public API found | Not found publicly | Not found publicly | Broker: not public. Affiliate: $300 per fully qualified application [3P, FlexOffers] | https://bizcapfunding.com/partners (partners@bizcapfunding.com) |

---

## Provider detail

### 1. Lendflow

**1. What it is and products.** Embedded-lending infrastructure, delivered as SaaS with a lender marketplace and data/decisioning APIs. It does not fund loans itself. CB Insights [3P] describes the revenue model as a "SaaS platform fee for its Embedded Solution; Revenue Share on Lending Origination Fees (via Lendflow's Lender Marketplace); and a Data Services API solution." Products are whatever the connected lenders offer (term loans, LOCs, MCAs and others).
- https://lendflow.com ; https://www.lendflow.com/lendflow-connect ; https://www.cbinsights.com/investor/lendflow [3P]

**2. Eligibility.** Not applicable. Eligibility is set by the underlying lenders and partner policy. Lendflow lets platforms "Control lender economics, Define partnership policies" (pricing page).

**3. Partner offerings.**
- API and embedded: one endpoint handles "submissions, scoring, offers, e-sign, and webhooks" (Lendflow blog: https://www.lendflow.com/post/technical-requirements-embedded-smb-lending).
- Webhooks: "push updates when an application is submitted, approved, funded, or declined" (same blog). This covers application status and funding confirmation.
- Document handling: the August 2026 roundup mentions "Dynamic Docs" for customizing document requirements and "foundational API improvements" (https://www.lendflow.com/post/lendflow-roundup-august). No public document-upload endpoint spec was seen.
- Sandbox: **not confirmed publicly**. The blog recommends sandboxes in general, but no source describes Lendflow's own.
- Commission/rev-share reporting: the pricing page mentions "Data insights on funnel conversion performance". A specific commission report was not found publicly.

**Pricing model.** From the pricing page (https://www.lendflow.com/pricing): pricing options include "% of Revenue", "Direct Transaction Fee", "Per-Module Pricing", "Software Fee", pay-as-you-go and credit bundles. There are "three separate pricing options allowing you to contract directly (self-managed), indirectly (managed by Lendflow) or a hybrid". No rates are published. Directories [3P] disagree: Capterra says "pricing on request / no free plan", Slashdot says "Starts at $500 per month", and one directory lists $149/mo. Lendflow's own copy mentions a free plan.

**Contract watch-item.** Lendflow's Terms of Service (https://www.lendflow.com/terms-of-service) say Lendflow may receive "a commission from third parties, including Lenders … without disclosure to You." Negotiate disclosure of this.

**4. Compensation.** Not public. The platform's economics depend on the pricing model chosen. Lendflow's blog cites a generic "1–5% of loan amount" origination-fee benchmark (https://www.lendflow.com/post/embedded-lending-saas-monetization), which is industry context, not Lendflow's rate.

**5. Links.** Partner/sales: https://www.lendflow.com/pricing (demo/contact). Developer docs: https://docs.lendflow.com (linked from Lendflow's site. The fetch was blocked, so contents were not verified).

**6. Regulatory.** None found in official FTC, CFPB or state AG sources.

---

### 2. Lendio

**1. What it is and products.** A marketplace/broker that matches businesses with third-party lenders. It also sells an "Embedded Financing" marketplace to platforms and banks. Products: business term loans ("$5K to $2M"), lines of credit ("$1K to $500K"), SBA 7(a)/504/Express, equipment financing, invoice factoring, and revenue-based financing / cash advance **[MCA]**. No Lendio direct-lending product was confirmed.
- https://www.lendio.com/loan-types ; https://www.lendio.com/business-loans/small-business-loans

**2. Eligibility** (varies by lender). Lendio's site gives a benchmark of "600+" credit score, "6 months+" in business and "$8K+ in monthly revenue", noting that "the exact minimum will vary by lender and loan type" (https://www.lendio.com/lp/direct/small-business-financing ; https://www.lendio.com/guides/business-loan-requirements). Bankrate [3P] says MCAs can go "as low as 500". Geographic limits and excluded industries: not found publicly (they vary by lender).

**3. Partner offerings.**
- Referral program: listed on PartnerStack [3P] at https://market.partnerstack.com/page/lendio.
- Embedded/white-label: "install the embedded financing widget with a JavaScript code snippet… connect to our authentication API endpoint to securely share customer data, and to pre-fill the application"; "set up a CNAME record to point to Lendio's production servers"; "offer data is delivered to your platform via API". Implementation takes "3–12 weeks" (https://www.lendio.com/embedded-financing).
- API-first update dated April 8, 2026: https://www.lendio.com/product-updates/strengthening-our-embedded-platform-with-modern-api-first-standards
- Partner portal: "critical insights, analytics, and data about the performance of your Embedded Lending program". This covers performance/commission-type reporting.
- Public API docs, sandbox, status webhooks, document-upload API: **not found publicly**. A third-party catalog (https://apis.io/providers/lendio/ [3P]) lists a "Loan Marketplace API" at api.lendio.com. This is unverified.

**4. Compensation.** Referral: "$125 per qualified loan application submitted… paid-out the month after your commission is earned" (PartnerStack [3P]). Embedded rev-share: not public.

**5. Links.** Partner: https://www.lendio.com/embedded-financing and https://market.partnerstack.com/page/lendio. Developer docs: not public.

**6. Regulatory.** None found in official FTC, CFPB or state AG sources.

---

### 3. Fundbox

**1. What it is and products.** A direct lender (fintech) offering a revolving business line of credit. Embedded partners include Wave, Relay, Lili, FreshBooks, Joist and Invoice Simple (Fundbox blog/press: https://fundbox.com/about/press/fundbox-x-wave/).

**2. Eligibility** [3P, since Fundbox's own pages could not be fetched]. Most reviews say: maximum line $250,000, credit score 600, 3 months in business, $30,000 annual revenue (NerdWallet, Bankrate). Older sources say 6 months and $100K (https://www.lendio.com/loan-reviews/fundbox/). Geographic limits and excluded industries: not found publicly.

**3. Partner offerings.**
- Referral program: "a partner program with benefits for each successful referral". Leads are tracked in a Partner Portal. The terms warn that "unwanted solicitation of merchant referrals may result in termination… and forfeiture of any future commissions" (https://help.fundbox.com/hc/en-us/articles/207256275-Partner-with-Us. This is an old help page).
- Embedded: "flexible integration options from quick setups to fully embedded solutions using APIs, SDKs, and other developer-friendly tools". Partners "can also choose to take on some level of risk and servicing" (https://fundbox.com/faq/ ; https://fundbox.com/partner).
- A "Fundbox Partner API" is listed only by third-party catalogs (https://apis.io/providers/fundbox/ [3P]).
- Public docs, sandbox, webhooks, document upload, commission reporting API: **not found publicly**.

**4. Compensation.** Not public.

**5. Links.** Partner: https://fundbox.com/partner (also /partners). Developer docs: not public.

**6. Regulatory.** None found in official FTC, CFPB or state AG sources.

---

### 4. OnDeck (Enova International)

**1. What it is and products.** A direct lender owned by Enova International (NYSE: ENVA). Products are term loans and lines of credit. Loans are issued by OnDeck or by Celtic Bank depending on the state [3P].
- https://www.ondeck.com/business-loans ; https://www.ondeck.com/company

**2. Eligibility** (OnDeck's own pages):
- "625 personal FICO® score; $100K in business annual revenue", plus 1 year in business per NerdWallet [3P] (https://www.ondeck.com/loan-qualifying/).
- Amounts: "5K – $400K for term loan; $6K – $200K for line of credit". Reviews [3P] show lower amounts.
- Geography: the restricted-industries page says OnDeck "does not lend to businesses in North Dakota". Another OnDeck page lists Nevada, North Dakota and South Dakota. These conflict, so confirm.
- Excluded industries: there is a published list (https://www.ondeck.com/?p=166497 "Restricted Industries and Businesses List"). Examples [3P] include firearms vendors, nonprofits, religious organizations, adult entertainment and gambling.

**3. Partner offerings.**
- Partner types: "Enterprise, Affiliate, and Accountant" (https://partners.ondeck.com/). There is also a broker/ISO channel (https://www.ondeck.com/partner).
- ISO requirements (from search summary of the partner page): roughly 2 years in business, about $1M in new funding per month, a website, insurance and a US location.
- Enterprise: "API solutions, CRM integration" and "OnDeck as a Service". The example is a QuickBooks flow where "the OnDeck API delivers an instant credit decision" (https://en-ca.ondeck.com/partner/enterprise/ is the Canadian page. The US equivalent was not confirmed).
- Public docs, sandbox, webhooks, doc-upload API, commission reporting: **not found publicly**. The partner portal exists.

**4. Compensation.** ISO: "competitive commissions", no figure. Affiliate (website owners): "up to $10,000 per referral" (https://www.ondeck.com/?p=165919). A dev.to estimate of 0.5–1.5% is unsourced [3P] and should not be relied on.

**5. Links.** Partner application: https://www.ondeck.com/partner. Portal: https://partners.ondeck.com/. Developer docs: not public.

**6. Regulatory.** Nothing found against OnDeck itself. **Parent Enova:** a CFPB consent order dated Nov. 15, 2023 ($15M civil money penalty, related to the consumer brands CashNetUSA and NetCredit: payment processing/debiting errors). It superseded a 2019 order and was **terminated Sept. 2, 2025**.
- https://www.consumerfinance.gov/enforcement/actions/enova-international-inc-2023/
- https://files.consumerfinance.gov/f/documents/cfpb_enova-international-2023_termination-consent-order_2025-09.pdf

---

### 5. Biz2Credit

**1. What it is and products.** A direct funder (including through its subsidiary Itria Ventures) and SaaS vendor (Biz2X white-label lending platform for banks and embedded finance).
- Products: term loans; revenue-based financing **[MCA-type. "Repayment is paid back from business receipts". Confirm the contract structure]**; lines of credit (up to $500K); commercial real estate ($250K–$6M); working capital ($25K–$2M+).
- https://www.biz2credit.com/financing ; https://www.biz2credit.com/revenue-based-financing ; https://www.biz2credit.com/line-of-credit

**2. Eligibility** (Biz2Credit's own pages, which conflict with each other):
- Term loan: "$100,000 annual revenue, FICO 650", 12–36 month terms (https://www.biz2credit.com/term-loans). Reviews [3P] say $250K revenue and 18 months.
- RBF: "FICO score of 575+" (https://www.biz2credit.com/revenue-based-financing/requirements). Reviews [3P] say 6–12 months in business.
- LOC: FICO 650+ and $250K average annual revenue.
- CRE: 18 months, $250K revenue, FICO 650.
- Geography and excluded industries: not found publicly.

**3. Partner offerings.**
- Affiliate/referral: "Leading Industry Referral Program… immediately begin earning referral fees". The workflow is: sign up, submit or refer, get a decision (https://www.biz2credit.com/partners/affiliate-program). There is also a CPA portal (https://www.biz2credit.com/cpa-portal/partner-with-biz2credit.html).
- Embedded/white-label (Biz2X): "no-code pilot program, full API access with webhooks, and configurable financing options"; "low-code deployment or full-API connection" (https://biz2credit.com/embedded-finance ; https://www.biz2x.com/embedded-finance-solutions/).
- Public API docs, sandbox, document-upload API, commission reporting: **not found publicly**.

**4. Compensation.** Not public.

**5. Links.** Partner: https://www.biz2credit.com/partners/affiliate-program. Embedded: https://biz2credit.com/embedded-finance. Developer docs: not public.

**6. Regulatory.** **FTC, March 18, 2024.** Biz2Credit and Itria Ventures agreed to pay **$33 million** over PPP marketing. The FTC said Biz2Credit advertised 10–14 business-day processing when average processing took "well over a month". The order bars misrepresenting processing times and approval odds and requires prompt withdrawal of applications.
- https://www.ftc.gov/news-events/news/press-releases/2024/03/ftc-actions-against-companies-making-deceptive-pandemic-loan-promises-lead-record-59-million-damages
- Case page: https://www.ftc.gov/legal-library/browse/cases-proceedings/biz2credit-inc-ftc-v

---

### 6. National Business Capital (NBC)

**1. What it is and products.** A marketplace/broker ("financing marketplace") that places deals with lending partners. Products: term loans, LOCs, SBA, equipment, revenue-based financing **[MCA]**, and purchase-order/invoice financing [mostly 3P listings].

**2. Eligibility** [3P, conflicting]:
- Bankrate: "minimum annual revenue requirement of $500,000"; NBC's site "states that there is no minimum personal credit score" but ~600 may be needed. Merchant Maverick: $120K/yr preferred. Finder: 1+ year in business (4+ months for equipment and RBF); 700 credit score.
- Amounts: partner page says "$100K to $10MM transactions". Bankrate says $1,000–$10M.
- Industries: partner page says "No Restricted Industries". Geography: not found.
- https://www.bankrate.com/loans/small-business/reviews/national-business-capital [3P] ; https://www.nationalbusinesscapital.com/blog/business-loan-requirements/

**3. Partner offerings.**
- Referral partner program: "High Commission, earn on every funded deal"; "earn on a book of business"; override commissions for introducing partners; "Unlimited Referrals"; a dashboard "for referring, tracking, and managing your pipeline in real-time" (https://www.nationalbusinesscapital.com/partners-v2/ ; https://www.nationalbusinesscapital.com/partner-with-abls). There is also a merchant-processor variant.
- Commissions are paid "shortly after we receive commissions from our lending partners".
- API, sandbox, webhooks, doc upload: **not found publicly**. Commission tracking is via the dashboard.

**4. Compensation.** Not public (no %).

**5. Links.** Partner: https://www.nationalbusinesscapital.com/partners-v2/. Developer docs: none found.

**6. Regulatory.** None found in official FTC, CFPB or state AG sources.

---

### 7. Kapitus

**1. What it is and products.** A direct funder plus partner products.
- Revenue-based financing **[MCA: Kapitus says the product "is not a loan" and "is more expensive"]**: "up to $5,000,000", average 6–24 month payment periods (https://kapitus.com/products-services/revenue-based-financing/).
- Equipment financing (https://kapitus.com/products-services/equipment-financing/).
- Other loan types (term, LOC, SBA) are referenced in guides, but no Kapitus-specific terms were found.

**2. Eligibility.**
- RBF: "2 years in business, $250,000 annual revenue, 650 credit score, USA location".
- Equipment (current page): 2 years, $250K revenue, $15,000 minimum, FICO 620, "no maximum financing amounts". Older pages say FICO 650+ and $20K minimum.
- Excluded industries: not found publicly.

**3. Partner offerings.**
- Sales Partner program for "established independent sales organizations, consultants, and brokers", with training, marketing materials and "client management infrastructure" (https://kapitus.com/partner/).
- A separate Equipment Provider Partner Program exists.
- A job posting [3P] shows brokers are routed to "ISO or MRP referral program" tracks.
- API, sandbox, webhooks, doc upload, commission reporting: **not found publicly**.

**4. Compensation.** Not public ("volume-based bonuses").

**5. Links.** Partner: https://kapitus.com/partner/. Developer docs: none found.

**6. Regulatory.** None found in official FTC, CFPB or state AG sources. (The NY AG MCA actions found, Yellowstone in 2024–25 and others, do not name Kapitus.)

---

### 8. Credibly

**1. What it is and products.** A direct funder and also "a financing partner" for products from external lenders.
- Direct: merchant cash advance **[MCA]**; working capital loan ("$25K–$600K, 6–24 months"); revenue-based financing up to $600K **[MCA-type]**.
- Via partners: business LOC "$5K–$300K"; SBA loans "up to $5M" (one Credibly snippet says $600K, which conflicts).
- https://credibly.com/merchant-cash-advance/ ; https://credibly.com/revenue-based-business-loans/ ; https://credibly.com/company/ ; https://credibly.com/sba-loan/

**2. Eligibility.** Credibly: "$5,000 to $600,000", revenue deposited into a bank account. LendingTree [3P]: "minimum monthly revenue $15,000, minimum time in business 6 months, minimum credit score 500". LOC via partners: 650+ or 700+ depending on the page. Geography and excluded industries: not found publicly.

**3. Partner offerings.**
- Referral partnerships: "submit a funding partner request form → exploratory call (operational flow and contract terms) → send leads"; commission on funded deals (https://credibly.com/partner/referral-partnerships/).
- "Broker Partnerships" appears in site navigation.
- Funder Intel [3P] reports a Credibly Lender API integration with Cloudsquare Broker (Salesforce CRM) "to automate submissions" (https://www.funderintel.com/post/credibly-just-fixed-the-thing-isos-complain-about-most).
- Public docs, sandbox, webhooks, doc upload: **not found publicly**.

**4. Compensation.** Not public.

**5. Links.** Partner: https://credibly.com/partner/referral-partnerships/. Developer docs: none public.

**6. Regulatory.** None found in official FTC, CFPB or state AG sources.

---

### 9. Rapid Finance

**1. What it is and products.** A direct lender/funder ("Rapid Finance is the funder for all of the financing products referenced on this page") that also sells lending technology and embedded programs to banks and credit unions (https://enterprise.rapidfinance.com/). Products include business lines of credit and short-term loans [Nav, 3P]. The full current product list was not confirmed.

**2. Eligibility.** Rapid's April 2025 partner LOC reference guide gives a minimum line of $5,000, minimum draw of $1,000, **minimum FICO 550, minimum 2 years in business** (https://partner.rapidfinance.com/hubfs/02.%20LOCReferenceGuide_April%202025.pdf). Reviews [3P] say 620–650, 3 years and $120K–$150K revenue. SuperMoney [3P] gives $5K–$250K. Geography and excluded industries: not found publicly (the guide may contain them).

**3. Partner offerings.**
- Broker/ISO: "some of the best commissions in the industry".
- Partner Portal: "customize offers… directly within our Partner Portal" (https://partner.rapidfinance.com/partner-resources).
- Banks and credit unions: an embedded program where "your institution receives non-interest referral income for each client who successfully funds", with a pre-built integration for Q2's digital banking platform (https://www.rapidfinance.com/partner-programs/embedded-lending/).
- Fintech/reseller partnerships: https://enterprise.rapidfinance.com/fintech-partnerships.
- Public API docs, sandbox, webhooks, doc upload: **not found publicly**.

**4. Compensation.** The Rocket Pro TPO co-branded page says brokers can "earn up to 5% of the financing or draw amount… plus recurring revenue when those customers renew" (https://www.rapidfinance.com/partner-programs/rocket-pro-tpo/. The page is about 4 years old). Standard ISO rates are not public.

**5. Links.** Partner: https://partner.rapidfinance.com/partner-resources ; https://info.rapidfinance.com/fintech-partnerships. Developer docs: none public.

**6. Regulatory.** None found in official FTC, CFPB or state AG sources.

---

### 10. Stripe Capital (Capital for Platforms)

**1. What it is and products.** Embedded financing offered only to businesses that process payments on Stripe. A **Connect platform** can offer it to its connected accounts. Offers are "a principal amount plus a flat fee, with no variable interest", repaid by withholding a fixed % of each transaction, with no prepayment penalty. US offer types: flex loan, **merchant cash advance [MCA, "purchase of future receivables, not a loan"]**, fixed-term loan, and line of credit (private preview).
- https://docs.stripe.com/capital/how-capital-for-platforms-works ; https://docs.stripe.com/capital/how-stripe-capital-works

**2. Eligibility** (connected accounts, assessed daily by Stripe and its partners):
- At least 3 months processing on Stripe with the platform, at least 5,000 annual and at least 1,000 monthly average in local currency, good standing, for-profit business, located in a supported country.
- The applicant must be at least 18 and own at least 25%.
- Countries for Capital generally: US, UK, Canada, Australia, France, Germany.
- https://docs.stripe.com/capital/eligibility

**Can a platform offer it to its members?** Yes, **only if the platform runs Stripe Connect and the members process payments through the platform's Stripe account**. A business membership platform that does not process its members' sales on Stripe cannot offer Stripe Capital. Platform terms (Stripe Services Agreement, Capital for Platforms terms, https://stripe.com/legal/ssa-service-terms):
- The platform "must not charge its connected accounts additional fees" in connection with Capital.
- Marketing is limited to connected accounts and prequalified offers within approved territories.
- Stripe "creates and manages financing offers on your platform account".

**3. Partner offerings.**
- Integration options: no-code (Stripe-hosted dashboard), embedded components (Capital financing promotion/application components), or full API ("List financing offers" endpoint) (https://docs.stripe.com/capital/api-integration ; https://docs.stripe.com/connect/supported-embedded-components/capital-financing-application).
- Webhooks: yes, for offer status changes.
- Reporting/reconciliation: yes. The "paid-out" status is used for "platform origination volume and revenue share reporting" (https://docs.stripe.com/capital/reporting-and-reconciliation).
- Non-Stripe data import for underwriting is in preview (https://docs.stripe.com/capital/import-non-stripe-data).
- Sandbox: standard Stripe test mode. Capital-specific test details were not confirmed.

**4. Compensation.** A revenue share exists, but the terms are not public: "Contact your account team or visit stripe.com/capital/platforms to learn about eligibility, including revenue share and co-marketing options" (Stripe support).

**5. Links.** Partner: https://stripe.com/capital/platforms (via the Stripe account team). Docs: https://docs.stripe.com/capital/how-capital-for-platforms-works

**6. Regulatory.** No Capital-specific FTC, CFPB or state AG action found.

---

### 11. Capvant

**1. What it is and products.** A marketplace/introducer ("not a lender") with UK and US sites. Products: working capital, business LOC, equipment, invoice financing and factoring, revenue advance, term loan, SBA loan, secured and unsecured loans, merchant cash advance **[MCA, "technically a purchase of your future receivables rather than a loan"]**.
- https://capvant.com/us/funding ; https://capvant.com/us/funding/merchant-cash-advance

**2. Eligibility.** The MCA page says "many businesses access $5,000 to $500,000 and beyond". Viewing options uses a soft credit pull. No minimum time in business, revenue or credit score was published in the results. Some US copy appears adapted from UK text (pound references), so verify US terms.

**3. Partner offerings** (the most developer-transparent of the 12):
- Partner tracks: accountants, platforms/SaaS, deal advisers, vendors, plus lenders joining the panel (https://capvant.com/us/partners ; /us/partners/platforms ; /us/partners/widgets ; /us/partners/embedded-financing).
- "Live deal status, widgets and a Partner API, free to join. Submit referrals programmatically, pull live status back into your own systems, and subscribe to signed webhooks for status and commission events."
- Sandbox: "test-referral sandbox so your team can integrate and test webhooks before going live".
- Tracked links are available with no integration.
- Document-upload API and funding confirmation: funding status via webhooks is implied. A document-upload API was not confirmed.

**4. Compensation.** Partners earn a share of Capvant's lending commission: **10% (Bronze), 15% (Silver), 20% (Gold)**, with the tier set by funded deals over the trailing 12 months. The partner's share "does not add to the business owner's cost" unless disclosed. Note that this is a share of Capvant's commission, not a % of the funded amount.

**5. Links.** Partner: https://capvant.com/us/partners. Developer docs: developers.capvant.com or docs.capvant.com (the sources conflict, so confirm). Contact: https://capvant.com/contact

**6. Regulatory.** None found. Limited public footprint: no independent coverage was found. Do extra diligence (entity, licensing, lender panel).

---

### 12. Bizcap (US entity: Bizcap US, formerly NewCo Capital Group)

**1. What it is and products.** A direct funder. Bizcap is an Australian-founded group that rebranded its US arm from NewCo Capital Group. "flexible business funding of up to $2M across three products." Products include revenue-based financing / business cash advance **[MCA likely: NewCo court filings refer to "revenue purchase agreements"]** and **Line of Capital / Line of Capital Ultra** (revolving, "up to $2 million", factor rate "starting at 1.02 for the first four weeks", launched August 4, 2026).
- https://www.prnewswire.com/news-releases/bizcap-us-launches-line-of-capital-ultra-giving-partners-a-smart-working-capital-solution-for-clients-302842530.html
- https://channellife.news/story/bizcap-rebrands-us-arm-launches-new-capital-product [3P]

**2. Eligibility** [3P, conflicting]: press coverage says $20,000 monthly revenue for the US. SuperMoney says credit 550+ for Line of Capital, $1,000–$2,000,000, all 50 states plus DC. Time in business: not found. Excluded industries: not found.

**3. Partner offerings.**
- ISO/broker program: once accredited, partners "submit clients' details using the ISO Partner Portal and get live access to the deal flow"; conditional offer "in as little as 3 hours" (https://bizcapfunding.com/partners ; https://www.prnewswire.com/news-releases/bizcap-us-helps-brokers-bridge-americas-growing-smb-funding-gap-302899637.html).
- Affiliate program via FlexOffers [3P].
- API, sandbox, webhooks, doc upload: **not found publicly** (portal only).

**4. Compensation.** Broker: "large commissions with renewal opportunities and enticing bonuses", no figure. Affiliate: "$300 for every fully qualified application" with Plaid or bank-statement verification (https://www.flexoffers.com/affiliate-programs/bizcap-usa-affiliate-program/ [3P]).

**5. Links.** Partner: https://bizcapfunding.com/partners ; email partners@bizcapfunding.com (https://www.bizcapfunding.com/contact). Developer docs: none found.

**6. Regulatory.** No FTC, CFPB or state AG action naming Bizcap or NewCo was found. NewCo appears as a **plaintiff** in NY commercial collection litigation (e.g., a NY court decision dated Jan. 2026, https://www.nycourts.gov/reporter/pdfs/2026/2026_30192.pdf). This is not a regulatory action but is worth noting for MCA collection practices.

---

## Additional sources worth evaluating

| # | Source | Category | Why / partner angle | Official link |
|---|---|---|---|---|
| 1 | SBA Lender Match | Government SBA referral tool | Free, neutral. 800+ SBA lenders in all 50 states. Members get lender responses in about 2 business days. Use it as a member-facing link, not a commission program | https://www.sba.gov/funding-programs/loans/lender-match-connects-you-lenders |
| 2 | SBA Form 159 (compliance) | SBA referral-fee rules | Any paid referral on a 7(a)/504 loan must be disclosed on Form 159. A fee is paid by lender *or* borrower, not both | https://www.sba.gov/document/sba-form-159-fee-disclosure-compensation-agreement |
| 3 | Live Oak Bank | SBA 7(a) preferred lender | Published referral process: fee on closed and fully funded eligible loans, paid within 30 days of month-end, W-9 and Form 159 required. Ramp is an example partner | https://www.liveoakbank.com/sba-loan-experts ; https://www.liveoak.bank/business-loans/sba-loans/ |
| 4 | Funding Circle US | Term-loan lender | Affiliate program open in all 50 states, via Rakuten. Per-lead commission plus a funded bonus (amounts not public) | https://fundingcircle.com/us/partner/affiliate |
| 5 | Bluevine | LOC / banking | Partner page (referral, affiliate, co-marketing) and Accountant Partner Program | https://www.bluevine.com/partners |
| 6 | Nav | Embedded financing marketplace | Configurable, compliant marketplace with a call-to-action API. Docs reportedly at api-docs.nav.com [3P] | https://www.nav.com/embeddable-financing |
| 7 | NerdWallet SMB referral program | Marketplace referral | SMB referral partner program | https://nerdwallet.com/p/small-business/smb-referral-program-overview |
| 8 | Balboa Capital | Equipment / vendor finance | Vendor financing program for equipment sellers; also franchise and SBA [3P] | https://www.balboacapital.com |
| 9 | ApplePie Capital | Franchise finance | Franchise-focused lender working with franchisees of 200+ partner brands | https://www.applepiecapital.com |
| 10 | Benetrends | Franchise funding (ROBS, SBA, equipment) | Franchise-funding specialist. Referral program not confirmed | https://www.benetrends.com |
| 11 | Huntington National Bank | Large SBA 7(a)/504 lender | Lift Local Business program. No public referral-partner program found | https://www.huntington.com/business/loans-and-financing |
| 12 | FundThrough | Invoice financing (embedded) | Public embedded guides (referral button and pages) | https://www.fundthrough.com/embedded/guides/ |

(Rows 8–11 are home pages because partner-specific pages were not confirmed. Check for a broker/vendor/referral section.)

---

## Not found / uncertain

- **All fetches were blocked.** Facts come from search-engine extracts of the URLs, so every quote and figure needs live verification.
- **Lendflow:** sandbox existence, document-upload endpoint spec, actual pricing rates, and contents of docs.lendflow.com.
- **Lendio:** public API docs and sandbox; status webhooks; embedded rev-share terms. The $125-per-application figure comes only from PartnerStack. Geographic and industry exclusions.
- **Fundbox:** public developer docs and sandbox; referral payout; current minimums (3 months/$30K vs 6 months/$100K); excluded industries and states.
- **OnDeck:** US enterprise API docs; ISO commission %; state exclusions (ND only vs NV/ND/SD).
- **Biz2Credit:** Biz2X docs, sandbox and webhook specifics; referral fee amounts; whether RBF is legally structured as a receivables purchase; conflicting term-loan revenue minimums ($100K vs $250K).
- **National Business Capital:** official eligibility (all figures are third-party); commission %; API.
- **Kapitus:** term/LOC/SBA specifics; commission; any API.
- **Credibly:** broker program terms; Lender API docs (known only via a third-party article); SBA maximum ($5M vs $600K).
- **Rapid Finance:** current product list; standard ISO commission (the 5% figure is from an older co-branded page); geographic and industry exclusions.
- **Stripe Capital:** platform revenue-share amount; Capital-specific sandbox behavior; platform eligibility by country (the platform docs are marked preview).
- **Capvant:** correct developer docs domain; US-specific eligibility; licensing and lender panel; no independent coverage found.
- **Bizcap US:** product structure (MCA vs loan) for each product; time-in-business minimum; broker commission; the $75K/month and 400 credit figures appear to be for Australia.
- **Regulatory:** searches covered FTC, CFPB, NY AG and CA DFPI sources. Absence of a finding is not proof that no action exists. Before signing, run a per-company search of state AG and DFPI enforcement databases, NY DFS and court dockets.
