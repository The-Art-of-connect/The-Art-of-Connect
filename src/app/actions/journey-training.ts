"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getMfaStatus, getViewer, hasRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendJourneyMessage } from "@/lib/journey-server";
import { draftRequest, parseDrafts, TRAINING_CATEGORY_KEYS, type TrainingCategory } from "@/lib/journey-training";
import { FOUNDER_PRINCIPLES, LEARNING_OBJECTIVES, RESPONSE_STANDARDS, starterEntries } from "@/lib/journey-training-seed";
import type { ActionResult } from "@/app/actions/admin";

const BASE = "/admin/journey/training";
async function owner() {
  const viewer = await getViewer();
  if (!hasRole(viewer, ["owner", "executive"])) return null;
  if (!(await getMfaStatus()).verified) return null;
  return { viewer: viewer!, db: (await createClient())! };
}
const NO = { ok: false, message: "Owner access with two-step verification is required." } as const;
const txt = (f: FormData, k: string, max = 6000) => String(f.get(k) ?? "").trim().slice(0, max);
const lines = (f: FormData, k: string) => txt(f, k).split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 10);
const category = (f: FormData) => { const c = txt(f, "category", 40); return (TRAINING_CATEGORY_KEYS as readonly string[]).includes(c) ? c : null; };

/** Loads the founding principles, objectives, standards and starter entries (never duplicates existing topics). */
export async function loadStarterLibrary(_p?: ActionResult, _f?: FormData): Promise<ActionResult> {
  const o = await owner(); if (!o) return NO;
  for (const key of TRAINING_CATEGORY_KEYS) {
    await o.db.from("journey_training_categories").update({ learning_objectives: LEARNING_OBJECTIVES[key] ?? [], response_standards: RESPONSE_STANDARDS }).eq("key", key).eq("learning_objectives", "{}");
  }
  const { data: existing } = await o.db.from("journey_training_entries").select("category, topic");
  const have = new Set((existing ?? []).map((e) => `${e.category}|${e.topic}`));
  const rows = starterEntries().filter((e) => !have.has(`${e.category}|${e.topic}`)).map((e) => ({ ...e, origin: "generated", status: "pending", source: "library", created_by: o.viewer.id }));
  if (rows.length) {
    const { error } = await o.db.from("journey_training_entries").insert(rows);
    if (error) return { ok: false, message: "The starter library couldn't be loaded. Please try again." };
  }
  revalidatePath(BASE, "layout");
  return { ok: true, message: rows.length ? `Loaded ${rows.length} draft entries for your review.` : "The starter library is already loaded." };
}

export async function approveTrainingCategory(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const o = await owner(); if (!o) return NO;
  const c = category(f); if (!c) return { ok: false, message: "Unknown category." };
  const { data, error } = await o.db.rpc("journey_training_approve_category", { p_key: c });
  if (error) return { ok: false, message: "Not approved. Please try again." };
  revalidatePath(BASE, "layout");
  return { ok: true, message: `Category approved. ${data ?? 0} entries are now part of Journey's knowledge. Entries waiting on your decision stay pending.` };
}

/** Edits an entry in the founder's own words. Saving marks it founder-edited and approved (unless a decision is still open). */
export async function saveTrainingEntry(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const o = await owner(); if (!o) return NO;
  const id = txt(f, "id", 40);
  const { data: cur } = await o.db.from("journey_training_entries").select("founder_question").eq("id", id).maybeSingle();
  if (!cur) return { ok: false, message: "Entry not found." };
  const patch = {
    topic: txt(f, "topic", 200), scenario: txt(f, "scenario", 3000), interpretation: txt(f, "interpretation", 3000),
    approach: txt(f, "approach", 3000), example_response: txt(f, "example_response"), follow_ups: lines(f, "follow_ups"),
    safety: txt(f, "safety", 2000), origin: "edited",
    status: cur.founder_question ? "pending" : "approved", reviewed_at: new Date().toISOString(), reviewed_by: o.viewer.id,
  };
  if (patch.topic.length < 2 || patch.scenario.length < 10 || patch.example_response.length < 10) return { ok: false, message: "Topic, scenario and example response are required." };
  const { error } = await o.db.from("journey_training_entries").update(patch).eq("id", id);
  if (error) return { ok: false, message: "Not saved. Please try again." };
  revalidatePath(BASE, "layout");
  return { ok: true, message: cur.founder_question ? "Saved. Answer the open decision to approve it." : "Saved in your words and approved." };
}

export async function reviewTrainingEntry(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const o = await owner(); if (!o) return NO;
  const decision = txt(f, "decision", 20);
  if (!["approve", "reject", "restore"].includes(decision)) return { ok: false, message: "Unknown action." };
  const status = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "pending";
  const { error } = await o.db.from("journey_training_entries").update({ status, reviewer_note: txt(f, "note", 1000) || null, reviewed_at: new Date().toISOString(), reviewed_by: o.viewer.id }).eq("id", txt(f, "id", 40));
  if (error) return { ok: false, message: decision === "approve" ? "This entry has an open decision. Answer it first." : "Not saved. Please try again." };
  revalidatePath(BASE, "layout");
  return { ok: true, message: decision === "approve" ? "Approved." : decision === "reject" ? "Rejected. Journey will never use it." : "Returned to review." };
}

/** The founder answers a new philosophical question. The answer becomes a founder decision for the whole category. */
export async function answerFounderQuestion(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const o = await owner(); if (!o) return NO;
  const answer = txt(f, "answer", 1000);
  if (answer.length < 5) return { ok: false, message: "Please write your decision." };
  const { data: e } = await o.db.from("journey_training_entries").select("category, founder_question").eq("id", txt(f, "id", 40)).maybeSingle();
  if (!e?.founder_question) return { ok: false, message: "That decision was already answered." };
  const { data: cat } = await o.db.from("journey_training_categories").select("founder_decisions").eq("key", e.category).single();
  const decision = `${e.founder_question} Founder's decision: ${answer}`.slice(0, 1500);
  await o.db.from("journey_training_categories").update({ founder_decisions: [...(cat?.founder_decisions ?? []), decision].slice(-30) }).eq("key", e.category);
  await o.db.from("journey_training_entries").update({ founder_question: null, reviewer_note: `Decision: ${answer}`.slice(0, 1000) }).eq("id", txt(f, "id", 40));
  revalidatePath(BASE, "layout");
  return { ok: true, message: "Decision recorded. Journey will follow it across this whole category." };
}

/** Drafts new entries with Journey (OpenAI) from founder principles. Uses the owner's private test budget, never member allowances. */
export async function draftTrainingEntries(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const o = await owner(); if (!o) return NO;
  if (!hasRole(o.viewer, ["owner"])) return { ok: false, message: "Only the owner can draft with Journey." };
  const c = category(f); if (!c) return { ok: false, message: "Unknown category." };
  const [{ data: cat }, { data: existing }] = await Promise.all([
    o.db.from("journey_training_categories").select("key, title, description, founder_decisions").eq("key", c).single(),
    o.db.from("journey_training_entries").select("topic").eq("category", c),
  ]);
  if (!cat) return { ok: false, message: "Unknown category." };
  const principles = FOUNDER_PRINCIPLES[c] ?? [];
  const reply = await sendJourneyMessage({
    mode: "life", ownerTest: true, comparisonId: randomUUID(), requestKey: randomUUID(),
    message: draftRequest(cat as TrainingCategory, principles, (existing ?? []).map((e) => e.topic), txt(f, "hint", 300)),
  });
  if (!reply.ok) return { ok: false, message: reply.message };
  const drafts = parseDrafts(reply.reply, c, principles);
  if (!drafts.length) return { ok: false, message: "Journey's drafts couldn't be read this time. Nothing was saved; please try again." };
  const { error } = await o.db.from("journey_training_entries").insert(drafts.map((d) => ({ ...d, origin: "generated", status: "pending", source: "generator", created_by: o.viewer.id })));
  if (error) return { ok: false, message: "The drafts couldn't be saved. Please try again." };
  revalidatePath(BASE, "layout");
  return { ok: true, message: `${drafts.length} new draft${drafts.length === 1 ? "" : "s"} added for your review${reply.test ? ` (cost ${reply.test.costCents.toFixed(2)}¢ from your test budget)` : ""}.` };
}
