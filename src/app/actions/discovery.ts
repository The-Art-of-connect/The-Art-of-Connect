"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { discoveryCategory } from "@/lib/journey-discovery";
import type { ActionResult } from "@/app/actions/admin";

/** Starts (or resumes) a discovery session. No AI is called and nothing is counted. */
export async function startDiscovery(f: FormData) {
  const viewer = await getViewer();
  const c = discoveryCategory(String(f.get("category") ?? ""));
  if (!viewer || isInsidePreview(viewer) || !c) redirect("/app/journey/discover");
  const supabase = (await createClient())!;
  const { data: active } = await supabase.from("journey_discovery_sessions").select("id").eq("user_id", viewer.id).eq("category", c.key).eq("status", "active").maybeSingle();
  if (!active) await supabase.from("journey_discovery_sessions").insert({ user_id: viewer.id, category: c.key });
  redirect(`/app/journey/discover/${c.key}`);
}

/** Ends a session without a summary. No AI is called and nothing is counted. */
export async function endDiscovery(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer)) return { ok: false, message: "Please sign in first." };
  const supabase = (await createClient())!;
  const { error } = await supabase.from("journey_discovery_sessions").update({ status: "ended", completed_at: new Date().toISOString() })
    .eq("id", String(f.get("id") ?? "")).eq("user_id", viewer.id).eq("status", "active");
  if (error) return { ok: false, message: "Please try again." };
  revalidatePath("/app/journey/discover", "layout");
  return { ok: true, message: "Session ended. Your answers stay private, and you can begin again anytime." };
}

/** The member corrects or adds to an analysis in their own words. */
export async function saveAnalysisNote(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer)) return { ok: false, message: "Please sign in first." };
  const supabase = (await createClient())!;
  const { error } = await supabase.from("discovery_analyses").update({ member_notes: String(f.get("notes") ?? "").trim().slice(0, 4000) || null })
    .eq("id", String(f.get("id") ?? "")).eq("user_id", viewer.id);
  if (error) return { ok: false, message: "Not saved. Please try again." };
  revalidatePath("/app/journey/discover", "layout");
  revalidatePath("/app/know-yourself/portfolio");
  return { ok: true, message: "Saved. Your correction now appears alongside the analysis." };
}
