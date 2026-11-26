"use server";
import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getMfaStatus, getViewer, hasRole, isInsidePreview } from "@/lib/auth";
import { audit } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { allow } from "@/lib/ratelimit";
import { ownerAlertAddress, sendEmail } from "@/lib/email";
import { templates } from "@/lib/email-templates";
import type { ActionResult } from "@/app/actions/admin";
import { dispatchIssue, notifyReporter } from "@/lib/assist";

const ok = (message: string): ActionResult => ({ ok: true, message });
const fail = (message: string): ActionResult => ({ ok: false, message });
const s = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);

/** A member reports something that isn't working, or suggests an idea. */
export async function reportIssue(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer) || viewer.viewAs) return fail("Please sign in with your own account.");
  const kind = f.get("kind") === "suggestion" ? "suggestion" : "problem";
  const description = s(f, "description", 4000);
  if (description.length < 5) return fail(kind === "problem" ? "Please describe what isn't working." : "Please describe your idea.");
  if (!(await allow(`issue:${viewer.id}`, 15, 86400))) return fail("Thank you. You've sent several today; please try again tomorrow.");
  const db = await createClient();
  if (!db) return fail("Please try again.");
  let screenshot_path: string | null = null;
  const file = f.get("screenshot");
  if (file instanceof File && file.size > 0) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) return fail("Screenshots must be PNG, JPEG or WebP, under 10 MB.");
    try {
      const sharp = (await import("sharp")).default;
      const data = await sharp(Buffer.from(await file.arrayBuffer())).rotate().resize({ width: 2400, withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
      const path = `issues/${viewer.id}/${randomUUID()}.webp`;
      const { error } = await db.storage.from("site-issues").upload(path, data, { contentType: "image/webp" });
      if (!error) screenshot_path = path;
    } catch { /* the report still goes through without the screenshot */ }
  }
  const page = s(f, "page_path", 300).replace(/[^\w\-/?=&.%]/g, "") || null;
  const ua = (await headers()).get("user-agent") ?? "";
  const device = `${/iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "Other"} · ${/Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "Browser"}`;
  const { data: created, error } = await db.from("site_issues").insert({ reporter_id: viewer.id, kind, page_path: page, description, expected: s(f, "expected", 2000) || null, screenshot_path, device }).select("id").single();
  if (error || !created) return fail("Not sent. Please try again.");
  // Acknowledge at once, and start Peace immediately on problems (suggestions wait for a proposal and approval).
  await notifyReporter(created.id, "received").catch(() => {});
  await dispatchIssue(created.id, "submitted").catch(() => {});
  try {
    await sendEmail(ownerAlertAddress(), templates.ownerAlert({
      title: kind === "problem" ? "A member reported a problem" : "A member suggested an idea",
      summary: `${kind === "problem" ? "Something isn't working" : "A new suggestion"}${page ? ` on ${page}` : ""}. Peace will ${kind === "problem" ? "investigate and fix it" : "prepare a proposal for your approval"}.`,
      portalPath: "/admin/assist",
    }), { category: "owner_alert" });
  } catch { /* alerts are best-effort */ }
  revalidatePath("/app/assist");
  return ok(kind === "problem" ? "Thank you. We've received it and will look into it right away." : "Thank you. Our founder reviews every suggestion personally.");
}

async function owner() {
  const viewer = await getViewer();
  if (!viewer || viewer.viewAs || !hasRole(viewer, ["owner", "admin"])) return null;
  if (hasRole(viewer, ["owner"]) && !(await getMfaStatus()).verified) return null;
  const db = await createClient();
  return db ? { viewer, db } : null;
}

/** The owner approves or declines a suggestion, or closes / replies to any report. */
export async function decideIssue(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const o = await owner(); if (!o) return fail("Only the owner can do this, with two-step verification.");
  const id = s(f, "id", 40); const op = s(f, "op", 20);
  const note = s(f, "owner_note", 4000) || null;
  const reply = s(f, "member_reply", 2000) || null;
  const patch: Record<string, unknown> = { owner_note: note, ...(reply ? { member_reply: reply } : {}) };
  if (op === "approve") Object.assign(patch, { status: "approved", decided_at: new Date().toISOString() });
  else if (op === "decline") Object.assign(patch, { status: "declined", decided_at: new Date().toISOString() });
  else if (op === "close") Object.assign(patch, { status: "closed", resolved_at: new Date().toISOString() });
  else if (op === "reopen") Object.assign(patch, { status: "new" });
  const { error } = await o.db.from("site_issues").update(patch).eq("id", id);
  if (error) return fail("Not saved.");
  await o.db.from("site_issue_events").insert({ issue_id: id, actor: "owner", action: op || "note", detail: note });
  if (op === "approve") await dispatchIssue(id, "approved");
  if (reply && !["approve", "decline"].includes(op)) await notifyReporter(id, "update");
  await audit(`assist.${op || "note"}`, "site_issues", id, {});
  revalidatePath("/admin/assist");
  return ok(op === "approve" ? "Approved. Peace will build it at the next check." : op === "decline" ? "Declined." : "Saved.");
}

/** Pause or resume automated repairs, and adjust their safeguards. */
export async function saveAssistSettings(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const o = await owner(); if (!o || !hasRole(o.viewer, ["owner"])) return fail("Only the owner can do this, with two-step verification.");
  const n = (k: string, lo: number, hi: number, d: number) => { const v = Number(f.get(k)); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d; };
  const row = {
    repairs_paused: f.get("repairs_paused") === "on", immediate_enabled: f.get("immediate_enabled") === "on",
    max_attempts: n("max_attempts", 1, 5, 2), daily_run_limit: n("daily_run_limit", 1, 500, 40),
    monthly_budget_cents: Math.round(n("monthly_budget", 0, 100000, 50) * 100), updated_at: new Date().toISOString(), updated_by: o.viewer.id,
  };
  const { error } = await o.db.from("assist_settings").update(row).eq("id", true);
  if (error) return fail("Not saved.");
  await audit("assist.settings", "assist_settings", "settings", row);
  revalidatePath("/admin/assist");
  return ok(row.repairs_paused ? "Automated repairs are paused." : "Saved. Automated repairs are on.");
}

/** Start Peace on a report right now. */
export async function runIssueNow(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const o = await owner(); if (!o) return fail("Only the owner can do this, with two-step verification.");
  const r = await dispatchIssue(s(f, "id", 40), "owner");
  revalidatePath("/admin/assist");
  return r === "dispatched" ? ok("Peace has started on it.") : fail(r === "paused" ? "Repairs are paused." : "Immediate processing isn't set up yet (see Setup).");
}
