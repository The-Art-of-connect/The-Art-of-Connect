"use server";
import { revalidatePath } from "next/cache";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { QA_PERSONAS } from "@/lib/qa-switcher";

/** Switches the signed-in QA test account's own complimentary membership. The database refuses everyone else. */
export async function switchQaExperience(form: FormData) {
  const persona = String(form.get("persona") ?? "");
  if (!QA_PERSONAS.some((p) => p.key === persona)) return;
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer) || viewer.viewAs) return;
  const db = await createClient();
  if (!db) return;
  await db.rpc("qa_switch_experience", { p_persona: persona });
  revalidatePath("/", "layout");
}

/** QA-only: make a fictional participant act toward the QA account (the database refuses everyone else). */
export async function qaParticipantAct(_p: { ok: boolean; message: string } | null, form: FormData): Promise<{ ok: boolean; message: string } | null> {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer) || viewer.viewAs) return { ok: false, message: "QA account only." };
  const db = await createClient();
  if (!db) return { ok: false, message: "Please try again." };
  const { data, error } = await db.rpc("qa_act", { p_participant: String(form.get("participant") ?? ""), p_action: String(form.get("action") ?? ""), p_text: String(form.get("text") ?? "").slice(0, 1000) || null });
  revalidatePath("/app/qa/participants"); revalidatePath("/app/relationships", "layout"); revalidatePath("/app/connect/messages", "layout");
  if (error) return { ok: false, message: error.message.replace(/^QA_[A-Z_]+$/, "Not allowed.") };
  return { ok: true, message: data === "ok" ? "Done." : String(data) };
}
