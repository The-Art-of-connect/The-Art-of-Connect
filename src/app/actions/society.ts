"use server";
import { revalidatePath } from "next/cache";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/actions/admin";

/** Moves the member to another primary society. Eligibility is checked by the database; The Art of Knowing Yourself records are kept. */
export async function changeSociety(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer) || viewer.viewAs) return { ok: false, message: "Please sign in with your own account to change societies." };
  if (f.get("confirm") !== "yes") return { ok: false, message: "Please confirm the change first." };
  const to = String(f.get("society") ?? "");
  const supabase = (await createClient())!;
  const { error } = await supabase.rpc("change_primary_society", { p_to: to });
  if (error) return { ok: false, message: error.message.replace(/^.*?: /, "") || "That change isn't available right now." };
  revalidatePath("/app", "layout");
  return { ok: true, message: "Done. Your society has changed, and everything in The Art of Knowing Yourself, your Portfolio and your reflections is just as you left it." };
}
