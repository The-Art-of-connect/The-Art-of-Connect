"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { moduleBySlug } from "@/lib/who-am-i";
import { analysisKey, journeyDiscoveryPrompt, type ReflectionAnswer } from "@/lib/personal-discovery";
import { sendJourneyMessage } from "@/lib/journey-server";
import type { ActionResult } from "@/app/actions/admin";

/**
 * A paid member asks Journey for a deeper Personal Discovery of one chapter.
 * Requires explicit consent to share this chapter's answers with Journey. Billing,
 * allowance, payments and launch checks are all enforced inside sendJourneyMessage:
 * credits are used only when Journey actually writes the analysis.
 */
export async function createJourneyDiscovery(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer)) return { ok: false, message: "Please sign in first." };
  if (f.get("consent") !== "yes") return { ok: false, message: "Please confirm that Journey may read this chapter's answers." };
  const mod = moduleBySlug(String(f.get("module") ?? ""));
  if (!mod || !mod.questions.length) return { ok: false, message: "Unknown chapter." };
  const supabase = (await createClient())!;
  const { data } = await supabase.from("discovery_answers").select("question_key, answer, choices").eq("user_id", viewer.id).in("question_key", mod.questions.map((q) => q.key));
  const all: Record<string, ReflectionAnswer> = Object.fromEntries((data ?? []).map((r) => [r.question_key, r as ReflectionAnswer]));
  if (!Object.values(all).some((a) => a.answer || a.choices?.length)) return { ok: false, message: "Answer at least one question first." };

  const reply = await sendJourneyMessage({
    mode: "life", message: journeyDiscoveryPrompt(mod, all, 3900), requestKey: randomUUID(),
    ownerTest: viewer.roles.length > 0,
  });
  if (!reply.ok) return { ok: false, message: reply.message };
  const { error } = await supabase.from("discovery_answers").upsert(
    { user_id: viewer.id, question_key: analysisKey(mod.slug), answer: reply.reply.slice(0, 4000), choices: null },
    { onConflict: "user_id,question_key" },
  );
  if (error) return { ok: false, message: "Journey wrote your discovery, but it couldn't be saved. It's in your Journey conversations." };
  revalidatePath(`/app/know-yourself/who-am-i/${mod.slug}`);
  return { ok: true, message: "Your Personal Discovery from Journey is ready, saved privately for you." };
}
