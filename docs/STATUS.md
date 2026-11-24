# Platform status

_Last updated with the In Business · In Life · In Love restructure._

The platform is **pre-launch**:
- Public registration, live payments, all three experiences and professional applications are **off**.
- Turning any of them on needs both `LAUNCH_LOCK=false` in Netlify **and** the owner's typed authorization in Owner Portal → Launch controls.

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

1. **Membership structure and pricing.** This covers members, couples and professionals, plus any setup fees. Nothing is priced or promised on the site until you approve.
2. **Legal documents.** Privacy Policy, Terms, a Professional Agreement and a consent language review, prepared by counsel.
3. **Clinical scope.** Whether licensed clinicians will keep any client records on the platform. If so, HIPAA requirements and BAAs must be established first. The site makes no HIPAA claims.
4. **Credential verification process.** Which license lookups and checks you require before approving a professional.
5. **Imagery.** The site uses the three photos you supplied. Confirm you hold the rights to use them commercially, and send any additional photos you'd like used.
6. **Legal name on the logo.** The company is The Art of Connect, LLC, but the logo artwork reads "The Art of Connection, LLC".

## Not claimed

The platform does **not**:
- claim to be HIPAA compliant;
- offer clinical treatment;
- offer crisis services. The In Life page includes 988 and 911 guidance.
