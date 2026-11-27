"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer, hasRole, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Business Launch Center (founder directive 31): the member's own businesses and reminders. No filings or payments happen here. */
type R = { ok: boolean; message: string } | null;
const fail = (message: string): R => ({ ok: false, message });
async function me() {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer) || viewer.viewAs) return null;
  const db = await createClient();
  return db ? { viewer, db } : null;
}
const PREVIEW = fail("Preview only: sign in with your own account to save.");

const Business = z.object({
  name: z.string().trim().min(2).max(160),
  entity_type: z.enum(["llc", "corporation", "nonprofit", "sole_proprietorship", "partnership", "undecided"]),
  state: z.string().regex(/^[A-Z]{2}$/).nullable(),
});

export async function addBusiness(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const b = Business.safeParse({ name: f.get("name"), entity_type: f.get("entity_type"), state: f.get("state") || null });
  if (!b.success) return fail("Add a name of at least two characters and choose a structure.");
  const { error } = await m.db.from("member_businesses").insert({ user_id: m.viewer.id, ...b.data });
  if (error) return fail(error.message.includes("up to 10") ? "You can track up to 10 businesses." : "That couldn't be saved.");
  revalidatePath("/app/launch");
  return { ok: true, message: "Added to My Businesses." };
}

export async function updateBusiness(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const id = String(f.get("id") ?? "");
  if (f.get("remove") === "1") {
    const { error } = await m.db.from("member_businesses").delete().eq("id", id);
    if (error) return fail("That couldn't be removed.");
    revalidatePath("/app/launch");
    return { ok: true, message: "Removed." };
  }
  const v = z.object({
    stage: z.enum(["planning", "name_check", "preparing", "filed", "formed", "dissolved"]),
    ein_status: z.enum(["not_started", "applied", "received"]),
    tax_election: z.enum(["default", "s_corporation", "c_corporation", "tax_exempt", "undecided"]).nullable(),
    annual_report_month: z.coerce.number().int().min(1).max(12).nullable(),
    reminders: z.boolean(),
  }).safeParse({
    stage: f.get("stage"), ein_status: f.get("ein_status"), tax_election: f.get("tax_election") || null,
    annual_report_month: f.get("annual_report_month") || null, reminders: f.get("reminders") === "on",
  });
  if (!v.success) return fail("Please check the details.");
  const { error } = await m.db.from("member_businesses").update(v.data).eq("id", id);
  if (error) return fail("That couldn't be saved.");
  revalidatePath("/app/launch");
  return { ok: true, message: "Saved." };
}

/** Owner review of a state's draft entry (figures become visible to members only after approval). */
export async function approveJurisdiction(_p: R, f: FormData): Promise<R> {
  const viewer = await getViewer();
  if (!viewer || !hasRole(viewer, ["owner"])) return fail("Only the owner approves state entries.");
  const status = f.get("status") === "draft" ? "draft" : "approved";
  if (status === "approved" && f.get("confirm") !== "on") return fail("Confirm that you checked the figures on the official pages.");
  const db = await createClient();
  const code = String(f.get("code") ?? "");
  const { error } = await db!.from("formation_jurisdictions").update({ status }).eq("code", code);
  if (error) return fail("That couldn't be saved.");
  revalidatePath("/admin/launch-center"); revalidatePath("/app/launch");
  return { ok: true, message: status === "approved" ? `${code} approved.` : `${code} returned to draft.` };
}
