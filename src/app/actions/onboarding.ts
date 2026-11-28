"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ageEligibility, applicableQuestions, DEFAULT_REGISTRY, packOnboardingAnswer, STAGES, stageProgress, type Answers, type AnswerValue, type StoredAnswer, type Track } from "@/lib/onboarding";
import type { ActionResult } from "@/app/actions/admin";

/** Saves a private onboarding draft before continuing to the next stage. */
export async function saveOnboardingStage(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer)) return { ok: false, message: "Preview only — answers aren't saved." };
  const stage = STAGES.find((s) => s.id === form.get("stage"));
  if (!stage) return { ok: false, message: "Unknown stage." };
  const track = (form.get("track") === "couple" ? "couple" : "single") as Track;
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Saving opens soon." };

  const answers: Answers = {};
  const rows: { user_id: string; question_id: string; question_version: number; value: StoredAnswer }[] = [];
  for (const q of applicableQuestions(DEFAULT_REGISTRY, stage.id, { track, answers })) {
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
    answers[q.id] = value;
    const stored = packOnboardingAnswer(value, q.reflection ? form.get(`${q.id}.reflection`) : null);
    // An empty submitted field must clear the previous value as well.
    rows.push({ user_id: viewer.id, question_id: q.id, question_version: q.version, value: stored ?? { answer: null, reflection: "" } });
  }
  if (rows.length) {
    const { error } = await supabase.from("onboarding_answers").upsert(rows.map((r) => ({ ...r, updated_at: new Date().toISOString() })));
    if (error) return { ok: false, message: "Your answers weren't saved. Please try again." };
  }
  const hub = "/app/relationships/onboarding";
  revalidatePath(hub, "layout");
  revalidatePath("/app/readiness");
  if (form.get("intent") !== "continue") return { ok: true, message: "Your progress is saved." };

  const progress = stageProgress(DEFAULT_REGISTRY, stage.id, { track, answers });
  if (!progress.complete) {
    return { ok: true, message: "Your progress is saved. Answer the remaining required questions to continue." };
  }

  const next = STAGES[stage.order];
  redirect(next ? `${hub}/${next.id}` : hub);
}
