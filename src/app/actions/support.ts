"use server";
import { revalidatePath } from "next/cache";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { allow } from "@/lib/ratelimit";
import type { ActionResult } from "@/app/actions/admin";

/** A member's support or concierge request. Elite members are prioritized automatically by the database. */
export async function createSupportRequest(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer) || viewer.viewAs) return { ok: false, message: "Please sign in with your own account." };
  const subject = String(f.get("subject") ?? "").trim().slice(0, 200);
  const body = String(f.get("body") ?? "").trim().slice(0, 5000);
  const category = String(f.get("category") ?? "general");
  if (!subject || !body) return { ok: false, message: "Please add a subject and a few details." };
  if (!["general", "billing", "account", "relationships", "business", "safety"].includes(category)) return { ok: false, message: "Choose a topic." };
  if (!(await allow(`support:${viewer.id}`, 10, 86400))) return { ok: false, message: "Please try again tomorrow, or email info@theartofconnect.com." };
  const db = await createClient();
  const { error } = db ? await db.from("support_tickets").insert({ user_id: viewer.id, email: viewer.email, subject, body, category }) : { error: true };
  if (error) return { ok: false, message: "Not sent. Please try again." };
  revalidatePath("/app/support");
  return { ok: true, message: "Received. We'll reply by email." };
}
