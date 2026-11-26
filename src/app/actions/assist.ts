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
  const { error } = await db.from("site_issues").insert({ reporter_id: viewer.id, kind, page_path: page, description, expected: s(f, "expected", 2000) || null, screenshot_path, device });
  if (error) return fail("Not sent. Please try again.");
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
  await audit(`assist.${op || "note"}`, "site_issues", id, {});
  revalidatePath("/admin/assist");
  return ok(op === "approve" ? "Approved. Peace will build it at the next check." : op === "decline" ? "Declined." : "Saved.");
}
