"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendJourneyMessage } from "@/lib/journey-server";
import { DISCOVERY_CATEGORIES } from "@/lib/journey-discovery";
import { assemblePortfolio } from "@/lib/portfolio";
import { loadPortfolioInput, SKIP_PREFIX } from "@/lib/portfolio-server";
import type { ActionResult } from "@/app/actions/admin";

const PATH = "/app/know-yourself/portfolio";
async function member() {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer)) return null;
  return { viewer, db: (await createClient())! };
}

/** Saves today's rule-based portfolio as a dated version (no AI, no allowance). */
export async function savePortfolioSnapshot(_p: ActionResult, _f: FormData): Promise<ActionResult> {
  const m = await member(); if (!m) return { ok: false, message: "Please sign in first." };
  const sections = assemblePortfolio(await loadPortfolioInput(m.db, m.viewer.id)).filter((s) => s.lines.length);
  if (!sections.length) return { ok: false, message: "Complete a discovery first, then save your portfolio." };
  const content = sections.map((s) => `## ${s.title}\n${s.lines.map((l) => `${l.kind === "shared" ? "You shared: " : "Reflection: "}${l.text}`).join("\n")}`).join("\n\n");
  const { error } = await m.db.from("discovery_analyses").insert({ user_id: m.viewer.id, scope: "portfolio", source: "self", content: content.slice(0, 20000) });
  if (error) return { ok: false, message: "Not saved. Please try again." };
  revalidatePath(PATH);
  return { ok: true, message: "Saved as today’s dated version. Compare it with future versions as you grow." };
}

/** Marks a category as skipped (or brings it back). Skipping is always the member's choice and never held against them. */
export async function toggleSkipCategory(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member(); if (!m) return { ok: false, message: "Please sign in first." };
  const c = DISCOVERY_CATEGORIES.find((x) => x.key === f.get("category"));
  if (!c) return { ok: false, message: "Unknown category." };
  const skip = f.get("skip") === "yes";
  const { error } = await m.db.from("discovery_answers").upsert({ user_id: m.viewer.id, question_key: `${SKIP_PREFIX}${c.key.replace(/-/g, "_")}`, answer: skip ? "skipped" : null, choices: null }, { onConflict: "user_id,question_key" });
  if (error) return { ok: false, message: "Please try again." };
  revalidatePath(PATH);
  return { ok: true, message: skip ? `${c.title} marked as skipped. You can return to it anytime.` : `${c.title} is back on your list.` };
}

/** A paid member asks Journey to write their portfolio. One Journey reply, counted against their allowance, saved as a dated version. */
export async function createPortfolioWithJourney(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member(); if (!m) return { ok: false, message: "Please sign in first." };
  if (f.get("consent") !== "yes") return { ok: false, message: "Please confirm that Journey may read your discoveries." };
  const reply = await sendJourneyMessage({ mode: "life", message: "portfolio", requestKey: randomUUID(), portfolio: true, ownerTest: m.viewer.roles.length > 0 });
  if (!reply.ok) return { ok: false, message: reply.message };
  revalidatePath(PATH);
  return { ok: true, message: "Your Journey-written portfolio is ready and saved privately with today’s date." };
}
