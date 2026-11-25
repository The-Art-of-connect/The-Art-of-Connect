"use server";
import { revalidatePath } from "next/cache";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EI_KEYS } from "@/lib/emotional-intelligence";
import type { ActionResult } from "@/app/actions/admin";

/** Saves private emotional-intelligence reflections and profile answers (member-only, with growth history). */
export async function saveEIReflections(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer)) return { ok: false, message: "Please sign in to save your reflections." };
  const rows = EI_KEYS.filter((k) => f.has(k)).map((k) => ({ user_id: viewer.id, question_key: k, answer: String(f.get(k) ?? "").trim().slice(0, 4000) || null, choices: null }));
  if (!rows.length) return { ok: false, message: "Nothing to save yet." };
  const supabase = (await createClient())!;
  const { error } = await supabase.from("discovery_answers").upsert(rows, { onConflict: "user_id,question_key" });
  if (error) return { ok: false, message: "Not saved. Please try again." };
  revalidatePath("/emotional-intelligence", "layout");
  revalidatePath("/app/know-yourself", "layout");
  return { ok: true, message: "Saved privately — only you can see this. Revisit it anytime." };
}
