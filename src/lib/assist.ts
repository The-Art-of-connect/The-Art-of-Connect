import "server-only";
import { env, serverSecret } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { ownerAlertAddress, sendEmail } from "@/lib/email";
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

// ─── Technical Administrator (founder approval, Nov 26 2026) ───────────────────────────────

const monthStart = (d = new Date()) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const dollars = (c: number) => `$${(c / 100).toFixed(2)}`;

/** AI spend recorded for repairs between two dates (cents). */
export async function aiSpendCents(from: Date, to: Date) {
  const db = createAdminClient();
  if (!db) return 0;
  const { data } = await db.from("site_issue_events").select("ai_cost_cents").gte("created_at", from.toISOString()).lt("created_at", to.toISOString()).not("ai_cost_cents", "is", null);
  return (data ?? []).reduce((s, r) => s + Number(r.ai_cost_cents ?? 0), 0);
}

/** Pure: which budget alert (if any) is due. Each threshold is sent once per month. */
export function budgetAlertDue(spent: number, budget: number, sent: { a75: string | null; a90: string | null }, month: string): 75 | 90 | null {
  if (budget <= 0) return null;
  if (spent >= budget * 0.9 && sent.a90 !== month) return 90;
  if (spent >= budget * 0.75 && sent.a75 !== month && sent.a90 !== month) return 75;
  return null;
}

/** Emails the founder at 75% and 90% of the monthly AI budget. The hard stop itself is in assist_claim. */
export async function budgetAlerts() {
  const db = createAdminClient();
  if (!db) return null;
  const { data: s } = await db.from("assist_settings").select("id, monthly_budget_cents, alert_75_sent_for, alert_90_sent_for").maybeSingle();
  if (!s) return null;
  const start = monthStart();
  const spent = await aiSpendCents(start, new Date(Date.now() + 60_000));
  const due = budgetAlertDue(spent, s.monthly_budget_cents, { a75: s.alert_75_sent_for, a90: s.alert_90_sent_for }, ymd(start));
  if (!due) return null;
  const r = await sendEmail(ownerAlertAddress(), templates.ownerAlert({
    title: `Technical support budget: ${due}% used`,
    summary: `Peace has used ${dollars(spent)} of the ${dollars(s.monthly_budget_cents)} monthly AI budget for technical support and repairs. Repairs stop automatically at the limit and will not exceed it without your authorization.`,
    portalPath: "/admin/assist",
  }), { category: "owner_alert", idempotencyKey: `assist-budget-${ymd(start)}-${due}` });
  if (r.ok) await db.from("assist_settings").update(due === 90 ? { alert_90_sent_for: ymd(start), alert_75_sent_for: s.alert_75_sent_for ?? ymd(start) } : { alert_75_sent_for: ymd(start) }).eq("id", s.id);
  return due;
}

/** Files (or counts) a problem found by monitoring. Repeats never create duplicate repairs. */
export async function monitorReport(fingerprint: string, page: string, description: string, critical: boolean) {
  const db = createAdminClient();
  if (!db) return null;
  const { data } = await db.rpc("assist_monitor_report", { p_fingerprint: fingerprint, p_page: page, p_description: description, p_critical: critical });
  if (data) await dispatchIssue(data as string, "sweep");
  return data as string | null;
}

/** Pages checked every hour. Each must answer without a server error. */
export const MONITORED_PAGES = ["/", "/membership", "/elite", "/business", "/life", "/love", "/sign-in", "/join", "/legal"] as const;

/** Proactive monitoring, at most hourly: site health, key pages, payment safety. */
export async function healthCheck(force = false) {
  const db = createAdminClient();
  if (!db) return null;
  const { data: s } = await db.from("assist_settings").select("id, last_health_at").maybeSingle();
  if (!s) return null;
  if (!force && s.last_health_at && Date.parse(s.last_health_at) > Date.now() - 55 * 60_000) return null;
  const base = env.siteUrl.replace(/\/$/, "");
  const problems: { fp: string; page: string; text: string; critical: boolean }[] = [];
  try {
    const res = await fetch(`${base}/api/health`, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    const h = (await res.json().catch(() => ({}))) as { status?: string; database?: string; schema?: string; stripe?: string; stripe_publishable?: string };
    if (h.status !== "ok") problems.push({ fp: "health:status", page: "/api/health", text: `Health check reported "${h.status ?? res.status}" (database: ${h.database ?? "unknown"}).`, critical: true });
    if (h.schema === "outdated") problems.push({ fp: "health:schema", page: "/api/health", text: "The database schema is reported as outdated.", critical: true });
    // Commercial launch is not authorized: live payment keys are a critical problem (never switch modes automatically).
    if (h.stripe === "live" || h.stripe_publishable === "live") problems.push({ fp: "health:stripe-live", page: "/api/health", text: "Live Stripe keys are configured before the founder authorized the commercial launch. Payments must stay in Sandbox. Founder decision required.", critical: true });
  } catch {
    problems.push({ fp: "health:unreachable", page: "/api/health", text: "The health check did not respond within 15 seconds.", critical: true });
  }
  for (const p of MONITORED_PAGES) {
    try {
      const res = await fetch(`${base}${p}`, { cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(15_000) });
      if (res.status >= 500) problems.push({ fp: `page:${p}`, page: p, text: `The page returned a server error (HTTP ${res.status}).`, critical: true });
    } catch {
      problems.push({ fp: `page:${p}`, page: p, text: "The page did not respond within 15 seconds.", critical: true });
    }
  }
  for (const p of problems) await monitorReport(p.fp, p.page, `[Monitoring] ${p.text}`, p.critical);
  await db.from("assist_settings").update({ last_health_at: new Date().toISOString(), last_health_ok: problems.length === 0 }).eq("id", s.id);
  return problems.length;
}

export type OpsReport = { month: string; received: number; resolved: number; byStatus: Record<string, number>; outstanding: number; critical_open: number; detected: number; ai_cents: number; budget_cents: number; health_ok: boolean | null; last_health_at: string | null };

/** The monthly technical operations report (also shown live in the Owner Portal). */
export async function opsReport(month: Date): Promise<OpsReport | null> {
  const db = createAdminClient();
  if (!db) return null;
  const from = monthStart(month), to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));
  const [{ data: inMonth }, { data: open }, { data: s }, ai] = await Promise.all([
    db.from("site_issues").select("status, source, resolved_at").gte("created_at", from.toISOString()).lt("created_at", to.toISOString()),
    db.from("site_issues").select("priority").in("status", ["new", "proposed", "approved", "in_progress", "needs_owner", "failed", "rolled_back"]),
    db.from("assist_settings").select("monthly_budget_cents, last_health_ok, last_health_at").maybeSingle(),
    aiSpendCents(from, to),
  ]);
  const byStatus: Record<string, number> = {};
  for (const i of inMonth ?? []) byStatus[i.status] = (byStatus[i.status] ?? 0) + 1;
  const { count: resolved } = await db.from("site_issues").select("id", { count: "exact", head: true }).in("status", ["fixed", "built"]).gte("resolved_at", from.toISOString()).lt("resolved_at", to.toISOString());
  return {
    month: from.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
    received: (inMonth ?? []).filter((i) => i.source !== "monitor").length,
    detected: (inMonth ?? []).filter((i) => i.source === "monitor").length,
    resolved: resolved ?? 0, byStatus,
    outstanding: (open ?? []).length, critical_open: (open ?? []).filter((o) => o.priority === "critical").length,
    ai_cents: ai, budget_cents: s?.monthly_budget_cents ?? 0, health_ok: s?.last_health_ok ?? null, last_health_at: s?.last_health_at ?? null,
  };
}

/** On the 1st (or the first run after it): email last month's report to the founder, once. */
export async function monthlyReport() {
  const db = createAdminClient();
  if (!db) return null;
  const { data: s } = await db.from("assist_settings").select("id, last_report_month").maybeSingle();
  const now = monthStart();
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  if (!s || s.last_report_month === ymd(prev)) return null;
  const r = await opsReport(prev);
  if (!r) return null;
  const sent = await sendEmail(ownerAlertAddress(), templates.ownerAlert({
    title: `Technical operations report — ${r.month}`,
    summary: `Reports received: ${r.received}. Problems found by monitoring: ${r.detected}. Resolved: ${r.resolved}. Outstanding now: ${r.outstanding} (${r.critical_open} critical). Last health check: ${r.health_ok === null ? "not yet run" : r.health_ok ? "healthy" : "problems found"}. Actual AI expense: ${dollars(r.ai_cents)} of the ${dollars(r.budget_cents)} budget.`,
    portalPath: "/admin/assist",
  }), { category: "owner_alert", idempotencyKey: `assist-report-${ymd(prev)}` });
  if (sent.ok) await db.from("assist_settings").update({ last_report_month: ymd(prev) }).eq("id", s.id);
  return r;
}
