"use server";
import { revalidatePath } from "next/cache";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { completeRank } from "@/lib/love-languages";
import type { ActionResult } from "@/app/actions/admin";

/** Saves the member's optional Love Language Profile. Private unless they choose to share (enforced by the database). */
export async function saveLoveLanguages(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer)) return { ok: false, message: "Preview only — nothing is saved." };
  const rank = (prefix: string) => completeRank([1, 2, 3, 4, 5].map((i) => String(f.get(`${prefix}_${i}`) ?? "")));
  const text = (k: string) => String(f.get(k) ?? "").trim().slice(0, 2000) || null;
  const supabase = (await createClient())!;
  const { error } = await supabase.from("love_language_profiles").upsert({
    user_id: viewer.id, receive_rank: rank("receive"), express_rank: rank("express"),
    feel_connected: text("feel_connected"), feel_unappreciated: text("feel_unappreciated"), notes: text("notes"),
    share_with_partner: f.get("share_with_partner") === "on", share_with_matches: f.get("share_with_matches") === "on", use_in_journey: f.get("use_in_journey") === "on",
  }, { onConflict: "user_id" });
  if (error) return { ok: false, message: "Not saved. Please try again." };
  revalidatePath("/app/know-yourself", "layout");
  revalidatePath("/app/relationships/love-languages");
  return { ok: true, message: "Your Love Language Profile is saved. Update it whenever you grow or change." };
}
