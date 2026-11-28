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
