"use server";
import { revalidatePath } from "next/cache";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cleanGuideAnswers } from "@/lib/journey-guide";
import { resolveGuide, saveGuideAnswers } from "@/lib/journey-guide-server";
import type { ActionResult } from "@/app/actions/admin";

/**
 * Saves the answers a member reviewed after completing a module with Journey.
 * Written with the member's own row-secured permissions, to the same place the written form uses,
 * so progress, the module analysis and the Personal Discovery Portfolio update exactly as if typed.
 */
export async function saveGuidedAnswers(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer) || viewer.viewAs) return { ok: false, message: "Preview only — nothing is saved." };
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Not available right now." };
  const m = await resolveGuide(supabase, String(f.get("ref") ?? ""));
  if (!m) return { ok: false, message: "Unknown lesson." };
  let raw: Record<string, unknown> = {};
  try { raw = JSON.parse(String(f.get("answers") ?? "{}")); } catch { return { ok: false, message: "Please try again." }; }
  if (f.get("consent") !== "yes") return { ok: false, message: "Please confirm these answers are accurate before saving." };
  const answers = cleanGuideAnswers(m, raw);
  if (!Object.keys(answers).length) return { ok: false, message: "There was nothing to save yet." };
  const error = await saveGuideAnswers(supabase, viewer.id, m, answers);
  if (error) return { ok: false, message: error };
  if (m.ref.startsWith("who-am-i/")) await supabase.from("discovery_preference").upsert({ user_id: viewer.id, choice: "begin" }, { onConflict: "user_id" });
  revalidatePath("/app/know-yourself", "layout");
  revalidatePath("/emotional-intelligence", "layout");
  revalidatePath("/app");
  return { ok: true, message: "Saved privately. Your progress, personal analysis and Personal Discovery Portfolio are updated. You can edit any answer below at any time." };
}
