# Stripe Financial Connections: research for a member-initiated "business proof-of-funds" statement

Research date: 2026-11-27. This is read-only research. No sign-up and no contact with Stripe.

**Source quality**
- **[V] Verified:** I downloaded the page from docs.stripe.com (Markdown version) or stripe.com and quote it exactly. Versions: SSA / Stripe Financial Connections Terms "Last modified: September 28, 2026"; Financial Connections Security Addendum "Last modified: April 20, 2026".
- **[S] Search snippet only:** the network proxy blocked support.stripe.com (HTTP 403). These quotes come from search-engine extracts of support pages. Check them on the live page before relying on them.

This is not legal advice. Have counsel review the FCRA/ECOA, GLBA, state privacy and securities ("accredited investor") questions.

---

## 1. How permissions and approval work

### Data permissions
- **What you get without extra permissions [V]:** "After collecting an account, you immediately receive access to the following information: Last four digits of the account number; Account category such as checking or savings; Account nickname, if available." Source: https://docs.stripe.com/financial-connections/fundamentals
- **Permission table [V]:** `payment_method` gives "Tokenized account and routing number (required for money movement)". `ownership` gives "Account owner names and mailing addresses". `balances` gives "Current and available balances". `transactions` gives "Pending and posted transactions". Source: same page.
- **`account_numbers` is not a permission value [V].** The Session `permissions` enum is only `balances`, `ownership`, `payment_method`, `transactions` (https://docs.stripe.com/api/financial_connections/sessions/create). `account_numbers` is a field on the Account object: "Details about the account numbers", with `identifier_type` of `account_number` or `tokenized_account_number` (https://docs.stripe.com/api/financial_connections/accounts/object). Full numbers are restricted: "Account numbers are tokenized by default ... Full account numbers for ACH processing off Stripe are available in certain cases to businesses who meet risk and eligibility criteria." Source: https://docs.stripe.com/financial-connections/fundamentals
- **Data minimization [V]:** "Consider the data required to fulfill your use case and request permission to access only the data you need. Requesting permissions that go beyond your application's scope might erode your users' trust". Source: fundamentals.
  - For proof-of-funds, request `balances` only. Add `ownership` only if you must show that the member owns the account. Do not request `transactions` or `payment_method`.
- **Scope is limited to what you asked for [V]:** "To protect the privacy of your user's data, account data accessible to you is limited to the data you've specified in the `permissions` parameter." Source: https://docs.stripe.com/financial-connections/other-data-powered-products?platform=web
- **Adding permissions means re-consent [V]:** "you can expand data permissions only by creating a new Financial Connections Session ... Your user must complete the authentication flow again". Source: same page.

### Authorized Purpose and the approval process
- **Live-mode gating [V]:** "You must have a completed Financial Connections registration to access balances in live mode. Visit your Dashboard settings ... to check the state of your registration or begin the registration process. Financial Connections test data is always available." Sources: https://docs.stripe.com/financial-connections/balances. The same sentence appears for ownership (https://docs.stripe.com/financial-connections/ownership) and transactions (https://docs.stripe.com/financial-connections/transactions).
- **Two-step approval [V]:** "Register (https://dashboard.stripe.com/financial-connections/application) for Financial Connections after we approve your account for live-mode access." Source: https://docs.stripe.com/financial-connections/other-data-powered-products?platform=web
- **Contractual Authorized Purpose [V]** (Stripe Financial Connections Terms §2.1(a), https://stripe.com/legal/financial-connections or https://stripe.com/legal/ssa): "At least 14 days before User intends to collect Connections Data for the first time, User must submit (i) its intended purpose for collecting, using, and processing Connections Data (the "Proposed Purpose"); and (ii) if User hosts the Express consents, the user interface ... Upon Stripe's written approval, the Proposed Purpose will become an "Authorized Purpose"".
- **Changes to the purpose [V]** (§2.1(b)): "If User wishes to change an Authorized Purpose ... User must submit the proposed change to Stripe for review and obtain Stripe's written approval at least 14 days before the proposed change is planned to take effect."
  - Implication: the proof-of-funds service is a new purpose. It needs its own submission or an amendment, separate from the existing eligibility-review purpose.
- **Financial Institutions [V]** (§2.4): such users must disclose that status "At least 14 days before accessing the Stripe Financial Connections Services".
- **Connect platforms [V]:** "Stripe platforms in the US can request permission from your accounts to retrieve additional data", which applies only where the platform is liable for negative balances. "For accounts where your platform isn't liable for negative balances, including Standard connected accounts ... The platform can't access additional bank account data on those accounts." Source: https://docs.stripe.com/financial-connections/connect-payouts
  - This proof-of-funds service doesn't need Connect. A Sessions API integration with `account_holder[type]=customer` is the documented route for "data-powered products".
- **Which permissions need review:** the public docs gate all three data permissions (`balances`, `ownership`, `transactions`) behind registration. The docs I could reach don't say whether `balances` alone gets lighter review than `transactions`. See the uncertain list.

## 2. Consent, disclosures, retention, disconnection and refresh

- **Stripe-hosted consent pane [V]:** in the auth flow, the user goes through "Provide consent: Users agree to share requested data". Also: "During the authentication flow, your users can see the data types that you've requested access to. They must provide their consent to share this data." Source: fundamentals.
- **Your own consent UI is invite-only [V]:** "This capability is in an invitation-only private preview ... Both require Stripe approval". Source: https://docs.stripe.com/financial-connections/pre-collected-consent
- **Platform's disclosure duty [V]** (FC Terms §2.2): "User must clearly and conspicuously disclose to each Connections End User the data User is receiving, and the Authorized Purpose ... User collects, uses, retains, discloses, and processes each Connections End User's Connections Data only in compliance with that Connections End User's Express Consent. During the Term and for at least 24 months after the end of the Term, User must maintain records of each Connections End User's Express Consent."
- **What Express Consent means [V]** (§5): "a Connections End User's express, informed, opt-in consent to User's collection, use, disclosure, and processing of that Connections End User's Connections Data for the Authorized Purpose."
- **When you must re-consent [V]** (§2.3(b)): "If ... User later materially changes the scope, purpose, security, sharing, or period of storage of that data, User must obtain a new Express Consent before those changes go into effect."
- **Merchant guidelines [S]**, from https://support.stripe.com/questions/financial-connections-merchant-guidelines:
  - "make the reasons why you are seeking to obtain end user data clear; disclose how you will use, store and share end user data in a transparent manner ... limit your business' use of end user data to that purpose"
  - "Neither you nor other merchants will be able to modify the Stripe consent pane."
  - Records Stripe may request: "Screenshots of the user interface screens or flows on which you show the purpose(s) ... including the date range that each unique version was live; and Your privacy policies".
  - "we recommend that you specify in your interface that disconnection will stop new financial account data from being shared but won't delete previously shared data or delete data from Stripe."
  - Complaints go to "complaints@stripe.com ... selecting "Linked financial accounts"".
- **Disconnection, platform side [V]:** "Disconnect a user's Financial Connections Account if you no longer need data access or if your user writes into you requesting disconnection. Alternatively, your users can disconnect their accounts themselves". After disconnecting, "you can't refresh their data and access previously refreshed data". Stripe then emits `financial_connections.account.disconnected`. Source: https://docs.stripe.com/financial-connections/disconnections
- **Disconnection, end-user terms [V]:** "Once your financial account has been disconnected, the Business User cannot access any subsequently refreshed financial account data from Stripe ... If you would like to request our Business User ... to delete any copies of your data they obtained through this Consumer Service, please contact the Business User directly." Source: Stripe Consumer Terms, Financial Connections Terms, https://stripe.com/legal/end-users
  - This means the platform has to run its own deletion channel.
- **Deletion requests [S]:** "deletion requests can also be emailed to privacy@stripe.com" and "Businesses must also delete the data from their own systems". Source: https://support.stripe.com/questions/how-can-my-users-disconnect-or-request-deletion-of-the-data-from-their-linked-financial-accounts
- **Retention and deletion duty [V]** (Security Addendum §2(c)): delete Connections Data "where required by Law, or ... reasonably promptly, and to the extent reasonably feasible, once retention ... is not necessary for ... (1) the Authorized Purpose, (2) business operations or other legitimate business purposes, or (3) compliance with Law".
- **Refresh [V]:** "All Financial Connections data retrievals are asynchronous." Refreshes happen through `prefetch` or the Refresh API. Two rules: "Check [`next_refresh_available_at`] before initiating a new balance refresh" and "Refreshes aren't allowed on inactive accounts."
- **Balance freshness [V]:** "In some instances only a `current` balance is returned, or a balance that is up to 24 hours stale." Also: "The `as_of` field on a balance is the date and time that the financial institution calculated this balance. This isn't the same as the date and time of balance data retrieval." Source: https://docs.stripe.com/financial-connections/balances
  - Implication: the statement's date D must be the `as_of` value, not the fetch time.
- **Stripe's own role [V]** (FC Terms §3.5): Stripe acts as "User's processor (e.g., service provider)" and also asks end users for consent so it can process data "as an independent controller". The Privacy Policy says: "You may revoke your bank connection at any time through your account settings or by contacting the merchant." Source: https://stripe.com/privacy

## 3. Restrictions on use

- **Core prohibitions [V]** (FC Terms §3.3): "User must not, and must not enable or allow any third party to: (a) use a Connections End User's Connections Data in any way if User has not obtained an appropriate Express Consent ...; (b) sell any Connections Data; (c) share the Connections Data, including with any third party for use in marketing or for the third party's marketing purposes; or (d) use or transfer the Connections Data for fraudulent purposes or otherwise in violation of Law."
- **Service providers [V]** (§3.2): sharing is allowed only with service providers bound by "obligations consistent with" the FC Terms, and only "for the purpose of providing services to User that implement the Authorized Purpose."
- **FCRA [V]** (§3.4): "Stripe is not a consumer reporting agency as defined in the FCRA. Except as Stripe's authorized representative approves, User must not use any Connections Data (a) in any way as a consumer report; or (b) to generate a consumer report under FCRA."
  - "FCRA" is defined to include the Equal Credit Opportunity Act (§5).
- **Notices and accuracy [V]:**
  - §3.7: you must provide end-user contact info if Stripe needs to send notices.
  - §3.8: report suspected inaccurate data to fc-intake@stripe.com.
  - §4: Stripe may give Data Sources your name, end-user names and "all Express Consents and related records". You must answer Stripe information requests "no later than 14 days" or face suspension.
- **Sharing a derived statement with other members (key open issue).**
  - "Connections Data" is defined as "data associated with a Connections End User's financial account that Stripe provides to User" (§5). The terms don't say whether a derived threshold attestation ("balance ≥ $X on D") counts as Connections Data.
  - Read literally, §3.3(c) is broad ("share the Connections Data, including with any third party").
  - On the other side:
    - Express Consent expressly covers "disclosure".
    - The consumer terms say Stripe provides "data categories (and related insights)".
  - Conclusion (my inference, not Stripe's statement): showing the statement to collaborators the member picks should be written explicitly into the Proposed Purpose. It should go ahead only if Stripe approves it in writing. Do not assume the derived statement falls outside §3.3.
- **Restricted Businesses [V]** (SSA §(ix)): you may not "use the Services to conduct a Prohibited or Restricted Business ... unless Stripe has pre-approved". The list (https://stripe.com/legal/restricted-businesses) includes:
  - "Investment and brokerage services", "Lending services" and "Other financial services" (contact sales)
  - "Equity crowdfunding (Limited availability...)" and "Crowdfunding platforms"
  - Under UDAAP: "'Get rich quick' schemes, including investment opportunities"
  - Under UDAAP: "Negative option marketing, negative option membership clubs"
  - Implication: if collaborators use these statements to pool investment, fundraise or lend, the platform could move into restricted categories.

## 4. Business accounts
- **Supported account types [V]:** Account `category` includes `cash` ("real funds held by the institution (e.g. a checking or savings account)"), `credit`, `investment` and `other`. Source: https://docs.stripe.com/api/financial_connections/accounts/object
- **Business mentioned in docs [V]:** the data-products guide lists the use case "Mitigate fraud when onboarding a customer or business by verifying the ownership information". Source: https://docs.stripe.com/financial-connections/other-data-powered-products?platform=web
- **Account holder [V]:** `account_holder.type` is `account` or `customer`. That records which Stripe object the link belongs to. It doesn't mark the bank account as consumer or business. Source: https://docs.stripe.com/api/financial_connections/sessions/create
- **Not found:** I found no explicit statement that business bank accounts are supported or excluded, and none on coverage differences (for example, treasury or business-banking portals). The consumer-facing terms call the end user a consumer. Plan for sole proprietors and personal accounts being linked, so FCRA analysis stays relevant.

## 5. Pricing [V]
Source: https://stripe.com/financial-connections (Pricing section)
- **Instant verification:** "$1.50 Per verified account"
- **Balances:** "10¢ Per successful API call"
- **Account owners:** "$1.50 Per successful API call"
- **Transactions:** "30¢ Per institution per account holder per month"
- **Custom pricing:** "available for companies with a high volume of API calls or unique business models."
- **Passthrough fees [V]** (FC Terms §2.7): "If any Data Source imposes fees ... Stripe reserves the right to pass on to User those fees".
- **Not confirmed:** whether `prefetch` and each Refresh API call are billed per call, and whether a balance refresh that fails is billed.

## 6. Security and SSA provisions
- **Security Addendum [V]** (attached to the FC Terms):
  - "comprehensive information security program" (§1.1)
  - Encryption "in transit ... and at rest" (§2(b))
  - Deletion (§2(c))
  - Vulnerability scans and penetration tests (§2(d))
  - Vendor oversight (§2(e))
  - "only authorized individuals that have a business need" (§2(f))
  - "Monitor ... and log any suspected unauthorized access" (§2(g))
  - Patching (§2(h))
  - Storage only in the "Approved Storage Jurisdictions", which for the US means "the fifty (50) states of the U.S. and the District of Columbia" (§2(i), §4.2)
  - Insurance (§2(j))
  - Background checks (§2(k))
  - "notify Stripe immediately at fc-intake@stripe.com" of unauthorized access, loss, use or disclosure (§3)
  - GLBA Safeguards Rule "if applicable" (§4.1)
- **SSA [V]** (https://stripe.com/legal/ssa):
  - §4.1: comply with the DPA.
  - §4.3: notify Data Incidents "no later than 48 hours".
  - §4.6: maintain "commercially reasonable administrative, technical, and physical safeguards".
  - The FC Terms §3 obligations "survive termination".

---

## Requirements checklist (complete before requesting live approval)

**A. Purpose and approval**
- [ ] Write a Proposed Purpose for proof-of-funds only, separate from the eligibility review. Submit it at least 14 days before the first live collection. Get Stripe's written approval (§2.1).
- [ ] State explicitly in the submission that a derived threshold statement is shown, at the member's direction, to specific in-platform recipients. Get written confirmation that this is not barred by §3.3(c).
- [ ] Ask Stripe whether its authorized representative approval under §3.4 is needed. Confirm in writing that the use is not a consumer report or a credit decision.
- [ ] Complete the Dashboard registration (https://dashboard.stripe.com/settings/financial-connections).
- [ ] Request `balances` only. Add `ownership` only if ownership must be shown. No `transactions`, no `payment_method`.

**B. Consent UI and text (shown before Stripe's pane, which can't be changed)**
- [ ] Platform name, and the data received: current/available balance and `as_of` time. State that account numbers and transactions are not collected.
- [ ] The Authorized Purpose in plain language: "to generate a dated statement that your balance was at or above an amount you choose, which only you decide whether to share."
- [ ] Who can see the statement: only recipients the member names, one by one. Nothing is shared by default, and data is never sold or used for marketing.
- [ ] Retention period for raw balances and for statements. How to revoke, disconnect and request deletion. Note that disconnecting doesn't delete data already shared or data held by Stripe [S].
- [ ] Separate opt-in checkbox, versioned, with timestamp. Don't bundle it with membership or eligibility consent.
- [ ] Keep consent records for the term plus at least 24 months. Keep screenshots of each UI version with the dates it was live.

**C. Privacy notice**
- [ ] Add a section on the proof-of-funds service: categories collected, purpose, recipients, Stripe's role as processor and independent controller, the US-only storage location, retention, rights and how to exercise them, and a contact for complaints.

**D. Purpose limitation and separation from eligibility-review data**
- [ ] Use separate Stripe Customer/Session objects and separate data stores, keyed by purpose. Proof-of-funds data is never read by eligibility-review code, and the reverse.
- [ ] Don't reuse accounts linked for the eligibility review. Require a new Session and consent.
- [ ] No scoring, ranking or credit/eligibility decisions from proof-of-funds data, and no feeding it into other features.

**E. Retention, deletion, revocation**
- [ ] Store only the threshold result plus the `as_of` value and the account display name and last4. Drop the raw balance after the statement is generated, or keep it for a short, defined period.
- [ ] Give statements an expiry (for example 30 days). The member can revoke recipient access at any time.
- [ ] A disconnect button calls the Disconnect API. Handle the `financial_connections.account.disconnected` webhook.
- [ ] Deletion workflow that also points users to Stripe (privacy@stripe.com [S]). Route complaints to Stripe as required.

**F. Statement disclaimers (on the statement and in the recipient view)**
- [ ] "Balance as reported by the financial institution at [as_of]. It may be up to 24 hours stale and can change at any time."
- [ ] Say it is not a guarantee that funds will remain or are unencumbered.
- [ ] Say it is not proof of solvency, creditworthiness or net worth, and not a credit report or consumer report.
- [ ] Say it doesn't establish accredited-investor or qualified-purchaser status, and is not an offer or solicitation.
- [ ] Recipients must not use it for credit, insurance, employment or housing decisions.
- [ ] Use a "member-generated, not verified by Stripe" footer. Don't use Stripe marks in a way that suggests endorsement.

**G. Security and audit logging**
- [ ] Written security program covering every Addendum §2(a)–(k) item. Storage in the US only. Penetration testing. Least-privilege access with background checks.
- [ ] Immutable audit log of:
  - consent granted (version, timestamp)
  - Session created and accounts linked
  - each refresh (`as_of` value, status)
  - statement generated (threshold, date)
  - each share grant and revoke, and each recipient view
  - disconnects and deletions
  - staff access
- [ ] Incident runbook: immediate notice to fc-intake@stripe.com, and to Stripe within 48 hours under SSA §4.3.
- [ ] Process for answering Stripe information requests within 14 days. Vendor contracts that pass down the FC obligations.

**H. Restricted-business screen**
- [ ] Confirm the platform and recipient use don't amount to investment or brokerage, lending, crowdfunding or "membership club" negative-option practices. Otherwise get Stripe's pre-approval.

---

## Not found / uncertain
1. Whether a derived threshold statement ("≥ $X") counts as "Connections Data" under §3.3(c). The terms are silent, so get written approval from Stripe.
2. The actual registration and application form fields, review criteria and timelines. The Dashboard page wasn't accessible.
3. Whether `balances` alone gets lighter review than `transactions`. The docs gate all data permissions the same way.
4. Explicit support for, and coverage of, business (non-consumer) bank accounts, and any differences in terms for business end users.
5. The exact billing for prefetch calls, failed refreshes and refresh-rate limits beyond `next_refresh_available_at`.
6. The support.stripe.com pages (merchant guidelines, deletion FAQ) were blocked by the proxy. The [S] quotes are search extracts and need checking on the live page.
7. Whether the platform's existing "eligibility review" use already falls under §3.4 FCRA/ECOA limits. Check this separately.
8. Whether Stripe treats the platform's in-app recipients as "third parties", or as members acting at the user's direction.
