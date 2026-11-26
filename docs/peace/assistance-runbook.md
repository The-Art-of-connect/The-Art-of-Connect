# Assistance Center runbook (for Peace's scheduled checks)

The founder's instruction: **problems are fixed; suggestions are proposed and built only after the founder approves.**
Reports live in `public.site_issues` (Owner Portal → Assistance Center, `/admin/assist`).

## Each check
1. `git checkout main && git pull`. Start Postgres if needed: `service postgresql start`.
2. Read the queue:
   `python3 -I scripts/peace/db.py "select id, kind, status, page_path, description, expected, device, owner_note, created_at from site_issues where status in ('new','approved') order by created_at"`
   Never read or copy members' private content (journals, Journey conversations, counseling, assessments, verification).
3. **Problems** (`kind = 'problem'`, `status = 'new'`):
   - Set `status = 'investigating'`. Reproduce from the description, page and code. Find the cause.
   - Fix on a branch `claude/assist-<short-id>`, run `npx tsc --noEmit -p .`, `npm test`, `su postgres -c "bash supabase/tests/run.sh"`, and `npx next build` (with `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy`).
   - Open a pull request, wait for checks, apply any migration with `scripts/peace/apply_migrations.py`, merge.
   - Record: `status = 'fixed'`, `peace_notes` = plain-language cause and fix, `pr_url`, `resolved_at = now()`, and a short kind `member_reply`.
   - If it can't be reproduced: `status = 'cannot_reproduce'` with what was checked.
   - **Always ask the founder instead of fixing** (set `status = 'needs_owner'` and explain in `peace_notes`) when the fix would touch:
     payments, pricing, Stripe, launch switches, legal documents, privacy or security rules, age or eligibility rules,
     Elite verification, deleting data, or anything that changes what members are promised.
4. **Suggestions**:
   - `status = 'new'` → write a proposal in `peace_notes` (what it would do, where, effort, any cost or risk) and set `status = 'proposed'`. Do not build.
   - `status = 'approved'` → build it (founder's `owner_note` takes precedence), test, PR, merge as above, then `status = 'built'`, `peace_notes` += what was built, `pr_url`.
   - `declined` → nothing.
5. Add a tracker/QA entry for anything new that members will see. Never mark it operational or owner-approved.
6. Keep all commercial launch restrictions, Stripe test mode, and the AI budget controls. Never include personal data in commits.
