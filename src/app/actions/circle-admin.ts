"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getMfaStatus, getViewer, hasRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CATEGORIES, screen } from "@/lib/circle";
import type { ActionResult } from "@/app/actions/admin";

/** Global Conversation Control Center (founder directive 19). The owner approves featured topics; admins prepare them. */
const fail = (message: string): ActionResult => ({ ok: false, message });
const done = (message: string): ActionResult => ({ ok: true, message });
const str = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);
const refresh = () => { revalidatePath("/admin/circle"); revalidatePath("/app/circle"); };

async function staff(roles: ("owner" | "admin")[] = ["owner", "admin"]) {
  const viewer = await getViewer();
  if (!viewer || !hasRole(viewer, roles) || !(await getMfaStatus()).verified) return null;
  const db = await createClient();
  return db ? { viewer, db } : null;
}

export async function saveCircleTopic(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const s = await staff(); if (!s) return fail("Owner or admin access with two-step verification is required.");
  const category = z.enum(CATEGORIES.map(([k]) => k) as [string, ...string[]]).safeParse(f.get("category"));
  const title = str(f, "title", 160), prompt = str(f, "prompt", 1500);
  if (!category.success || title.length < 5 || prompt.length < 10) return fail("Write a title, a prompt and choose a category.");
  const sc = screen(`${title} ${prompt}`);
  if (!sc.ok) return fail(sc.message);
  const { error } = await s.db.from("circle_topics").insert({ title, prompt, category: category.data, source: "owner", status: "draft", open_hours: Number(f.get("open_hours")) || 24 });
  if (error) return fail("The topic couldn't be saved.");
  refresh();
  return done("Saved as a draft. Approve it to add it to the rotation.");
}

/** Approve (owner only), decline or archive. Approved topics join the pool that fills the four-hour slots automatically. */
export async function setTopicStatus(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const status = z.enum(["approved", "declined", "archived", "draft"]).safeParse(f.get("status"));
  const id = z.string().uuid().safeParse(f.get("id"));
  if (!status.success || !id.success) return fail("Not found.");
  const s = await staff(status.data === "approved" ? ["owner"] : ["owner", "admin"]);
  if (!s) return fail(status.data === "approved" ? "Only the owner approves featured topics." : "Not permitted.");
  const { error } = await s.db.from("circle_topics").update({ status: status.data, ...(status.data !== "approved" ? { slot_start: null } : {}) }).eq("id", id.data).neq("status", "scheduled");
  if (error) return fail("That couldn't be updated.");
  if (status.data === "approved") await fillSlots();
  refresh();
  return done(status.data === "approved" ? "Approved and added to the rotation." : `Marked ${status.data}.`);
}

export async function approveAllTopics(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const s = await staff(["owner"]); if (!s) return fail("Only the owner approves featured topics.");
  if (f.get("confirm") !== "on") return fail("Tick the box to confirm you have reviewed these topics.");
  const { data, error } = await s.db.from("circle_topics").update({ status: "approved" }).eq("status", "draft").eq("room", "becoming").select("id");
  if (error) return fail("They couldn't be approved.");
  const filled = await fillSlots();
  refresh();
  return done(`${data?.length ?? 0} topics approved; ${filled} upcoming slot${filled === 1 ? "" : "s"} filled.`);
}

/** Puts a specific approved topic into a chosen four-hour slot (replacing nothing that's already scheduled). */
export async function scheduleTopic(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const s = await staff(["owner"]); if (!s) return fail("Only the owner schedules featured topics.");
  const id = z.string().uuid().safeParse(f.get("id"));
  const when = new Date(str(f, "slot", 40));
  if (!id.success || Number.isNaN(when.getTime())) return fail("Choose a topic and a time.");
  const slot = new Date(Math.floor(when.getTime() / (4 * 3600_000)) * 4 * 3600_000);
  const { error } = await s.db.from("circle_topics").update({ status: "scheduled", slot_start: slot.toISOString() }).eq("id", id.data).in("status", ["approved", "draft"]);
  if (error) return fail(/duplicate|unique/.test(error.message) ? "That slot already has a featured topic." : "That couldn't be scheduled.");
  refresh();
  return done(`Scheduled for ${slot.toUTCString()}.`);
}

export async function fillSlots() {
  const db = createAdminClient();
  if (!db) return 0;
  const { data } = await db.rpc("circle_fill_slots");
  return Number(data ?? 0);
}

export async function decideSuggestion(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const s = await staff(); if (!s) return fail("Not permitted.");
  const id = z.string().uuid().safeParse(f.get("id"));
  const decision = z.enum(["accepted", "declined"]).safeParse(f.get("decision"));
  if (!id.success || !decision.success) return fail("Not found.");
  const { data: sug } = await s.db.from("circle_suggestions").select("title, category, note, user_id").eq("id", id.data).maybeSingle();
  if (!sug) return fail("Not found.");
  if (decision.data === "accepted") {
    const category = CATEGORIES.some(([k]) => k === sug.category) ? sug.category : "everyday-life";
    await s.db.from("circle_topics").insert({ title: sug.title, prompt: str(f, "prompt", 1500) || sug.note || `Share your perspective: ${sug.title}`, category, source: "member", suggested_by: sug.user_id, status: "draft" });
  }
  await s.db.from("circle_suggestions").update({ status: decision.data, reviewer_note: str(f, "reviewer_note", 500) || null }).eq("id", id.data);
  refresh();
  return done(decision.data === "accepted" ? "Accepted as a draft topic." : "Declined.");
}

/** Authorize a member moderator (owner only). Training must be recorded before they can moderate. */
export async function authorizeModerator(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const s = await staff(["owner"]); if (!s) return fail("Only the owner authorizes moderators.");
  const email = str(f, "email", 200).toLowerCase();
  const admin = createAdminClient();
  if (!admin || !email) return fail("Enter the member's email address.");
  const { data: p } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (!p) return fail("No member has that email address.");
  const trained = f.get("trained") === "on";
  const { error } = await s.db.from("circle_moderators").upsert({ user_id: p.id, status: "authorized", authorized_by: s.viewer.id, training_completed_at: trained ? new Date().toISOString() : null, updated_at: new Date().toISOString() });
  if (error) return fail("That couldn't be saved.");
  refresh();
  return done(trained ? "Authorized. They can moderate now." : "Authorized pending training. They can moderate once training is recorded.");
}

export async function setModerator(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const s = await staff(["owner"]); if (!s) return fail("Only the owner manages moderators.");
  const id = z.string().uuid().safeParse(f.get("user_id"));
  const action = z.enum(["trained", "suspended", "revoked", "authorized"]).safeParse(f.get("action"));
  if (!id.success || !action.success) return fail("Not found.");
  const patch = action.data === "trained" ? { training_completed_at: new Date().toISOString() } : { status: action.data };
  await s.db.from("circle_moderators").update({ ...patch, updated_at: new Date().toISOString() }).eq("user_id", id.data);
  refresh();
  return done("Updated.");
}

export async function resolveCircleReport(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const s = await staff(); if (!s) return fail("Not permitted.");
  const id = z.string().uuid().safeParse(f.get("id"));
  const status = z.enum(["resolved", "dismissed"]).safeParse(f.get("status"));
  if (!id.success || !status.success) return fail("Not found.");
  await s.db.from("circle_reports").update({ status: status.data, resolved_by: s.viewer.id }).eq("id", id.data);
  refresh();
  return done(`Marked ${status.data}.`);
}

/** Optional AI screening of written comments (OpenAI moderation): owner decision. */
export async function setAiScreening(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const s = await staff(["owner"]); if (!s) return fail("Only the owner can change this.");
  const on = f.get("on") === "true";
  const { error } = await s.db.from("platform_settings").update({ value: on, updated_by: s.viewer.id, updated_at: new Date().toISOString() }).eq("key", "circle_ai_screening");
  if (error) return fail("That couldn't be saved.");
  refresh();
  return done(on ? "AI screening is on." : "AI screening is off.");
}
