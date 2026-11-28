"use server";
import { revalidatePath } from "next/cache";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FREQUENCIES, MILESTONE_KINDS, RELATIONSHIP_STATUS } from "@/lib/growth";

/** Lifelong growth and relationship transitions (directives 45-47). The database enforces privacy and history. */
type R = { ok: boolean; message: string; url?: string } | null;
const ok = (message: string, url?: string): R => ({ ok: true, message, url });
const fail = (message: string): R => ({ ok: false, message });
const str = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);
const PORTFOLIO = "/app/know-yourself/portfolio";

async function me() {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer) || viewer.viewAs) return null;
  const db = await createClient();
  return db ? { viewer, db } : null;
}

const NEXT: Record<string, number | null> = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12, on_demand: null };

export async function saveGrowthPrefs(_p: R, f: FormData): Promise<R> {
  const m = await me();
  if (!m) return fail("Preview only: nothing is saved.");
  const frequency = str(f, "frequency", 20);
  if (!FREQUENCIES.some((x) => x.key === frequency)) return fail("Choose how often you'd like a reflection.");
  const paused = f.get("paused") === "on";
  const months = NEXT[frequency];
  const next = months ? new Date(new Date().setMonth(new Date().getMonth() + months)).toISOString() : null;
  const { error } = await m.db.from("growth_prefs").upsert({ user_id: m.viewer.id, frequency, paused, next_due_at: next, updated_at: new Date().toISOString() });
  revalidatePath(PORTFOLIO); revalidatePath("/app"); revalidatePath("/app/settings");
  if (error) return fail("Your preference couldn't be saved.");
  return ok(paused ? "Paused. Journey keeps your history either way; resume whenever you like." : frequency === "on_demand" ? "Saved. Request a reflection whenever you'd like one." : `Saved. Your next reflection arrives ${new Date(next!).toLocaleDateString("en-US", { dateStyle: "long" })}.`);
}

export async function requestReflection(): Promise<R> {
  const m = await me();
  if (!m) return fail("Preview only.");
  const { data, error } = await m.db.rpc("growth_report_request");
  if (error) return fail(error.message.includes("one reflection a day") ? "You can request one reflection a day." : "Your reflection couldn't be prepared.");
  revalidatePath(PORTFOLIO);
  return ok("Your reflection is ready.", `${PORTFOLIO}/reports/${data}`);
}

export async function addMilestone(_p: R, f: FormData): Promise<R> {
  const m = await me();
  if (!m) return fail("Preview only: nothing is saved.");
  const kind = str(f, "kind", 30), title = str(f, "title", 160);
  if (!(kind in MILESTONE_KINDS) || title.length < 2) return fail("Choose a kind and name your milestone.");
  const on = str(f, "on", 10);
  const { error } = await m.db.from("milestones").insert({
    user_id: m.viewer.id, kind, title, note: str(f, "note", 2000) || null, occurred_on: /^\d{4}-\d{2}-\d{2}$/.test(on) ? on : undefined,
    recurring: f.get("recurring") === "on", visibility: f.get("shared") === "on" ? "shared_partner" : "private",
  });
  revalidatePath(PORTFOLIO);
  return error ? fail("That milestone couldn't be saved.") : ok(f.get("shared") === "on" ? "Saved and shared with your partner." : "Saved privately.");
}

export async function deleteMilestone(_p: R, f: FormData): Promise<R> {
  const m = await me();
  if (!m) return fail("Preview only.");
  await m.db.from("milestones").delete().eq("id", str(f, "id", 40)).eq("user_id", m.viewer.id);
  revalidatePath(PORTFOLIO);
  return ok("Removed.");
}

export async function setRelationshipStatus(_p: R, f: FormData): Promise<R> {
  const m = await me();
  if (!m) return fail("Preview only: nothing is saved.");
  const status = str(f, "status", 30);
  if (!(status in RELATIONSHIP_STATUS)) return fail("Choose a status.");
  const since = str(f, "since", 10);
  const { error } = await m.db.schema("relationships").from("status").upsert({ user_id: m.viewer.id, status, since: /^\d{4}-\d{2}-\d{2}$/.test(since) ? since : null, updated_at: new Date().toISOString() });
  revalidatePath("/app/relationships/status"); revalidatePath("/app/settings");
  return error ? fail("Your status couldn't be saved.") : ok("Saved privately. Your membership and benefits are unchanged.");
}

export async function leaveCouple(_p: R, f: FormData): Promise<R> {
  const m = await me();
  if (!m) return fail("Preview only.");
  if (f.get("confirm") !== "on") return fail("Please confirm you understand what changes.");
  const { error } = await m.db.schema("relationships").rpc("leave_couple", { p_private: f.get("private") === "on" });
  revalidatePath("/app/relationships", "layout");
  return error ? fail("That couldn't be completed. Please try again or contact support privately.") : ok("Done. Your account, private reflections, growth records and membership are unchanged.", "/app/relationships/status?left=1");
}
