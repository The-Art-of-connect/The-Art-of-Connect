# Lender-Paid Referral Commissions for a Membership Platform: US Legal Landscape

**Prepared:** 2026-11-27 · **Scope:** educational research, not legal advice · **Subject:** a US membership platform (an LLC) earning a lender-paid commission (target 5% of funded principal) for referring business-owner members to commercial lenders, possibly via embedded-lending APIs where the platform collects and transmits applications.

> **Method and limits.** All research was web-search based. Direct page fetches of ecfr.gov, law.cornell.edu and several law-firm sites were **blocked by this session's network policy**, so the quotes below are drawn from search-engine extracts of the cited pages (primary sources preferred: statutes, regulator sites, Federal Register, court sites). Each quote should be re-verified against the live text before reliance. "Accessed" date for all sources: 2026-11-27 unless otherwise noted. Where only secondary (law firm / vendor) sources were available, that is flagged.

---

## Executive summary (10 bullets)

1. **The design choice that matters most is "pure referral" vs. "broker."** Collecting and transmitting full applications, advising members on which offer to take, or relaying approval decisions pushes the platform from "referral" into "broker" territory under most state regimes (California, NY, Florida, Georgia, Kansas, Missouri, Virginia, Utah, Texas, Connecticut). A 5% commission tied to funded principal is compensation "based on the terms of the specific transaction," which several state broker definitions use to decide who is a broker.
2. **California is the highest-risk state today and changes again in 2028.** The California Financing Law (CFL) requires a license to broker loans of CFL lenders. Unlicensed persons can be paid referral fees only under the narrow Fin. Code §22602 safe harbor, which requires (among other things) loan APR ≤36% and bars the referrer from "participating in the preparation of any loan documents, including credit applications." Embedded application collection likely falls outside that safe harbor. **AB 2116 (signed 2026-09-30)** brings non-loan small-business commercial financing (≤$500k, including MCAs/factoring) under the CFL, with a broker **license required from July 1, 2028**.
3. **Broker registration is already required (for sales-based financing / commercial financing) in Virginia, Connecticut, Missouri, Utah (providers), and Texas (deadline 2026-12-31).** North Dakota requires a "money broker" license that its regulator says covers commercial lending.
4. **State commercial financing disclosure laws (CA, NY, UT, VA, GA, FL, CT, KS, MO, TX, LA)** mainly place disclosure duties on the provider/financer. Brokers typically must pass along the lender's **unaltered** disclosures before presenting an offer (CA, NY). NY requires the provider to tell the recipient in writing "how, and by whom, the broker will be compensated"; Utah requires disclosure of amounts owed to a broker. Florida, Georgia and Kansas bar brokers from charging **advance fees**.
5. **SBA loans have their own regime.** A Referral Agent may be paid by the lender *or* the applicant, "but not both" (with a narrow packaging exception). Every referral fee on an SBA 7(a)/504 loan must be disclosed on **SBA Form 159**, signed by applicant, agent and lender. Lender Service Provider compensation "may not be directly charged to an Applicant." SOP 50 10 8.1 took effect 2026-10-01; verify the current referral-fee language there.
6. **ECOA/Reg B applies to referrers for anti-discrimination and anti-discouragement.** Under 12 CFR 1002.2(l), "creditor" includes a person who "regularly refers applicants... or selects or offers to select creditors" for purposes of §1002.4(a)-(b). Adverse-action notices remain the lender's duty but may be delivered through a third party that names each creditor.
7. **FCRA:** consumer reports on business owners are permissible generally only where the individual is personally liable (sole proprietor, guarantor). A platform that pulls or stores credit reports itself takes on FCRA user (and possibly consumer reporting agency) risk; letting lenders pull with explicit consent is safer.
8. **FTC Act §5 reaches small-business financing.** The FTC has pursued MCA providers (Yellowstone, RCG Advances, Richmond Capital) and a business-financing "broker" (Seek Capital: 2025 permanent ban, $48.3M judgment, partially suspended). State "mini-UDAAP" laws now explicitly cover commercial financing (California CCFPL regs 2023; New York FAIR Business Practices Act, effective 2026-02-17).
9. **Section 1071 (small-business lending data)**: the CFPB finalized a narrowed rule on 2026-05-01 with compliance moved to **2028-01-01**; it excludes MCAs. It applies to covered *financial institutions* (lenders), not pure referrers, but lenders may push data-collection duties into API integrations.
10. **Securities:** ordinary business loans and revenue-based financing to a member are not offered to investors and generally are not securities. Matching members with *investors* (equity crowdfunding, notes sold to the public) is. That requires a registered funding portal or broker-dealer, and transaction-based pay is a key sign of broker activity. Keep the commercial-lending referral program strictly separate from any investor-matching feature.

---

## 1. Commercial loan broker licensing

### 1.1 California: CFL broker license and the §22602 referral safe harbor

- **License requirement.** "Those who engage in the business of a finance lender or broker must obtain a license from the Commissioner" (Fin. Code §22100, as summarized in DFPI enforcement material). A "broker" is "any person engaged in the business of negotiating or performing any act as broker in connection with loans made by a finance lender."
  - DFPI CFL overview: https://dfpi.ca.gov/california-financing-law/about-california-financing-law/
  - DFPI form CFL-1603 (finder vs. broker): https://dfpi.ca.gov/wp-content/uploads/sites/337/forms/cfl/DFPI-CFL-1603.pdf. The form says a person who performs listed activities "is a broker within the meaning of Section 22004 of the Financial Code and is required to obtain a broker's license."
- **Scope limit.** A CFL broker license "only authorizes a broker to broker loans to licensed finance lenders", not banks or credit unions (DFPI overview, above).
- **Unlicensed referral safe harbor: Fin. Code §22602 (SB 197, 2015).** https://law.justia.com/codes/california/code-fin/division-9/chapter-3/article-3/section-22602/ (official: https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=FIN&division=9.&chapter=3.&article=3.)
  - "(a) A licensee that is a finance lender may pay compensation to a person that is not licensed pursuant to this division in connection with the referral of one or more prospective borrowers to the licensee, when all of the following conditions are met," including that "the referral leads to consummation of a commercial loan" and "the loan contract provides for an annual percentage rate that does not exceed 36 percent." The lender must also keep compensation records "for a period of at least four years" and report annually to the Commissioner.
  - **Prohibited referrer activities, which matter most for embedded applications:** "(c) The following activities by an unlicensed person are not authorized by this section: (1) Participating in any loan negotiation. (2) Counseling or advising the borrower about a loan. (3) Participating in the preparation of any loan documents, including credit applications." The list also covers contacting the lender for the borrower beyond the referral and obtaining the borrower's signature.
  - "(g) ... 'referral' means either the introduction of the borrower and the finance lender or the delivery to the finance lender of the borrower's contact information."
  - **Lender liability:** the lender is liable for the referrer's misrepresentations about the loan (§22602(b)), and §22603 requires the lender to give a written statement (10-point font or larger) that it may pay the referrer a fee, acknowledged in writing by the borrower.
  - DFPI 2016 interpretive letter: the safe harbor "appears to be narrowly crafted to permit compensation for unlicensed referral activity under limited conditions." https://dfpi.ca.gov/wp-content/uploads/sites/337/2019/03/OP-7408-4-27-16.pdf
- **Enforcement.** DFPI issues desist-and-refrain orders against unlicensed small-business financing websites. Example: Mission Capital, LLC (2025), where DFPI found it "was paid a fee for their brokering services." https://dfpi.ca.gov/wp-content/uploads/2025/03/D-R-Mission-Capital-LLC.pdf. Older regulation 10 CCR §1451(c) barred licensed lenders from paying unlicensed persons for "soliciting or accepting applications" (see LoanMe order: https://dfpi.ca.gov/wp-content/uploads/sites/337/2013/02/LoanMe-Inc.-DR.pdf).
- **AB 2116 (Ch. 823, Stats. 2026; signed 2026-09-30).** Brings "commercial financing providers" and "commercial financing brokers" of small-business financing (≤$500,000, including non-loan products such as MCAs and factoring) under the CFL. Substantive requirements begin 2028-01-01 and a **license is required from 2028-07-01**. Brokers must publish average and maximum APRs on their websites, and agreements made by unlicensed parties are reported to be unenforceable. Commentary describes the broker definition as compensated handling of a prospective recipient's sensitive data for a referral, plus "participat[ing] in negotiating the financing, advis[ing]... help[ing] prepare financing documents or applications, relay[ing] a provider's approval decision, or charg[ing] a recipient a fee for application-related services." The bill reportedly says a person "is not a broker solely because" of certain listed actions, but **I could not retrieve that exclusion list.** Secondary sources only:
  - Bill page: https://calmatters.digitaldemocracy.org/bills/ca_202520260ab2116
  - Senate Judiciary analysis (June 2026): https://sjud.senate.ca.gov/system/files/2026-06/ab-2116-schiavo-sjud-analysis_2.pdf
  - Venable (Nov 2026): https://www.venable.com/insights/publications/2026/11/california-expands-licensing-regime-to-commercial
  - MoFo (Oct 2026): https://www.mofo.com/resources/insights/261015-california-expands-california-financing-law
  - DLA Piper (Oct 2026): https://www.dlapiper.com/en-us/insights/publications/2026/10/california-ab-2116-extends-licensing-requirements-to-all-commercial-financing-providers

**Takeaway for California:** a platform that only introduces members or passes contact information, for loans at ≤36% APR from CFL-licensed lenders, may fit §22602. Collecting and transmitting credit applications through an API is expressly outside the safe harbor, so it likely needs a CFL broker license, or the API flow must be restructured so that the *lender* collects the application on its own hosted or white-label surface. Bank lenders are not CFL lenders, so the CFL broker license does not cover referrals to them (separate analysis needed).

### 1.2 North Dakota: money broker license
- NDCC ch. 13-04.1: "money brokering" covers arranging or providing loans, or "advertising or soliciting the right to find lenders or provide loans for those seeking funds for any purpose", and a license is required "if the borrower resides in North Dakota." https://ndlegis.gov/prod/cencode/t13c04-1.pdf
- ND DFI FAQ: the "broad definition of money brokering includes both consumer and commercial lending." https://www.nd.gov/dfi/about-dfi/non-depository/frequently-asked-questions-non-depository (FAQ page is several years old.)

### 1.3 Sales-based / commercial financing broker registration (in force or imminent)
| State | Who registers | Source + quote | Date |
|---|---|---|---|
| Virginia | Providers **and brokers** of sales-based financing | Va. Code §6.2-2228: "'Sales-based financing broker'... means a person that, for compensation or the expectation of compensation, obtains or offers to obtain sales-based financing from a provider for a recipient." §6.2-2229: "Each sales-based financing provider and sales-based financing broker shall pay an initial registration fee of $1,000 and an annual registration fee of $500." https://law.lis.virginia.gov/vacode/title6.2/chapter22.1/ | In force since 2022 |
| Connecticut | Providers **and brokers** (sales-based financing ≤$250k) | DOB: "Commercial Financing Provider or Broker Registration" via NMLS. https://portal.ct.gov/dob/consumer-credit-licensing-info/consumer-credit-licensing-information/commercial-financing-provider-or-broker-registration-information; Public Act 23-201: https://www.cga.ct.gov/2023/act/Pa/pdf/2023PA-00201-R00SB-01032-PA.PDF | Registration by 2024-10-01 |
| Missouri | **Brokers** (all commercial financing) | RSMo §427.300: "No person shall engage in business as a broker within this state for compensation, unless prior to conducting such business, the person has filed a registration with the division of finance." https://revisor.mo.gov/main/OneSection.aspx?section=427.300. The bond form sets the amount at "ten thousand dollars ($10,000)": http://finance.mo.gov/sites/finance/files/2025-03/commercial%20bond%20form.pdf | 2025 |
| Texas | Providers **and brokers** of commercial sales-based financing | HB 700 (Fin. Code ch. 398): "A person may not engage in business as a provider or a commercial sales-based financing broker for compensation in this state unless, before conducting business, the person registers with the Office of Consumer Credit Commissioner." https://capitol.texas.gov/tlodocs/89R/billtext/html/HB00700F.HTM; OCCC rules 7 TAC ch. 86: https://occc.texas.gov/wp-content/uploads/2026/06/csbf-rules-adoption-fc-070926.pdf | Existing businesses must register by **2026-12-31**, filing via NMLS since 2026-09-01 |
| Utah | **Providers** (brokers are defined but registration is on providers) | DFI: it is unlawful "to engage in a covered transaction as a provider without a valid registration" (Utah Code §7-27-201). https://dfi.utah.gov/non-depository/commercial-financing/ | 2023 |
| California | Providers and brokers (AB 2116) | See §1.2 | License from 2028-07-01 |

Note: Texas, Virginia and Connecticut regulate **sales-based financing** (MCA-like products). A pure term-loan referral may fall outside those regimes, but Missouri's covers "commercial financing" broadly.

### 1.4 Other states (uncertain)
Secondary sources list licensing or registration for commercial loan brokers in Nevada, Arizona, Florida (some real-estate secured), New Jersey, Minnesota, Nebraska (Loan Broker Act, Neb. Rev. Stat. §45-190 et seq.), and older loan-broker / advance-fee laws in North Carolina and Illinois. These sources are low quality and partly contradictory (e.g., Nebraska is listed both as requiring and not requiring a license). Example: https://www.funderintel.com/post/do-you-need-a-license-to-broker-business-loans (vendor blog, 2026). **Unverified. Each requires state-by-state counsel review.** Many state "loan broker" statutes are aimed at advance-fee schemes and may not apply where the broker takes **no fee from the borrower**, but that depends on each statute.

### 1.5 Referral vs. arranging (general pattern)
- Across regimes, "referral" (introduction or passing contact info) is treated more leniently than "brokering" (negotiating, advising, preparing applications, relaying decisions). See CA §22602(c) and (g), quoted above.
- Florida, Kansas and Utah exclude from "broker" any person "whose compensation is not based or dependent upon the terms of the specific commercial financing transaction obtained or offered" (Fla. Stat. §559.9611: https://flsenate.gov/laws/statutes/2023/559.9611; Kansas SB 345 enrolled: https://www.kslegislature.gov/li/b2023_24/measures/documents/sb345_enrolled.pdf). **A 5%-of-funded-principal commission depends on the funded amount, so it likely does *not* qualify for that exclusion.** A flat per-lead or flat subscription/marketing fee not tied to funding or terms might qualify. Confirm with counsel; flat fees may raise other issues, such as CA §22602, which requires that the referral "leads to consummation."

---

## 2. State commercial financing disclosure laws (CFDLs)

| State | Cite / threshold | Broker duties | Compensation disclosure |
|---|---|---|---|
| **California** (SB 1235; 10 CCR §900 et seq.) | Fin. Code §22800 et seq.; ≤$500k; effective 2022-12-09 | Broker must "transmit the unaltered disclosures received from the financer to the recipient" and then "provide evidence of transmission... to the financer, including the time of transmission." Broker defined as one who "for compensation" negotiates, advises, prepares documents, etc. (DFPI final text: https://dfpi.ca.gov/wp-content/uploads/sites/337/2022/06/PRO-01-18-Commercial-Financing-Disclosure-Regulation-Final-Text.pdf) | Broker fees are reflected in finance charge / disclosures (verify) |
| **New York** (FIS Art. 8, §801 et seq.; 23 NYCRR 600) | ≤$2.5M; effective 2023-08-01 | Broker must transmit unaltered disclosures "before communicating a specific commercial financing offer." 23 NYCRR 600.21: https://www.dfs.ny.gov/industry_guidance/regulations/final_financial_services/rf_finservices_23nycrr600_text | §600.21(f): if a broker is involved, the provider must inform the recipient in writing "of how, and by whom, the broker will be compensated." |
| **Utah** (Title 7 ch. 27) | ≤$1M; provider registration | Broker defined (amended 2024) | Provider must disclose "any amount the provider owes to a broker in connection with the commercial financing transaction" (SB 183: https://le.utah.gov/~2022/bills/sbillamd/SB0183.pdf) |
| **Virginia** (§6.2-2228 et seq.) | Sales-based financing; >$500k single txn exempt | Registration (above) | Verify |
| **Georgia** (O.C.G.A. §10-1-393.18, SB 90) | ≤$500k; txns on/after 2024-01-01 | "A broker may not assess, collect, or solicit an advance fee from a business to provide services as a broker" (bill text: https://www.legis.ga.gov/api/legislation/document/20232024/215610) | Not found |
| **Florida** (§§559.961-559.9615) | ≤$500k; 2024-01-01 | Advance-fee ban, with a carve-out for third-party application costs "made by check or money order payable to a party independent of the broker"; no false/misleading statements (ch. 559: https://www.flsenate.gov/Laws/Statutes/2025/Chapter559/All) | Not found |
| **Kansas** (SB 345, 2024) | ≤$500k; >5 txns/12mo; effective 2024-07-01 | Advance-fee ban; no "false or misleading representations or omitting any material fact" in the sale of broker services; AG enforcement and civil penalties (enrolled: https://www.kslegislature.gov/li/b2023_24/measures/documents/sb345_enrolled.pdf) | Not found |
| **Missouri** (§427.300) | Broad commercial financing | Broker registration + $10k bond (above) | Verify |
| **Connecticut** (CGS §36a-861 et seq.) | Sales-based ≤$250k | Broker registration (above) | Verify |
| **Texas** (HB 700, Fin. Code ch. 398) | Commercial sales-based financing | Broker registration by 2026-12-31; analysis cites civil penalty of "$10,000 per violation," capped at $100,000 (https://capitol.texas.gov/tlodocs/89R/analysis/html/HB00700E.htm) | Verify |
| **Louisiana** (R.S. 9:3137.10, HB 470 / Act 198 of 2025) | Revenue-based financing; effective 2025-08-01 | Disclosure only; Mayer Brown says no registration (https://www.mayerbrown.com/en/insights/publications/2025/08/louisiana-now-requires-disclosures-for-revenue-based-financing-transactions). Enactment of a separate 2024 broad CFDL (SB 335) **could not be confirmed** (https://www.legis.la.gov/legis/BillInfo.aspx?i=246616) | — |

**Pending or proposed (unconfirmed enactment as of 2026-11-27):** Maryland SB 881 / HB 1007 (2026) https://mgaleg.maryland.gov/2026RS/bills/sb/sb0881t.pdf; New Jersey S1760; Illinois HB 3477 (Small Business Truth in Lending Act) https://ilga.gov/ftp/legislation/104/HB/10400HB3477.htm.

---

## 3. SBA rules on referral and agent fees

- **13 CFR 103.1 definitions** (eCFR: https://www.ecfr.gov/current/title-13/chapter-I/part-103/section-103.1, which could not be fetched; quoted from search extracts):
  - Referral Agent: "a person or entity who identifies and refers an Applicant to a lender, or a lender to an Applicant. The Referral Agent may be employed and compensated by either an Applicant or a lender."
  - Lender Service Provider (LSP): an Agent carrying out lender functions such as originating, disbursing, servicing or liquidating SBA loans "for compensation from the lender."
- **13 CFR 103.5:** Agents must execute a compensation agreement. For LSPs, "compensation may not be directly charged to an Applicant or Borrower." A 2020 rulemaking (85 FR 7622, https://www.govinfo.gov/content/pkg/FR-2020-02-10/pdf/2020-02128.pdf) proposed adding "directly or indirectly," renaming Referral Agent to "Loan Broker," removing the two-master exception, and capping agent fees charged to applicants (e.g., 2% for $50k-$1M). **Whether these changes were finalized could not be confirmed.**
- **"Two masters":** SOP guidance (search extracts) says the referral agent "may be employed and compensated by either an Applicant or a Lender, but not both," except where the agent provides packaging to the applicant and takes a referral fee from the lender. SBA FTA Wiki: the fee "should only have been paid by an applicant or lender, not both." https://catran.sba.gov/ftadistapps/ftawiki/pdf/p.cfm?a=159+CAFS+Deck.pdf
- **SBA Form 159 (Fee Disclosure Form and Compensation Agreement):** https://www.sba.gov/document/sba-form-159-fee-disclosure-compensation-agreement. It "enable[s] lenders to report any fees paid to Third-Party Agents by lenders or borrowers," including referral fees the lender pays. It must be "completed, signed by all parties and a copy provided to SBA's fiscal and transfer agent" (SBA Form 1920: https://caweb.sba.gov/library/pdf/Form1920_Lenders_Application.pdf). Secondary sources: itemization is required where an agent's aggregate compensation exceeds $2,500.
- **SOP version:** SOP 50 10 8.1 took effect **2026-10-01** for loans numbered on or after that date (SBA Information Notice 5000-880695: https://legacy.sba.gov/document/information-notice-5000-880695-issuance-sop-50-10-81). One secondary source says referral fees remain allowed but must be on Form 159.
- **Practical:** a lender-paid fee is permitted for SBA loans if disclosed on Form 159. The platform must not *also* charge the member (other than for distinct packaging services). If the platform performs origination functions for the lender (API application intake), SBA may treat it as an **LSP** on a loan-by-loan basis, which requires an SBA-reviewed LSP agreement. Contingency-fee and borrower-fee caps found in secondary sources are **unverified**.

---

## 4. Federal consumer-finance and trade-practice laws

### 4.1 ECOA / Regulation B
- 12 CFR 1002.2(l): "For purposes of §§ 1002.4(a) and (b), the term creditor also includes a person who, in the ordinary course of business, regularly refers applicants or prospective applicants to creditors, or selects or offers to select creditors to whom requests for credit may be made." https://www.consumerfinance.gov/rules-policy/regulations/1002/2/
- Comment 2(l)-2 names referrers such as "real estate brokers, automobile dealers..." who "only accept applications and refer applicants to creditors". These must comply with §1002.4(a) (no discrimination) and (b) (no discouragement). A referrer is not liable for another creditor's violation unless it "knew or had reasonable notice." https://www.consumerfinance.gov/rules-policy/regulations/1002/interp-2/
- **Implication:** member eligibility screens, lender ranking, marketing copy and any "pre-qualification" filters must not discriminate or discourage on prohibited bases (race, sex, marital status, age, receipt of public assistance, etc.).
- **Adverse action (§1002.9):** for businesses with ≤$1M gross revenue, notice rules are similar to consumer rules (oral notice permitted). For >$1M, notice is due "within a reasonable time" with written reasons on request. Notices may be given through a third party, but the notice must identify each creditor on whose behalf it is given. https://www.consumerfinance.gov/rules-policy/regulations/1002/9/. If the platform relays lender decisions, its contract should allocate who sends notices.
- **MCAs:** in 2026 the CFPB retracted its 2023 position that MCAs are "credit" under ECOA (Goodwin, May 2026: https://www.goodwinlaw.com/en/insights/publications/2026/05/alerts-finance-fs-cfpb-retracts-position-cash-advances). Secondary source.

### 4.2 FCRA
- FTC staff (Tatelbaum letter, 2001-06-22, superseding a 2000 letter): "it is reasonable to view a business transaction in which an individual has accepted personal liability for the business debt as involving the consumer, thus providing a permissible purpose under Section 604(a)(3)(A)." https://www.ftc.gov/legal-library/browse/advisory-opinions/advisory-opinion-tatelbaum-06-22-01
- Bank regulators (FDIC FIL, 2001): no permissible purpose for a report on an individual "when that person would not be personally liable for repayment." https://www.fdic.gov/news/inactive-financial-institution-letters/2001/fair-credit-reporting-act
- **Implications:** (a) obtain written authorization from the owner/guarantor before any pull; (b) prefer that lenders pull reports themselves; (c) if the platform obtains reports for prequalification (soft pull), it is a user with permissible-purpose and adverse-action/risk-based duties to analyze; (d) if the platform assembles and furnishes consumer information about members to lenders for credit eligibility, analyze whether it becomes a "consumer reporting agency."

### 4.3 FTC Act §5 and FTC small-business financing actions
- **Yellowstone Capital** (MCA; filed 2020; settled for >$9.8M): the FTC alleged hidden fees and that Yellowstone promised no collateral or personal guaranty when contracts often required both. https://www.ftc.gov/legal-library/browse/cases-proceedings/182-3202-yellowstone-capital-llc-ftc-v
- **RCG Advances / Braun** (MCA): defendants "permanently banned from the merchant cash advance industry"; Braun to pay $20.3M. https://www.ftc.gov/legal-library/browse/cases-proceedings/192-3252-rcg-advances-llc
- **Richmond Capital** (2022 ban): https://www.ftc.gov/news-events/news/press-releases/2022/06/ftc-action-results-ban-richmond-capital-owner-merchant-cash-advance-debt-collection-industries
- **Seek Capital** (business-financing *intermediary*; filed 2024-11): it charged clients "thousands of dollars simply to open credit cards in the owners' names" while advertising access to business loans. Final order 2025-10-01: $48,280,328 judgment (partly suspended) and a permanent ban from "providing business financing." https://www.ftc.gov/news-events/news/press-releases/2025/11/seek-capital-ceo-are-permanently-banned-providing-business-financing-other-services-settle-ftc
- **Lessons:** representations about rates, approval odds, "no personal guarantee," "partnered lenders," and fees are all §5 exposure for an intermediary, not just for the lender.

### 4.4 UDAAP (federal and state)
- Federal Dodd-Frank UDAAP (12 U.S.C. §5531) is tied to "consumer" financial products. Commercial credit to a business is generally outside CFPB UDAAP, though sole-proprietor and guarantor issues blur this. **Not verified in a primary source this session.**
- **California CCFPL commercial-financing UDAAP regs (10 CCR §§1060-1062; finalized Aug 2023)** apply UDAAP to commercial financing to small businesses (≤$16M gross receipts) and require covered providers to file annual reports. https://dfpi.ca.gov/rules-enforcement/laws-and-regulations/california-consumer-financial-protection-law/ccfpl-commercial-financing-annual-report-information ; OAL approval: https://dfpi.ca.gov/wp-content/uploads/sites/337/2023/08/Order-Approved-by-Office-of-Administrative-Law.pdf. Whether "covered provider" includes brokers/referrers: **verify**.
- **New York FAIR Business Practices Act** (signed 2025-12-19, effective 2026-02-17) amends GBL §349 to add "unfair" and "abusive" practices, which commentators read as reaching business-to-business dealings; enforced by the AG. https://ag.ny.gov/press-release/2025/attorney-general-james-senator-comrie-and-assemblymember-lasher-celebrate

### 4.5 GLBA
- Regulation P: "Consumer means an individual who obtains... a financial product or service... to be used primarily for personal, family, or household purposes," and the rule "does not apply to information about individuals or other entities... that you collect only for business purposes." https://www.consumerfinance.gov/rules-policy/regulations/1016/3/ ; Fed FAQ: https://www.federalreserve.gov/frrs/regulations/frequently-asked-questions-about-regulation-p.htm
- **Implication:** GLBA privacy notices generally do not apply to pure business-credit referrals. However, (a) lender partners will contractually impose GLBA-grade security (FTC Safeguards Rule, 16 CFR 314) on vendors; (b) state privacy laws (e.g., CCPA/CPRA in California, where the B2B exemption expired 2023) and state data-breach laws still apply to owners' personal data (SSN, DOB, personal credit). Safeguards Rule "finder" coverage **was not confirmed** this session.

### 4.6 Dodd-Frank §1071 (small-business lending data) status
- CFPB final reconsideration rule published **2026-05-01**: "extend[s] its compliance date to January 1, 2028." https://www.consumerfinance.gov/1071-rule/ ; redline: https://files.consumerfinance.gov/f/documents/cfpb_1071-redline-final-rule_2026-05.pdf
- Secondary sources: rule effective 2026-06-30, one-year grace period through 2028-12-31. It narrows coverage to larger lenders, drops data points (application method, application recipient, denial reasons, pricing, number of workers) and **excludes MCAs** (Mayer Brown 2026-05: https://www.mayerbrown.com/en/insights/publications/2026/05/cfpb-issues-final-section-1071-rule-on-small-business-lending-data-collection ; Venable 2026-06: https://www.venable.com/insights/publications/2026/06/section-1071-small-business-lending-rule-narrowed).
- **Implication:** duties fall on covered lenders. A referral platform is not a "covered financial institution" unless it is the lender, but lenders may require API fields and firewall/"applicant demographic" handling. No current stay or injunction was found; **verify litigation status**.

---

## 5. Securities (brief)

- A business loan or revenue-based financing made by a lender to a member for the member's business, with no offering to public investors, generally is not a "security" under the *Reves* "family resemblance" test for notes. Commercial loans are a recognized non-security category. (SEC staff discussion summarized in https://www.sec.gov/info/smallbus/acsec/bradford_crowdfunding.pdf, a 2011 draft paper and not current guidance.)
- **Investor matching is different.** Equity crowdfunding must run through an intermediary that is "a broker-dealer or a funding portal that is registered with the SEC and FINRA" (https://www.sec.gov/resources-small-businesses/regulation-crowdfunding-guidance-issuers). SEC staff treats transaction-based compensation as a hallmark of broker-dealer activity; a safe harbor for referral pay applies only within Reg CF offerings (https://www.sec.gov/rules-regulations/staff-guidance/trading-markets-frequently-asked-questions/cfportal-faqs).
- **Takeaway:** a % commission for introducing members to *investors* (or to Reg D raises) risks unregistered broker-dealer activity. Keep any investor feature separate and counsel-reviewed.

---

## 6. Merchant cash advances (MCAs)

- **Legal theory:** an MCA is structured as a purchase of future receivables, not a loan, so usury laws do not apply if the funder truly bears risk. New York (where most MCA contracts are governed) applies *LG Funding, LLC v. United Senior Props. of Olathe*, 181 AD3d 664 (2d Dept 2020): courts weigh "(a) whether there is a reconciliation provision in the agreement, (b) whether the agreement has a finite term, and (c) whether there is any recourse should the merchant declare bankruptcy." The Court of Appeals in *Adar Bays* (2021) held "a transaction can be a loan if there is an absolute right to repayment." Source (NY court decision applying both): https://www.nycourts.gov/REPORTER/pdfs/2024/2024_31166.pdf
- **Recharacterization trend:** *In re Kossoff PLLC* (Bankr., 2026) recharacterized 19 MCA agreements as usurious loans despite disclaimers (Troutman, 2026-08-27: https://www.troutman.com/insights/in-re-kossoff-pllc-takeaways-for-smb-lenders-and-funders/).
- **State treatment:** MCAs ("sales-based financing") are the main target of the CFDLs and of broker registration in VA, CT, TX, MO, UT and (from 2028) CA licensing. Texas HB 700 also regulates automatic debits (not confirmed in detail). Federal: CFPB excluded MCAs from §1071 and retreated on ECOA coverage (2026). The FTC actively polices MCA deception (§4.3).
- **Implication:** including MCA funders on the platform significantly increases registration and reputational exposure. Many platforms either exclude MCAs or label them clearly as "not a loan" with cost (estimated APR) shown.

---

## 7. Practical safeguards commonly used

These are industry practices and regulatory expectations, not legal safe harbors.

1. **Compensation disclosure** to the member before application: who pays, how much (e.g., "up to 5% of funded amount, paid by the lender"), and that the member pays nothing to the platform. NY requires the provider to disclose "how, and by whom, the broker will be compensated"; CA §22603 requires a written referral-fee statement; SBA requires Form 159.
2. **No steering / ranking neutrality:** rank offers by member-relevant criteria (APR or total cost, term, speed), not by commission. Disclose any paid placement. If commissions differ by lender, either equalize them or disclose the variance. This reduces §5, state UDAAP (CA, NY "abusive"), and ECOA discouragement risk.
3. **Stay on the "referral" side of the line** (if not licensed): let lenders host the application (redirect, iframe or lender-owned white-label), with no advising, negotiating, document prep or decision relay. Otherwise obtain broker licenses and registrations (CA from 2028; VA, CT, MO, TX, ND now).
4. **Per-lender consent before data sharing:** an explicit, granular consent screen naming each lender that receives data. Do not "spray" applications to many lenders by default.
5. **Soft-pull prequalification** with written FCRA authorization; hard pull only by the chosen lender after the member selects an offer.
6. **Data minimization and security:** collect only what the lender needs; tokenized transfer; retention limits; Safeguards-Rule-style controls (encryption, MFA, vendor oversight, incident response); a state privacy-law review.
7. **No borrower-paid fees** (avoids advance-fee bans in FL/GA/KS, SBA two-master problems, and many state loan-broker statutes).
8. **Lender diligence:** use only licensed lenders (e.g., CFL-licensed for California commercial loans), require APR / total-cost disclosures and state CFDL compliance, cap APR (e.g., ≤36% matches CA §22602), and consider excluding or clearly segmenting MCAs.
9. **Marketing review:** no "guaranteed approval," "no personal guarantee," "lowest rate" or "partner" claims without substantiation (see Yellowstone, Seek Capital).
10. **Contracts:** referral agreements allocating CFDL disclosures, adverse-action notices, §1071 data handling, complaint handling, indemnities, and audit rights. Retain records 4 years (CA, NY).
11. **Fair-lending hygiene:** neutral eligibility rules, no demographic-based targeting of offers, monitoring complaint data.

---

## Questions to bring to a qualified attorney

1. Does our exact API flow (who hosts the form, who stores the data, who sees decisions) make us a "broker" under the CFL today, and a "commercial financing broker" under AB 2116 from 2028? What is in AB 2116's "not a broker solely because..." exclusion list?
2. Can we rely on Fin. Code §22602 for CFL-lender referrals, and how do we handle referrals to **bank** lenders (not CFL lenders) of California members?
3. In which states do we need broker registration or licensing now (VA, CT, MO, TX by 2026-12-31, ND, others such as NV, AZ, NE, MN, NJ, NC, IL), given our product mix (term loans vs. LOC vs. MCA)?
4. Does a 5%-of-principal commission make us a "broker" under the FL/KS/UT "compensation dependent on terms" test? Would a flat fee change our status in any state, and would it still satisfy §22602?
5. For SBA loans, are we a Referral Agent or a Lender Service Provider? What must appear on Form 159? Are there SOP 50 10 8.1 limits on lender-paid referral fees, contingency fees, or volume-based pay?
6. Is 5% commercially and legally defensible given state UDAAP "abusive"/"unfair" standards (CA CCFPL, NY FAIR Act) and lender APR impacts? Must we disclose commission variance across lenders?
7. Are we a "covered provider" under CA 10 CCR §1060, with an annual report duty?
8. FCRA: may we run soft pulls for prequalification? What authorization language do we need? Could we be deemed a consumer reporting agency by sharing member data with lenders?
9. Which state privacy laws (CCPA/CPRA etc.) apply to owner/guarantor data, and what contractual Safeguards-Rule obligations will lenders impose?
10. ECOA: who sends adverse-action notices, and how do we document that ranking and eligibility logic is non-discriminatory?
11. Should we exclude MCAs/revenue-based financing to reduce registration and recharacterization exposure?
12. Do our membership dues or any "premium" tier interact with broker-fee or advance-fee prohibitions?
13. Tax and corporate: does a licensing need justify a separate subsidiary (e.g., "XYZ Capital Services LLC") to hold licenses and bonds?
14. If we ever add investor matching, what securities registration or exemption applies?

---

## Not found / uncertain

- **Primary text could not be fetched** for eCFR (13 CFR 103, 12 CFR 1002), Cornell LII, or law-firm pages because of the session network policy. Quotes come from search extracts; re-verify all of them.
- **AB 2116** final broker definition, referral exclusions, and exact effective dates for each obligation (2028-01-01 vs. 2028-07-01) come from secondary sources only.
- **CA §22602(a)(3)** pre-approval lender duties (underwriting / credit report specifics) were not retrieved in full.
- **SBA:** current SOP 50 10 8.1 text on referral fees, contingency fees, and borrower-paid caps; whether the 2020 rule changes (Loan Broker rename, two-master exception removal, 2% cap) were finalized.
- **Louisiana SB 335 (2024)** broad CFDL: enactment status unknown. Act 198 (2025) RBF disclosure confirmed by secondary sources.
- **Missouri:** whether brokers also face fee disclosure rules; the statutory bond amount (the $10k figure comes from the DFI form).
- **Texas HB 700** automatic-debit provisions and final OCCC fee schedule.
- **Connecticut** 2025 SB 1257 fee changes (enactment unconfirmed).
- **Kansas** codified section numbers and penalty amounts.
- **Georgia / Florida / Kansas** compensation disclosure specifics (none found beyond advance-fee bans).
- **Other states' commercial loan broker licensing** (NV, AZ, NE, MN, NJ, NC, IL, VT, others): only low-quality secondary sources found.
- **Pending 2026 bills** (MD SB 881 / HB 1007, NJ S1760, IL HB 3477): status unconfirmed.
- **FTC Safeguards Rule** applicability to commercial-only "finders"; the federal UDAAP "consumer" limit was not verified against primary text.
- **Section 1071** litigation status after the 2026 rule.
- **CFPB 2026 MCA/ECOA retraction**: secondary source only.
