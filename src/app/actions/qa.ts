"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getViewer, hasRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/actions/admin";

const KEY = /^[a-z0-9-]{2,60}$/;
const STATUSES = ["not_started", "in_progress", "passed", "failed", "needs_changes"] as const;
const text = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max) || null;

/** Owner only. Everything below is also enforced by the database (row security and the QA workflow trigger). */
async function owner() {
  const viewer = await getViewer();
  if (!viewer || !hasRole(viewer, ["owner"]) || viewer.viewAs) return null;
  const db = await createClient();
  return db ? { viewer, db } : null;
}

/** Saves the owner's actual result, status and comments. "Failed" or "Needs changes" opens a correction automatically. */
export async function saveQaResult(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const o = await owner(); if (!o) return { ok: false, message: "Only the owner can record test results." };
  const key = String(f.get("key") ?? "");
  const status = String(f.get("status") ?? "") as (typeof STATUSES)[number];
  if (!KEY.test(key) || !STATUSES.includes(status)) return { ok: false, message: "Please choose a result." };
  const actual = text(f, "actual", 4000), comments = text(f, "comments", 4000);
  if ((status === "failed" || status === "needs_changes") && !actual && !comments) return { ok: false, message: "Please describe what happened, so Peace can correct it." };
  const patch: Record<string, unknown> = { owner_status: status, actual_result: actual, owner_comments: comments };
  // A new result after a correction means the retest is done (a pass clears it; a new failure opens a new correction).
  if (status === "passed") patch.retest_required = false;
  if (status !== "passed") patch.owner_approved = false;
  const { error } = await o.db.from("qa_features").update(patch).eq("key", key);
  if (error) return { ok: false, message: "Not saved. Please try again." };
  revalidatePath("/admin/qa", "layout");
  return { ok: true, message: status === "failed" || status === "needs_changes" ? "Saved. A correction task was created for Peace, and this feature will return to your queue once it's fixed." : "Saved." };
}

/** Final owner approval: only after a pass. */
export async function approveQaFeature(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const o = await owner(); if (!o) return { ok: false, message: "Only the owner can approve features." };
  const key = String(f.get("key") ?? "");
  const approve = f.get("approve") === "yes";
  if (!KEY.test(key)) return { ok: false, message: "Unknown feature." };
  const { error } = await o.db.from("qa_features").update({ owner_approved: approve }).eq("key", key);
  if (error) return { ok: false, message: "Approval needs a Passed result first." };
  revalidatePath("/admin/qa", "layout");
  return { ok: true, message: approve ? "Approved by you." : "Approval withdrawn." };
}

const IMAGE_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

/** Uploads screenshots to private, owner-only storage. */
export async function uploadQaScreenshots(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const o = await owner(); if (!o) return { ok: false, message: "Only the owner can upload screenshots." };
  const key = String(f.get("key") ?? "");
  if (!KEY.test(key)) return { ok: false, message: "Unknown feature." };
  const files = f.getAll("files").filter((x): x is File => x instanceof File && x.size > 0).slice(0, 6);
  if (!files.length) return { ok: false, message: "Choose one or more screenshots first." };
  let saved = 0;
  for (const file of files) {
    const ext = IMAGE_TYPES[file.type];
    if (!ext || file.size > 8 * 1024 * 1024) continue;
    const path = `qa/${key}/${randomUUID()}.${ext}`;
    const { error } = await o.db.storage.from("qa-evidence").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (error) continue;
    const { error: rowError } = await o.db.from("qa_screenshots").insert({ feature_key: key, path, note: text(f, "note", 500), uploaded_by: o.viewer.id });
    if (!rowError) saved++;
  }
  revalidatePath(`/admin/qa/${key}`);
  return saved ? { ok: true, message: `${saved} screenshot${saved === 1 ? "" : "s"} saved privately.` } : { ok: false, message: "Screenshots must be PNG, JPEG or WebP images under 8 MB." };
}

export async function deleteQaScreenshot(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const o = await owner(); if (!o) return { ok: false, message: "Only the owner can remove screenshots." };
  const id = String(f.get("id") ?? "");
  const { data } = await o.db.from("qa_screenshots").select("path, feature_key").eq("id", id).maybeSingle();
  if (!data) return { ok: false, message: "Not found." };
  await o.db.storage.from("qa-evidence").remove([data.path]);
  await o.db.from("qa_screenshots").delete().eq("id", id);
  revalidatePath(`/admin/qa/${data.feature_key}`);
  return { ok: true, message: "Removed." };
}

/** Remembers where the owner stopped, so the QA Center opens right there next time. */
export async function rememberQaPlace(key: string, department: string) {
  const o = await owner(); if (!o || !KEY.test(key) || !KEY.test(department)) return;
  await o.db.from("qa_owner_state").upsert({ user_id: o.viewer.id, last_feature: key, last_department: department, updated_at: new Date().toISOString() });
}
