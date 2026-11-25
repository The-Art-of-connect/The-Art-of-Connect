import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Answers } from "@/lib/onboarding";

/** A member's own saved onboarding answers (row security returns only their own). */
export async function loadAnswers(userId: string): Promise<Answers> {
  const supabase = await createClient();
  if (!supabase) return {};
  const { data } = await supabase.from("onboarding_answers").select("question_id, value").eq("user_id", userId);
  return Object.fromEntries((data ?? []).map((r) => [r.question_id, (r.value as { answer?: unknown })?.answer ?? r.value]));
}

