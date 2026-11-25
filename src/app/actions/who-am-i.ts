"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { moduleBySlug, VALUES } from "@/lib/who-am-i";
import type { ActionResult } from "@/app/actions/admin";

async function member() {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer)) return null;
  return { viewer, supabase: (await createClient())! };
}

/** Saves one "Who Am I?" module. Only questions that belong to the module are accepted. */
export async function saveDiscoveryModule(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member();
  if (!m) return { ok: false, message: "Please sign in to save your discoveries." };
  const mod = moduleBySlug(String(f.get("module") ?? ""));
  if (!mod) return { ok: false, message: "Unknown module." };
  const rows = mod.questions.map((q) => {
    if (q.type === "values") {
      const picked = [...new Set(f.getAll(q.key).map(String).filter((v) => VALUES.includes(v)))].slice(0, q.max ?? 5);
      return { user_id: m.viewer.id, question_key: q.key, answer: null, choices: picked };
    }
    return { user_id: m.viewer.id, question_key: q.key, answer: String(f.get(q.key) ?? "").trim().slice(0, 4000) || null, choices: null };
  });
  const { error } = await m.supabase.from("discovery_answers").upsert(rows, { onConflict: "user_id,question_key" });
  if (error) return { ok: false, message: "Not saved. Please try again." };
  await m.supabase.from("discovery_preference").upsert({ user_id: m.viewer.id, choice: "begin" }, { onConflict: "user_id" });
  revalidatePath("/app/know-yourself", "layout");
  return { ok: true, message: "Saved privately — only you can see this. Update it anytime." };
}

/** The member's choice: begin, explore their society first, or return when ready. Never re-prompted after declining. */
export async function setDiscoveryChoice(f: FormData) {
  const m = await member();
  const choice = String(f.get("choice") ?? "");
  const back = String(f.get("back") ?? "/app");
  const safeBack = /^\/app(\/[a-z0-9/-]*)?$/.test(back) ? back : "/app";
  if (m && ["begin", "explore_first", "later"].includes(choice)) {
    await m.supabase.from("discovery_preference").upsert({ user_id: m.viewer.id, choice }, { onConflict: "user_id" });
    revalidatePath("/app", "layout");
  }
  redirect(choice === "begin" ? "/app/know-yourself#who-am-i" : safeBack);
}

/** Personal development goals and individual growth plan. */
export async function saveDiscoveryGoal(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member();
  if (!m) return { ok: false, message: "Please sign in to save your goals." };
  const id = String(f.get("id") ?? "").slice(0, 40);
  if (id) {
    const status = String(f.get("status") ?? "");
    if (f.get("delete") === "1") await m.supabase.from("discovery_goals").delete().eq("id", id);
    else if (["active", "achieved", "paused"].includes(status)) await m.supabase.from("discovery_goals").update({ status }).eq("id", id);
  } else {
    const title = String(f.get("title") ?? "").trim().slice(0, 200);
    if (title.length < 2) return { ok: false, message: "Describe your goal." };
    const area = String(f.get("area") ?? "self");
    const { error } = await m.supabase.from("discovery_goals").insert({
      user_id: m.viewer.id, title, area: ["self", "work", "life", "love"].includes(area) ? area : "self",
      why: String(f.get("why") ?? "").trim().slice(0, 2000) || null, next_step: String(f.get("next_step") ?? "").trim().slice(0, 1000) || null,
      target_date: String(f.get("target_date") ?? "") || null,
    });
    if (error) return { ok: false, message: "Goal not saved." };
  }
  revalidatePath("/app/know-yourself/growth");
  return { ok: true, message: "Saved." };
}
