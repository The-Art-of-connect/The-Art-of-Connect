# Setup & launch guide

Everything below is configured **outside the code**. No keys or passwords belong in this repository.

## 1. Services you need

| Service | Purpose | What to create | Cost to start |
|---|---|---|---|
| **Supabase** (supabase.com) | Accounts, sign-in, database, private file storage | One project (choose a US region, enable daily backups) | Free tier to build; Pro (~$25/mo) recommended before launch for backups |
| **Netlify** (netlify.com) | Hosting for theartofconnect.com | A site linked to this GitHub repository | Free tier to start |
| **Stripe** (stripe.com) | Memberships and payments | An account; use **test mode** until launch | Per-transaction fees only |
| **Domain registrar** | theartofconnect.com | DNS records pointing to Netlify | Existing |
| **Email sending (SMTP)**, e.g. Resend, Postmark or Google Workspace | Sign-in and confirmation emails from info@theartofconnect.com | SMTP credentials, plus SPF/DKIM records on the domain | Free tiers available |

Needed later, before the related feature launches:
- **Identity verification** (e.g. Stripe Identity or Persona), for member and professional verification.
- **Video sessions** (e.g. Daily or Zoom Video SDK), for counseling video appointments.
- **A HIPAA-capable setup for counseling.** If counselors will keep clinical notes on the platform, you need a Business Associate Agreement (BAA) from Supabase (Team plan and up), and from any video or email provider that touches session data. Talk to a healthcare attorney before turning on counseling.
- **Legal documents**: Privacy Policy, Terms of Membership and a Counselor Provider Agreement, prepared by counsel. The site has placeholders for them.

## 2. Environment variables

Set these in **Netlify → Site configuration → Environment variables** (and in `.env.local` for local work). `.env.example` lists them all.

| Variable | Where to find it | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://theartofconnect.com` | No |
| `LAUNCH_LOCK` | Keep `true` until you authorize launch | No |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | No (public by design; protected by row-level security) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API | **Yes, never share** |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys (`sk_test_…`) | **Yes** |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → Developers → API keys (`pk_test_…`) | No |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → your endpoint (`whsec_…`) | **Yes** |

## 3. Supabase configuration

1. **Run the database migrations, in order.** Either paste each file from `supabase/migrations/` into the Supabase SQL Editor and run it, or use `supabase db push` with the Supabase CLI.
   - `20261124000001_foundation.sql`
   - `20261125000001_experiences_v2.sql`
   - `20261126000001_membership_enrollment.sql`
2. **Expose the experience schemas.** Go to Project Settings → Data API → Exposed schemas and add `relationships`, `business` and `counseling`.
3. **Turn off public sign-ups.** Go to Authentication → Sign In / Providers and switch off "Allow new users to sign up". (The database also refuses sign-ups while registrations are closed. This is a second lock.)
4. **Set the auth URLs.** Go to Authentication → URL Configuration. Set the Site URL to `https://theartofconnect.com` and add `https://theartofconnect.com/auth/callback` as a redirect URL.
5. **Set up custom SMTP** under Authentication → Emails, so sign-in emails come from your domain.
6. **Create your owner account:**
   1. In the SQL Editor, run: `insert into public.signup_allowlist (email, note) values ('YOUR-EMAIL', 'Owner');`
   2. Go to Authentication → Users → Add user, using that email and a strong password.
   3. In the SQL Editor, run: `select public.bootstrap_owner('YOUR-EMAIL');`

      This only works once. After that, owner rights are managed from the portal.
   4. Sign in at `/sign-in`. The Owner Portal is at `/admin`.
7. **Turn on multi-factor authentication** for your owner account (Authentication → Multi-Factor). This is strongly recommended.

## 4. Stripe configuration (sandbox / test mode)

**Webhook (required for subscriptions, payments, refunds and identity verification):**
1. In Stripe (Sandbox), open **Developers → Webhooks → Add endpoint**.
2. Endpoint URL: `https://www.theartofconnect.com/api/stripe/webhook`
3. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - `invoice.paid`, `invoice.payment_failed`
   - `charge.refunded`
   - `identity.verification_session.verified`, `identity.verification_session.requires_input`, `identity.verification_session.processing`, `identity.verification_session.canceled`
4. Copy the endpoint's **signing secret** (`whsec_…`) into Netlify as `STRIPE_WEBHOOK_SECRET`, marked as a secret. Then redeploy.

## 4a. Earlier Stripe notes

1. Create a Product and a recurring Price for each package. Enter each `price_…` ID in **Owner Portal → Pricing & packages**.
2. Add a webhook endpoint at `https://theartofconnect.com/api/stripe/webhook` for these events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`.
3. Live keys (`sk_live_…`) are **refused by the app** until live payments are authorized.

## 5. Netlify configuration

1. Add a new site and import it from GitHub (`the-art-of-connect/the-art-of-connect`). The build settings come from `netlify.toml`.
2. Add the environment variables from section 2.
3. Under Domain management, add `theartofconnect.com`, then update DNS at your registrar. HTTPS is issued automatically.

## 5b. Point theartofconnect.com at Netlify

If the domain still shows another provider's page, such as a Squarespace "under construction" page, its DNS records still point there. Change them where the domain is managed (Squarespace → Domains → theartofconnect.com → DNS):

1. In Netlify, go to **Domain management** and confirm `theartofconnect.com` and `www.theartofconnect.com` are added to the `theartofconnect` site.
2. At Squarespace, **delete** the existing Squarespace `A` records for `@` and the `www` `CNAME`. Keep any email (MX/TXT) records.
3. Add these records:
   - `A` record: host `@`, value `75.2.60.5` (Netlify's load balancer)
   - `CNAME` record: host `www`, value `theartofconnect.netlify.app`
4. DNS changes usually take effect within an hour, but can take up to 48 hours. Netlify then issues the HTTPS certificate automatically.

## 6. How launch works (nothing goes live by accident)

Opening any feature to the public needs **two keys**:

1. **Master lock.** Set `LAUNCH_LOCK=false` in Netlify, then redeploy.
2. **Individual switch.** In Owner Portal → Launch controls, turn on the feature and type `AUTHORIZE` to confirm.

The switches are: public registrations, live payments, Relationships, Business, Counseling, and counselor applications. The database enforces the same switches independently. While they are off, staff can preview every experience, but members cannot use them.

## 7. Testing the database security rules

There are 29 checks in two files.

`supabase/tests/rls_checks.sql` covers these rules:
- sign-ups are blocked while closed
- the owner bootstrap runs only once
- members can't change launch settings or their own account status
- counseling notes are visible only to the authoring counselor (not the owner)
- counselors can't see dating profiles
- anonymous visitors can join the waitlist but can't read it

`supabase/tests/rls_checks_v2.sql` covers these:
- couples can only be created through the secure "start a couple" step
- only the invited email address can accept a partner invitation
- partners can't read each other's private reflections
- couples never appear to singles in matchmaking
- the owner can't read private journals
- licensed applicants must provide license details; coaches don't need them

Run them **only against a local or throwaway database**:

```bash
psql -f supabase/tests/stub.sql \
     -f supabase/migrations/20261124000001_foundation.sql \
     -f supabase/migrations/20261125000001_experiences_v2.sql \
     -f supabase/tests/rls_checks.sql \
     -f supabase/migrations/20261126000001_membership_enrollment.sql \
     -f supabase/tests/rls_checks.sql \
     -f supabase/tests/rls_checks_v2.sql \
     -f supabase/tests/rls_checks_v3.sql
```

`rls_checks_v3.sql` (22 checks) covers enrollment and pricing:
- prices stay hidden until the owner publishes them, and only the owner can publish
- sign-up requires a date of birth meeting the owner-set minimum age (40 by default)
- the date of birth is removed from account metadata after sign-up, and staff can't read it
- referral codes are recorded
- promo codes are validated without exposing the promotions table

The pricing calculator has its own unit tests: `npm test`.

## 8. Setting prices and opening enrollment

1. **Set prices.** In Owner Portal → Pricing & packages, set every price, bundle discount, annual discount, setup fee, add-on and professional package. The live preview at the bottom shows exactly what customers will see.
2. **Publish pricing.** Type `PUBLISH` (owner only). Prices then appear on the Memberships page. This does **not** open enrollment.
3. **Open enrollment.** Set `LAUNCH_LOCK=false` in Netlify, then turn on **Public registrations** and **Live payments** in Launch controls (type `AUTHORIZE`). Customers can then build a membership, register, confirm their email, complete onboarding and pay, with no invitation or approval needed.

## 9. Social sharing images

The preview cards in `public/og/` are generated from the site's photography and fonts. After changing photos, regenerate them with:

```bash
node scripts/generate-og-images.mjs
```

## Applying database updates securely (GitHub Action)

Database migrations can be applied without pasting SQL and without sharing your database password with anyone:

1. In Supabase, open **Connect** and copy the **Session pooler** connection string (URI). Put your database password in it.
2. In GitHub, open the repository → **Settings → Environments → New environment** named `production-database` (optionally add yourself as a required reviewer), then add an environment secret named `SUPABASE_DB_URL` with that connection string.
3. Open **Actions → Database migrations → Run workflow**:
   - **check** — read-only. Lists every migration as applied or PENDING and runs the security verification.
   - **apply** with `APPLY` typed in the confirm box — applies only the pending migrations, in order, each in its own transaction, stops at the first error, records each in `public.applied_migrations`, then re-runs the security verification.

The secret is stored encrypted by GitHub; it is never printed in logs or committed to the repository.

## Journey (OpenAI) and Journey Plus (Stripe)

- **OpenAI:** add `OPENAI_API_KEY` in Netlify. Then, in Owner Portal → Journey Intelligence Center: add approved models with their current per-million-token prices, set the company and owner-testing budgets, set each membership's caps, add the realtime voice model and per-minute rate for Talk to Journey, test privately and run the evaluation scenarios. Billable usage stays off until you type AUTHORIZE.
- **Stripe webhook events** (in addition to the membership events): `checkout.session.completed`, `payment_intent.succeeded` and `payment_intent.payment_failed`. Journey Plus messages, Private Sessions and Auto-Reload access are granted only when these confirm payment.
