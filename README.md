# The Art of Connect

A premium, membership-based platform connecting people through three experiences:

- **Relationships**: compatibility assessments, intentional dating, relationship development and couples' growth.
- **Business**: professional networking, partnerships, referrals and collaboration.
- **Counseling**: a confidential marketplace of credential-verified counselors.

The owner manages everything from a separate, role-protected **Owner Portal** at `/admin`.

**Status: pre-launch.** Public registrations, live payments and all three experiences are locked until the owner authorizes launch. See [docs/SETUP.md](docs/SETUP.md).

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, custom design system (`src/app/globals.css`) |
| Auth & data | Supabase: Postgres with row-level security, Auth, private Storage |
| Payments | Stripe Checkout and webhooks |
| Hosting | Netlify (`netlify.toml`, including security headers) |

## Architecture

```
src/
  app/
    (site)/        Public website: home, experiences, membership, legal
    (auth)/        Sign-in and join (join is invitation-only until launch)
    (member)/app/  Member area; each experience is gated separately
    admin/         Owner Portal (staff roles only)
    api/           Stripe checkout and webhook
    actions/       Server actions (waitlist, auth, audited admin actions)
  lib/             Auth/roles, launch controls, Supabase and Stripe clients
  middleware.ts    Session refresh; redirects anonymous visitors away from private areas
supabase/
  migrations/      Database schema, roles, row-level security
  tests/           Security checks for the database rules
```

### Security model

- **Defense in depth.** Every private page and action re-checks the user's role on the server. Database row-level security then enforces the same rules independently.
- **Roles.** The staff roles are `owner`, `admin`, `finance`, `support` and `moderator`. Each role sees only its portal sections.
- **Per-experience permissions.** `experience_access` grants Relationships, Business and Counseling separately. Grants come from a subscription or from the owner.
- **Counseling isolation.** Counseling has its own `counseling` schema and a separate client identity that is never linked to dating or business profiles. Clinical session notes are readable only by the counselor who wrote them, and not by the owner.
- **Launch locks.** Opening anything needs both the `LAUNCH_LOCK` environment switch and the owner's typed authorization in the portal. The database enforces the switches too.
- **Audit log.** Every Owner Portal change is recorded.
- **No secrets in code.** All keys come from environment variables (see `.env.example`).

## Local development

```bash
npm install
cp .env.example .env.local   # fill in Supabase/Stripe test values
npm run dev
```

The site runs without credentials. The private areas need Supabase.

## Contact

info@theartofconnect.com
