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

1. **Run the database migration.** Paste `supabase/migrations/20261124000001_foundation.sql` into the Supabase SQL Editor and run it, or use `supabase db push` with the Supabase CLI.
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

## 4. Stripe configuration (test mode)

1. Create a Product and a recurring Price for each package. Enter each `price_…` ID in **Owner Portal → Pricing & packages**.
2. Add a webhook endpoint at `https://theartofconnect.com/api/stripe/webhook` for these events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`.
3. Live keys (`sk_live_…`) are **refused by the app** until live payments are authorized.

## 5. Netlify configuration

1. Add a new site and import it from GitHub (`the-art-of-connect/the-art-of-connect`). The build settings come from `netlify.toml`.
2. Add the environment variables from section 2.
3. Under Domain management, add `theartofconnect.com`, then update DNS at your registrar. HTTPS is issued automatically.

## 6. How launch works (nothing goes live by accident)

Opening any feature to the public needs **two keys**:

1. **Master lock.** Set `LAUNCH_LOCK=false` in Netlify, then redeploy.
2. **Individual switch.** In Owner Portal → Launch controls, turn on the feature and type `AUTHORIZE` to confirm.

The switches are: public registrations, live payments, Relationships, Business, Counseling, and counselor applications. The database enforces the same switches independently. While they are off, staff can preview every experience, but members cannot use them.

## 7. Testing the database security rules

The checks in `supabase/tests/rls_checks.sql` cover these rules:
- sign-ups are blocked while closed
- the owner bootstrap runs only once
- members can't change launch settings or their own account status
- counseling notes are visible only to the authoring counselor (not the owner)
- counselors can't see dating profiles
- anonymous visitors can join the waitlist but can't read it

Run them **only against a local or throwaway database**:

```bash
psql -f supabase/tests/stub.sql \
     -f supabase/migrations/20261124000001_foundation.sql \
     -f supabase/tests/rls_checks.sql
```
