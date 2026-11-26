# Assistance Center runbook (Peace)

The founder's instruction: **every member gets immediate help. Problems are fixed; suggestions are proposed and built
only after the founder approves. Sensitive changes always go to the founder first.**

Reports live in `public.site_issues` (Owner Portal → Assistance Center, `/admin/assist`). Every action is recorded in
`public.site_issue_events`. Use `python3 -I scripts/peace/db.py "<sql>"` for the database.

## How Peace is started
1. **Immediately** — when a member submits a report, the website sends a `site-issue` dispatch to GitHub and
   `.github/workflows/peace-assist.yml` runs Peace for that one report (the report is claimed first).
2. **When the founder approves** a suggestion, the same dispatch starts Peace to build it.
3. **Backup** — every 15 minutes the website restarts anything not yet picked up; a twice-daily scheduled session
   also reviews the queue.

## Claiming (never skip)
`select public.assist_claim('<id>', '<runner>')` must return `claimed` before any work. Any other answer
(`paused`, `in_progress`, `not_open`, `attempt_limit`, `daily_limit`, `budget`, `busy`) means **stop**: do nothing else.
The workflow claims for you; scheduled sessions claim each report themselves.

## Each report
Read it: `select id, kind, status, priority, page_path, description, expected, device, owner_note, attempts from site_issues where id = '<id>'`.
Never read members' private content (journals, Journey conversations, counseling, assessments, verification).

**Is it sensitive?** If the change would touch payments, pricing, Stripe, launch switches, legal documents, privacy or
security rules, age or eligibility rules, Elite verification, members' data (deleting or altering it), or what members
are promised → set `status = 'needs_owner'`, explain in `peace_notes` (what is wrong, the proposed fix, its risk), log
`escalated`, stop.

**Duplicate?** If an open or fixed report already covers the same problem → set `status = 'duplicate'`,
`duplicate_of = '<other id>'`, `member_reply` = a short kind note, log `duplicate`, stop.

### Problems (low-risk)
1. Reproduce from the description, page and code. If it can't be reproduced → `status = 'cannot_reproduce'`, explain
   what was checked in `peace_notes`, log, stop.
2. Fix on branch `claude/assist-<first 8 of id>`. Keep the change as small as possible.
3. Test before deploying — all must pass: `npm run typecheck && npm test && npm run build` and the database security
   checks (`supabase/tests/run.sh`). Add a regression test when practical. If tests fail and you can't fix it safely →
   `status = 'failed'`, explain, log, stop (the database stops retrying after the attempt limit and escalates).
4. `gh pr create` (title: "Assistance: <short summary>"; body: cause, fix, tests, report id), then `gh pr merge --squash`.
   Apply any new migration with `python3 -I scripts/peace/apply_migrations.py <file>` *before* merging.
5. **Rollback reference:** record the merge commit in `rollback_ref`.
6. **Post-deployment check:** wait ~4 minutes for Netlify, then `curl -s https://www.theartofconnect.com/api/health` must
   report `"status":"ok"`, and the affected page must load (HTTP 200 or the expected redirect). If not → revert:
   `git revert <merge sha>` on a branch, PR, merge; set `status = 'rolled_back'`, explain, log `rolled_back`, and the report
   goes to the founder.
7. Record: `status = 'fixed'`, `peace_notes` = plain-language cause and fix, `pr_url`, `resolved_at = now()`,
   `member_reply` = one or two kind sentences for the member (no technical jargon), log `fixed`.
   The website emails the member automatically.

### Suggestions
- `status = 'new'` → write a proposal in `peace_notes` (what it would do, where, effort, any cost or risk), set
  `status = 'proposed'`, log `proposed`. **Do not build.**
- `status = 'approved'` → build it following the founder's `owner_note`, test, PR, merge and check exactly as above, then
  `status = 'built'`, record what was built and the `pr_url`, log `built`.

## Always
- Keep commercial launch restrictions, Stripe test mode and AI budget controls.
- Add a Development Tracker / QA entry for anything new members will see; never mark it operational or owner-approved.
- No personal data in commits or pull requests; no model names. End commits with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Log every step: `insert into site_issue_events (issue_id, actor, action, detail, run_url) values (...)`.
