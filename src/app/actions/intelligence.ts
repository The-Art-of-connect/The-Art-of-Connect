"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { friendly } from "@/lib/connect360";
import { parsePlan } from "@/lib/intel-plan";

/**
 * My Intelligence Office (founder directives 24–26). Members commission research; Journey plans it; the engine runs it under the
 * spending guard. The database enforces entitlement (Executive and Elite), privacy (own assignments only) and the guard.
 */
type R = { ok: boolean; message: string; url?: string } | null;
const fail = (message: string): R => ({ ok: false, message });
const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? "").trim().slice(0, max);
const CATEGORIES = ["sports-ownership", "leadership-discovery", "business-acquisition", "international-expansion", "supplier-discovery", "board-advisory", "retirement-legacy", "business-ownership", "collaboration", "business-credibility", "funding-resources", "funding-providers", "proposal-research", "other"] as const;

async function member() {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer) || viewer.viewAs) return null;
  const db = await createClient();
  return db ? { viewer, db } : null;
}
async function site() {
  return env.siteUrl.startsWith("https://") ? env.siteUrl.replace(/\/+$/, "") : `https://${(await headers()).get("host") ?? ""}`;
}

export async function createAssignment(_p: R, f: FormData): Promise<R> {
  const m = await member(); if (!m) return fail("Preview only: sign in with your own account.");
  const category = str(f, "category", 40), depth = f.get("depth") === "deep" ? "deep" : "standard";
  if (!(CATEGORIES as readonly string[]).includes(category)) return fail("Choose a category.");
  const title = str(f, "title", 160), objective = str(f, "objective", 6000);
  if (title.length < 3 || objective.length < 20) return fail("Give the assignment a title and describe your objective in a few sentences.");
  const { data, error } = await m.db.from("intel_assignments").insert({ user_id: m.viewer.id, title, objective, category, depth, status: "draft" }).select("id").single();
  if (error || !data) return fail(friendly(error?.message, error?.message.includes("Executive") ? "My Intelligence Office is part of Executive Private and Elite Concierge." : "The assignment couldn't be created."));
  revalidatePath("/app/connect360/intelligence");
  redirect(`/app/connect360/intelligence/${data.id}`);
}

/** Journey plans the research, then the engine runs it (each provider call is approved by the spending guard first). */
export async function beginResearch(_p: R, f: FormData): Promise<R> {
  const m = await member(); if (!m) return fail("Preview only: sign in with your own account.");
  const id = str(f, "id", 40);
  const { data: a } = await m.db.from("intel_assignments").select("id, objective, depth, status").eq("id", id).maybeSingle();
  if (!a) return fail("Unknown assignment.");
  if (!["draft", "needs_member", "complete", "paused"].includes(a.status)) return fail("Research is already underway.");
  const admin = createAdminClient();
  if (!admin) return fail("Research isn't available right now.");
  const { refusal, startResearch } = await import("@/lib/intel-engine");
  const pre = String((await admin.rpc("intel_can_spend", { p_assignment: a.id, p_estimate_cents: 1 })).data ?? "");
  // A draft isn't "active" to the guard yet: queue it first, then re-check.
  if (pre === "refused:not_active") await m.db.from("intel_assignments").update({ status: "queued" }).eq("id", a.id);
  const check = pre === "refused:not_active" ? String((await admin.rpc("intel_can_spend", { p_assignment: a.id, p_estimate_cents: 1 })).data ?? "") : pre;
  if (check !== "allowed") return fail(refusal(check));
  const { sendJourneyMessage } = await import("@/lib/journey-server");
  const reply = await sendJourneyMessage({ mode: "business", message: "research plan", requestKey: randomUUID(), intel: { objective: a.objective, depth: a.depth }, ownerTest: m.viewer.roles.length > 0 });
  if (!reply.ok) return fail(reply.message);
  const plan = parsePlan(reply.reply, a.depth, a.objective);
  const r = await startResearch(a.id, plan, a.depth, await site());
  revalidatePath(`/app/connect360/intelligence/${id}`);
  return { ok: r.ok, message: r.ok && plan.clarifying.length ? `${r.message} Journey also has a few questions below to sharpen the next stage.` : r.message };
}

/** Checks for a finished investigation now (normally it arrives automatically by webhook). */
export async function refreshResearch(_p: R, f: FormData): Promise<R> {
  const m = await member(); if (!m) return fail("Preview only.");
  const id = str(f, "id", 40);
  const { data: jobs } = await m.db.from("intel_jobs").select("external_id, status, provider").eq("assignment_id", id).eq("provider", "parallel").eq("status", "running");
  const { completeParallelRun } = await import("@/lib/intel-engine");
  for (const j of jobs ?? []) if (j.external_id) await completeParallelRun(j.external_id);
  revalidatePath(`/app/connect360/intelligence/${id}`);
  return { ok: true, message: (jobs ?? []).length ? "Checked for new results." : "Nothing is outstanding." };
}

export async function assignmentAction(_p: R, f: FormData): Promise<R> {
  const m = await member(); if (!m) return fail("Preview only.");
  const id = str(f, "id", 40), action = str(f, "action", 20);
  if (action === "instruct") {
    const detail = str(f, "detail", 4000);
    if (detail.length < 5) return fail("Write your instruction.");
    const { error } = await m.db.from("intel_events").insert({ assignment_id: id, actor: "member", action: "instruction", detail });
    if (error) return fail(friendly(error.message, "Your instruction couldn't be added."));
  } else if (["paused", "cancelled"].includes(action)) {
    const { error } = await m.db.from("intel_assignments").update({ status: action }).eq("id", id);
    if (error) return fail(friendly(error.message, "That change isn't available for this assignment."));
  } else return fail("Invalid action.");
  revalidatePath(`/app/connect360/intelligence/${id}`);
  return { ok: true, message: action === "instruct" ? "Added. Journey will use it in the next stage." : action === "paused" ? "Paused." : "Cancelled." };
}

export async function saveFinding(_p: R, f: FormData): Promise<R> {
  const m = await member(); if (!m) return fail("Preview only.");
  const id = str(f, "finding", 40);
  if (!z.string().uuid().safeParse(id).success) return fail("Unknown finding.");
  const { error } = await m.db.from("intel_findings").update({ saved: f.get("saved") === "1" }).eq("id", id);
  if (error) return fail("That couldn't be saved.");
  revalidatePath(`/app/connect360/intelligence/${str(f, "id", 40)}`);
  return { ok: true, message: f.get("saved") === "1" ? "Saved to your portfolio." : "Removed." };
}

/** Correction requests for research findings (directive 27 §1). */
export async function requestCorrection(_p: R, f: FormData): Promise<R> {
  const m = await member(); if (!m) return fail("Preview only.");
  const explanation = str(f, "explanation", 4000);
  if (explanation.length < 10) return fail("Explain what's inaccurate.");
  const evidence = str(f, "evidence", 1000);
  const { error } = await m.db.from("intel_corrections").insert({ finding_id: str(f, "finding", 40), requested_by: m.viewer.id, subject: str(f, "subject", 200) || "Research finding", explanation, evidence_url: /^https:\/\//.test(evidence) ? evidence : null });
  if (error) return fail(friendly(error.message, "Your correction couldn't be submitted."));
  return { ok: true, message: "Thank you. Your correction request will be reviewed." };
}
