import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isAnswered, unpackOnboardingAnswer, type Answers, type StoredAnswer } from "@/lib/onboarding";

/** A member's own saved onboarding answers (row security returns only their own). */
export async function loadOnboardingDraft(userId: string): Promise<{ answers: Answers; reflections: Record<string, string> }> {
  const answers: Answers = {};
  const reflections: Record<string, string> = {};
  const supabase = await createClient();
  if (!supabase) return { answers, reflections };
  const { data } = await supabase.from("onboarding_answers").select("question_id, value").eq("user_id", userId);
  for (const row of data ?? []) {
    const { answer, reflection } = unpackOnboardingAnswer(row.value as StoredAnswer);
    if (isAnswered(answer)) answers[row.question_id] = answer;
    if (reflection) reflections[row.question_id] = reflection;
  }
  return { answers, reflections };
}

export async function loadAnswers(userId: string): Promise<Answers> {
  return (await loadOnboardingDraft(userId)).answers;
}

