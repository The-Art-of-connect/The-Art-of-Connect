"use server";
import { revalidatePath } from "next/cache";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/actions/admin";
import type { Area } from "@/lib/know-yourself";

const AREAS: Area[] = ["self", "work", "life", "love"];
const str = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max) || null;

/** Saves one area of Know Yourself First. Private to the member (enforced by the database). */
export async function saveSelfDiscovery(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer)) return { ok: false, message: "Please sign in to save your reflections." };
  const area = String(f.get("area") ?? "") as Area;
  if (!AREAS.includes(area)) return { ok: false, message: "Unknown section." };
  const row = {
    user_id: viewer.id, area,
    core_values: str(f, "core_values", 2000), will_do: str(f, "will_do", 4000),
    wont_do: str(f, "wont_do", 4000), say_it: str(f, "say_it", 4000),
  };
  const supabase = (await createClient())!;
  const { error } = await supabase.from("self_discovery").upsert(row, { onConflict: "user_id,area" });
  if (error) return { ok: false, message: "Not saved. Please try again." };
  revalidatePath("/app/know-yourself", "layout");
  revalidatePath("/app");
  return { ok: true, message: "Saved privately — only you can see this." };
}
