"use server";
import { revalidatePath } from "next/cache";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ageEligibility, applicableQuestions, DEFAULT_REGISTRY, packOnboardingAnswer, STAGES, type AnswerValue, type StageId, type StoredAnswer, type Track } from "@/lib/onboarding";
import type { ActionResult } from "@/app/actions/admin";

/**
 * Saves one onboarding stage. Every answer is saved as soon as it is given,
 * so a member can stop at any point and continue later. Private answers stay
 * private: the database lets only the member read their own answers.
 */
export async function saveOnboardingStage(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer)) return { ok: false, message: "Preview only — answers aren't saved." };
  const stage = String(form.get("stage")) as StageId;
  if (!STAGES.some((s) => s.id === stage)) return { ok: false, message: "Unknown stage." };
  const track = (form.get("track") === "couple" ? "couple" : "single") as Track;
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Saving opens soon." };

  const rows: { user_id: string; question_id: string; question_version: number; value: StoredAnswer }[] = [];
  for (const q of applicableQuestions(DEFAULT_REGISTRY, stage, { track, answers: {} })) {
    let value: AnswerValue = null;
    if (q.kind === "multi_choice") {
      value = form.getAll(q.id).map(String).filter((v) => q.options?.includes(v)).slice(0, 12);
    } else if (q.kind === "single_choice") {
      const v = String(form.get(q.id) ?? "");
      value = q.options?.includes(v) ? v : null;
    } else if (q.kind === "range") {
      const min = Number(form.get(`${q.id}.min`)), max = Number(form.get(`${q.id}.max`));
      value = Number.isFinite(min) && Number.isFinite(max) && min >= 30 && max <= 99 && min <= max ? { min, max } : null;
    } else {
      value = String(form.get(q.id) ?? "").trim().slice(0, q.kind === "long_text" ? 2000 : 200) || null;
    }
    if (q.id === "q.date_of_birth" && typeof value === "string") {
      const e = ageEligibility(value, track);
      if (!e.eligible) return { ok: false, message: e.reason! };
    }
    const stored = packOnboardingAnswer(value, q.reflection ? form.get(`${q.id}.reflection`) : null);
    if (stored !== undefined) rows.push({ user_id: viewer.id, question_id: q.id, question_version: q.version, value: stored });
  }
  if (rows.length) {
    const { error } = await supabase.from("onboarding_answers").upsert(rows.map((r) => ({ ...r, updated_at: new Date().toISOString() })));
    if (error) return { ok: false, message: "Your answers weren't saved. Please try again." };
  }
  revalidatePath("/app/relationships/onboarding", "layout");
  const next = STAGES[STAGES.findIndex((s) => s.id === stage) + 1];
  return { ok: true, message: next ? `Saved. Continue to ${next.title} whenever you're ready.` : "Saved. Your onboarding is complete." };
}
