import "server-only";
import { serverSecret } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { templates } from "@/lib/email-templates";

/** The repository Peace repairs. The dispatch starts .github/workflows/peace-assist.yml immediately. */
export const ASSIST_REPO = "The-Art-of-connect/The-Art-of-Connect";

export function dispatchConfigured() {
  return Boolean(serverSecret("GITHUB_DISPATCH_TOKEN"));
}

/**
 * Starts Peace on a report right away (GitHub Actions, event-driven). Safe to call more than once: the repair
 * workflow claims the report atomically, so duplicates exit without doing anything.
 */
export async function dispatchIssue(issueId: string, reason: "submitted" | "approved" | "sweep" | "owner") {
  const db = createAdminClient();
  const token = serverSecret("GITHUB_DISPATCH_TOKEN");
  if (!db) return "unavailable";
  const { data: s } = await db.from("assist_settings").select("repairs_paused, immediate_enabled").maybeSingle();
  if (s?.repairs_paused) return "paused";
  if (!s?.immediate_enabled || !token) return "not_configured";
  try {
    const res = await fetch(`https://api.github.com/repos/${ASSIST_REPO}/dispatches`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: "site-issue", client_payload: { issue_id: issueId, reason } }),
    });
    const ok = res.status === 204;
    await db.from("site_issues").update({ dispatched_at: new Date().toISOString() }).eq("id", issueId);
    await db.from("site_issue_events").insert({ issue_id: issueId, actor: "system", action: ok ? "dispatched" : "dispatch_failed", detail: ok ? `Peace started (${reason})` : `GitHub responded ${res.status}` });
    return ok ? "dispatched" : "failed";
  } catch {
    await db.from("site_issue_events").insert({ issue_id: issueId, actor: "system", action: "dispatch_failed", detail: "Network error" });
    return "failed";
  }
}

/** Emails the member: acknowledgement, resolution, or an update. Never includes private content. */
export async function notifyReporter(issueId: string, stage: "received" | "fixed" | "built" | "update") {
  const db = createAdminClient();
  if (!db) return;
  const { data: i } = await db.from("site_issues").select("kind, reporter_id, member_reply").eq("id", issueId).maybeSingle();
  if (!i?.reporter_id) return;
  const { data: p } = await db.from("profiles").select("email, display_name").eq("id", i.reporter_id).maybeSingle();
  if (!p?.email) return;
  const r = await sendEmail(p.email, templates.assistUpdate({ name: p.display_name, stage, kind: i.kind as "problem" | "suggestion", note: stage === "received" ? null : i.member_reply }), { category: "account", idempotencyKey: `assist-${issueId}-${stage}` });
  if (r.ok) {
    await db.from("site_issues").update(stage === "received" ? { acknowledged_at: new Date().toISOString() } : { member_notified_at: new Date().toISOString() }).eq("id", issueId);
    await db.from("site_issue_events").insert({ issue_id: issueId, actor: "system", action: stage === "received" ? "acknowledged" : "member_notified", detail: stage });
  }
}

/** Every 15 minutes (cron): restart anything not yet picked up, and tell members about resolved reports. */
export async function assistSweep() {
  const db = createAdminClient();
  if (!db) return { dispatched: 0, notified: 0 };
  let dispatched = 0, notified = 0;
  const stale = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data: open } = await db.from("site_issues").select("id, status, dispatched_at, claimed_at")
    .in("status", ["new", "approved", "failed"]).order("priority").order("created_at").limit(20);
  for (const i of open ?? []) {
    const idle = (!i.dispatched_at || i.dispatched_at < stale) && (!i.claimed_at || i.claimed_at < new Date(Date.now() - 45 * 60_000).toISOString());
    if (idle && (await dispatchIssue(i.id, "sweep")) === "dispatched") dispatched++;
  }
  const { data: done } = await db.from("site_issues").select("id, status").in("status", ["fixed", "built"]).is("member_notified_at", null).limit(50);
  for (const d of done ?? []) { await notifyReporter(d.id, d.status === "built" ? "built" : "fixed"); notified++; }
  return { dispatched, notified };
}
