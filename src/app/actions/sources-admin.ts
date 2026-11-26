"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getMfaStatus, getViewer, hasRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/actions/admin";

/** Curriculum Studio → Source library (founder directive 22). Only the owner approves; approval is recorded. */
const fail = (message: string): ActionResult => ({ ok: false, message });
const done = (message: string): ActionResult => ({ ok: true, message });

async function studio(ownerOnly: boolean) {
  const viewer = await getViewer();
  if (!viewer || !hasRole(viewer, ownerOnly ? ["owner"] : ["owner", "executive"]) || !(await getMfaStatus()).verified) return null;
  return createClient();
}

export async function setSourceStatus(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const id = z.string().uuid().safeParse(f.get("id"));
  const status = z.enum(["approved", "archived", "draft"]).safeParse(f.get("status"));
  if (!id.success || !status.success) return fail("Not found.");
  const db = await studio(status.data === "approved");
  if (!db) return fail(status.data === "approved" ? "Only the owner approves sources." : "Not permitted.");
  const { error } = await db.from("knowledge_sources").update({ status: status.data }).eq("id", id.data);
  if (error) return fail("That couldn't be updated.");
  revalidatePath("/admin/curriculum/sources");
  return done(status.data === "approved" ? "Approved. Journey may now teach from this source." : `Marked ${status.data}.`);
}

export async function approveAllSources(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const db = await studio(true); if (!db) return fail("Only the owner approves sources.");
  if (f.get("confirm") !== "on") return fail("Tick the box to confirm you have reviewed these sources.");
  const { data, error } = await db.from("knowledge_sources").update({ status: "approved" }).eq("status", "draft").select("id");
  if (error) return fail("They couldn't be approved.");
  revalidatePath("/admin/curriculum/sources");
  return done(`${data?.length ?? 0} sources approved.`);
}
