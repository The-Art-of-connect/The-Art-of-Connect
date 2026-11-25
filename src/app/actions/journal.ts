"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isInsidePreview, requireExperience } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/actions/admin";

/** Private journal: the database lets only the author read or change an entry — not partners, matches or staff. */
export async function saveJournalEntry(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const { viewer } = await requireExperience("counseling");
  if (isInsidePreview(viewer)) return { ok: false, message: "Preview only — nothing is saved." };
  const parsed = z.object({
    title: z.string().trim().max(120).optional(),
    body: z.string().trim().min(1).max(20000),
    mood: z.enum(["Grateful", "Peaceful", "Hopeful", "Reflective", "Tender", "Unsettled", "Heavy"]).optional(),
  }).safeParse({ title: String(f.get("title") ?? "") || undefined, body: f.get("body"), mood: String(f.get("mood") ?? "") || undefined });
  if (!parsed.success) return { ok: false, message: "Write a few words first." };
  const supabase = (await createClient())!;
  const { error } = await supabase.schema("counseling").from("journal_entries").insert({ user_id: viewer.id, title: parsed.data.title ?? null, body: parsed.data.body, mood: parsed.data.mood ?? null });
  if (error) return { ok: false, message: "Your entry wasn't saved. Please try again." };
  revalidatePath("/app/counseling/journal");
  return { ok: true, message: "Saved to your private journal." };
}

export async function deleteJournalEntry(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const { viewer } = await requireExperience("counseling");
  if (isInsidePreview(viewer)) return { ok: false, message: "Preview only." };
  const id = z.uuid().safeParse(f.get("id"));
  if (!id.success) return { ok: false, message: "Unknown entry." };
  const supabase = (await createClient())!;
  await supabase.schema("counseling").from("journal_entries").delete().eq("id", id.data);
  revalidatePath("/app/counseling/journal");
  return { ok: true, message: "Deleted." };
}
