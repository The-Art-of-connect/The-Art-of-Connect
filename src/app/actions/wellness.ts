"use server";
import { revalidatePath } from "next/cache";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GENDERS, MEETING, PROVIDERS, SUPPORT_CONCERNS } from "@/lib/wellness";
import type { ActionResult } from "@/app/actions/admin";

const one = (list: { id: string }[], v: FormDataEntryValue | null, d: string) => (list.some((x) => x.id === v) ? String(v) : d);
const short = (v: FormDataEntryValue | null, n: number) => String(v ?? "").trim().slice(0, n) || null;

/** Saves a member's private support preferences (no staff can read them). Used for matching when the center opens. */
export async function saveSupportPreferences(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer)) return { ok: false, message: "Please sign in first." };
  const concerns = f.getAll("concerns").map(String).filter((c) => SUPPORT_CONCERNS.some((x) => x.id === c)).slice(0, 9);
  const supabase = (await createClient())!;
  const { error } = await supabase.schema("counseling").from("support_preferences").upsert({
    user_id: viewer.id, concerns,
    meeting: one(MEETING, f.get("meeting"), "either"), provider_preference: one(PROVIDERS, f.get("provider"), "both"),
    counselor_gender: one(GENDERS, f.get("gender"), "no_preference"), language: short(f.get("language"), 40),
    cultural_notes: short(f.get("cultural"), 500), state: short(f.get("state"), 40), budget: short(f.get("budget"), 60),
    uses_insurance: f.get("insurance") === "yes", updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) return { ok: false, message: "Not saved. Please try again." };
  revalidatePath("/app/wellness");
  return { ok: true, message: "Saved privately. When the center opens, we'll use these to suggest professionals who fit you. You can change them anytime." };
}
