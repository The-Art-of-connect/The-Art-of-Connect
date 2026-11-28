"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer, hasRole, isInsidePreview, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { REVIEW_STATUSES } from "@/lib/formation";

/**
 * Business Launch Center formation requests. A request is reviewed by our team before anything is filed or charged: no
 * payment is taken and nothing is filed automatically. The database enforces every status rule.
 */
type R = { ok: boolean; message: string; url?: string } | null;
const ok = (message: string, url?: string): R => ({ ok: true, message, url });
const fail = (message: string): R => ({ ok: false, message });
const PREVIEW = fail("Preview only: sign in with your own account to save.");

async function me() {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer) || viewer.viewAs) return null;
  const db = await createClient();
  return db ? { viewer, db } : null;
}
const refresh = (id?: string) => { revalidatePath("/app/launch"); revalidatePath("/app/launch/orders"); if (id) revalidatePath(`/app/launch/orders/${id}`); revalidatePath("/admin/formation-orders"); };

const Start = z.object({
  business: z.union([z.literal("new"), z.uuid()]),
  name: z.string().trim().max(160),
  entity_type: z.enum(["llc", "corporation", "nonprofit"]),
  state: z.union([z.literal(""), z.string().regex(/^[A-Z]{2}$/)]),
  provider: z.enum(["self_filed", "bizee"]),
});

export async function startFormationOrder(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const v = Start.safeParse({
    business: f.get("business") || "new", name: f.get("name") ?? "", entity_type: f.get("entity_type"), state: String(f.get("state") ?? "").toUpperCase(), provider: f.get("provider"),
  });
  if (!v.success) return fail("Choose your state, the type of business and how you'd like it filed.");
  const d = v.data;
  let businessId = d.business;
  if (d.business === "new") {
    if (d.name.length < 2) return fail("Add your business name (at least two characters).");
    const { data: j } = d.state ? await m.db.from("formation_jurisdictions").select("code").eq("code", d.state).maybeSingle() : { data: null };
    if (!j) return fail("Choose the state or D.C. where the business will be formed.");
    const { data: b, error } = await m.db.from("member_businesses").insert({ user_id: m.viewer.id, name: d.name, entity_type: d.entity_type, state: d.state, stage: "preparing" }).select("id").single();
    if (error || !b) return fail(error?.message.includes("up to 10") ? "You can track up to 10 businesses. Remove one in My Businesses first." : "Your business couldn't be saved.");
    businessId = b.id;
  } else {
    // An existing business keeps its own structure and state (from My Businesses).
    const { data: b } = await m.db.from("member_businesses").select("id, entity_type, state").eq("id", d.business).eq("user_id", m.viewer.id).maybeSingle();
    if (!b) return fail("That business wasn't found in My Businesses.");
    if (!["llc", "corporation", "nonprofit"].includes(b.entity_type) || !b.state) return fail("Formation requests are for an LLC, corporation or nonprofit with a state. Start it as a new business instead.");
  }
  const { data: o, error } = await m.db.from("formation_orders").insert({ user_id: m.viewer.id, business_id: businessId, provider: d.provider }).select("id").single();
  if (error || !o) return fail("Your formation order couldn't be started. Please try again.");
  refresh(o.id);
  return ok("Saved as a draft. Review it, then send it as a request.", `/app/launch/orders/${o.id}`);
}

export async function updateFormationDraft(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const v = z.object({ id: z.uuid(), provider: z.enum(["self_filed", "bizee"]) }).safeParse({ id: f.get("id"), provider: f.get("provider") });
  if (!v.success) return fail("Choose how you'd like it filed.");
  const { data, error } = await m.db.from("formation_orders").update({ provider: v.data.provider }).eq("id", v.data.id).select("id");
  if (error || !data?.length) return fail(error?.message.includes("no longer be changed") ? "This request has been sent for review and can no longer be changed." : "That couldn't be saved.");
  refresh(v.data.id);
  return ok("Saved.");
}

export async function sendFormationRequest(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const id = z.uuid().safeParse(f.get("id"));
  if (!id.success) return fail("That order wasn't found.");
  if (f.get("understand") !== "on") return fail("Please confirm you understand that nothing is filed or charged until our team reviews your request and you agree.");
  const { data, error } = await m.db.from("formation_orders").update({ requested_at: new Date().toISOString() }).eq("id", id.data).eq("status", "draft").is("requested_at", null).select("id");
  if (error || !data?.length) return fail("This request couldn't be sent. It may already have been sent or closed.");
  refresh(id.data);
  return ok("Request sent. Our team will review it; nothing is filed or charged before you hear from us. You'll be notified when its status changes.");
}

export async function cancelFormationOrder(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const id = z.uuid().safeParse(f.get("id"));
  if (!id.success) return fail("That order wasn't found.");
  const { data, error } = await m.db.from("formation_orders").update({ status: "cancelled" }).eq("id", id.data).select("id");
  if (error || !data?.length) return fail("This order can no longer be canceled here, because our team has already begun processing it. Please contact support.");
  refresh(id.data);
  return ok("Canceled. Nothing was filed or charged.");
}

// ─── Owner Portal ────────────────────────────────────────────────────────────────────────────────────────────────────

export async function reviewFormationOrder(_p: R, f: FormData): Promise<R> {
  const viewer = await requireStaff(["owner", "finance"]);
  if (!hasRole(viewer, ["owner", "finance"])) return fail("Owner and finance only.");
  const v = z.object({ id: z.uuid(), status: z.enum(REVIEW_STATUSES), note: z.string().trim().max(1000) }).safeParse({ id: f.get("id"), status: f.get("status"), note: f.get("note") ?? "" });
  if (!v.success) return fail("Choose a status.");
  const db = (await createClient())!;
  const { error } = await db.rpc("formation_order_review", { p_order: v.data.id, p_status: v.data.status, p_note: v.data.note || null });
  if (error) return fail(error.message.includes("closed") ? "This order is closed." : error.message.includes("sent") ? "Only requests a member has sent can be reviewed." : "The status couldn't be updated.");
  refresh(v.data.id);
  return ok("Updated. The member has been notified.");
}
