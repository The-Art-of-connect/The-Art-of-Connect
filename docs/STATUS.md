# Platform status

_Last updated with the membership enrollment and 40+ launch release._

The platform is **pre-launch**:
- Public registration, live payments, all three experiences and professional applications are **off**.
- Turning any of them on needs both `LAUNCH_LOCK=false` in Netlify **and** the owner's typed authorization in Owner Portal → Launch controls.

## Membership enrollment (this release)

**Positioning**
- Exclusively for adults 40+.
- "Life after 40. Connection with intention."
- No invitation-only language anywhere on the public site.

**Build Your Membership** (`/membership`)
- Choose any experiences. The tier follows automatically: Signature (1), Premier (2) or Elite (3).
- Monthly or annual billing.
- A relationship status question that appears only when In Love is chosen, plus the couples upgrade.
- Add-ons and promo codes.
- A live summary: each experience's value, bundle savings, monthly or annual total, annual savings and amount due today.
- A comparison of the three tiers, and shareable links (`?experiences=business,life,love&billing=annual`).

**Pricing is fully owner-configured**
- Owner Portal → Pricing & packages controls names, descriptions, prices, bundle and annual discounts, setup fees, the couples upgrade, add-ons, professional packages, onboarding fees, benefits and eligibility notes.
- **No prices are in the code, and none are set yet.** Prices stay hidden until the owner types PUBLISH, and the database enforces this.

**Enrollment flow, once launched**
1. Build membership
2. Register, with date of birth checked against the owner-set minimum age
3. Confirm email
4. Onboarding: agreements recorded as consents
5. Stripe Checkout: one unified subscription, priced on the server

No invitation or owner approval is needed.

**Members can**
- add or remove experiences;
- upgrade or downgrade;
- switch between monthly and annual billing (Stripe prorates).

The couples upgrade gives the partner In Love access through their own secure login.

**Marketing**
- A branded share image for each page.
- Per-page search engine titles and descriptions, canonical URLs, sitemap, robots rules and structured company data.
- First-party campaign tracking (UTM tags) and referral links.
- Owner-managed promo codes and public launch offers.
- Aggregate campaign analytics. No third-party trackers.

**Until launch:** "Membership enrollment opens soon", with an optional notify-me list that records the membership each person built.

**Not yet verified against live services:**
- **Stripe checkout and plan changes** are built but untested until Stripe test keys are added.
- **The age check** is based on the date of birth people enter. Government-ID age verification would need an identity provider (e.g. Stripe Identity or Persona).

## Works today (no configuration needed)

- The public website, built on the official logo and signature colors:
  - home page
  - In Business, In Life and In Love pages
  - For Professionals page
  - Membership page
  - draft legal pages
- A full-screen mobile menu. Layouts were checked on phone, tablet and desktop.
- All text meets WCAG AA contrast on Onyx. This was checked automatically across every public page.
- Security headers, and noindex / no-store on private areas.
- Redirects from the old addresses: `/relationships` goes to `/love`, `/counseling` to `/life`.

## Works once Supabase is connected (see `docs/SETUP.md`)

**Invitations and interest**
- Invitation requests, including whether In Love interest is as a single or a couple.
- Professional interest forms, separating licensed clinicians from coaches, mentors and other nonclinical professionals.

**Sign-in and access**
- Sign-in, invitation-only account creation, and email confirmation.
- Role-based Owner Portal: overview, analytics, members, professional applications and pre-launch interest, access & referrals, memberships, pricing & packages, payments, financial reports, marketing & promotions, support, moderation, and launch controls. Every change is written to an audit log.
- Per-experience permissions on one unified account.

**Database protections, verified by 29 automated checks**
- Singles and couples are separated.
- Partner invitations are secured by a secret link and the invited email address.
- Shared couple goals are visible to both partners; private reflections are visible only to their author.
- Private journals are author-only; the owner cannot read them.
- Clinical session notes are visible only to their author.
- Consent records.

## Structure in place, features in development

These are designed in the database and shown as "In development" cards in the member area, but they don't yet have working screens:

- **In Life:** assessments and exercises, journaling screens, growth pathways and goals.
- **In Love:** compatibility scoring and matchmaking, the partner invitation emails and acceptance screen, couple goals screens.
- **In Business:** professional profiles and introductions.
- **Professionals:** profiles, availability, appointment scheduling, consent-based referrals, and credential document upload.
- **Owner Portal:** content management, the assessment library, announcements, and owner MFA enforcement in the app. MFA can already be turned on in Supabase.
- **Account recovery screens:** password reset. Supabase provides the underlying email flow.

## Requires configuration (credentials from you)

| What | Needed for |
|---|---|
| Supabase project URL, anon key, service role key | Accounts, data, Owner Portal |
| Stripe test keys and webhook secret | Membership checkout (test mode) |
| Email provider (SMTP) for info@theartofconnect.com | Sign-in, invitations, partner invitations |
| Netlify environment variables | All of the above (`LAUNCH_LOCK=true` and `NEXT_PUBLIC_SITE_URL` are already set) |

## Business decisions needed from you

1. **Pricing.** Enter it in Owner Portal → Pricing & packages, then publish. That covers each experience's monthly price, bundle discounts, the annual discount, setup fees, the couples upgrade, add-ons, professional packages and onboarding fees.
2. **Legal documents.** Privacy Policy, Terms, a Professional Agreement and a consent language review, prepared by counsel.
3. **Clinical scope.** Whether licensed clinicians will keep any client records on the platform. If so, HIPAA requirements and BAAs must be established first. The site makes no HIPAA claims.
4. **Credential verification process.** Which license lookups and checks you require before approving a professional.
5. **Imagery.** The In Business and In Love photos appear to show adults under 40. Please supply licensed photography of diverse adults 40+, and confirm commercial rights for all photos.
6. **Legal name on the logo.** The company is The Art of Connect, LLC, but the logo artwork reads "The Art of Connection, LLC".

## Not claimed

The platform does **not**:
- claim to be HIPAA compliant;
- offer clinical treatment;
- offer crisis services. The In Life page includes 988 and 911 guidance.
