"use server";
import { revalidatePath } from "next/cache";
import { getMfaStatus, getViewer, hasRole, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverSecret } from "@/lib/env";
import { cleanPrefs, OPENAI_VOICES } from "@/lib/journey-customize";
import type { ActionResult } from "@/app/actions/admin";

/** Saves the member's Customize Your Journey preferences. Included with every paid membership; no fee. */
export async function saveJourneyPrefs(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer)) return { ok: false, message: "Please sign in first." };
  const p = cleanPrefs(Object.fromEntries(["presentation", "voice", "age", "language", "accent", "personality", "pace", "avatar"].map((k) => [k, f.get(k)])));
  const supabase = (await createClient())!;
  const { error } = await supabase.from("journey_voice_preferences").upsert({
    user_id: viewer.id, presentation: p.presentation, voice: p.voice, age_style: p.age, language: p.language, accent: p.accent,
    personality: p.personality, pace: p.pace, avatar: p.avatar, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) return { ok: false, message: "Not saved. Please try again." };
  revalidatePath("/app/journey", "layout");
  return { ok: true, message: "Saved. Journey will use your preferences in every conversation, written and live." };
}

const PREVIEW_LINE = "Hello, I'm Journey. I'm so glad you're here. Whenever you're ready, I'm listening.";

/**
 * Owner only: creates a short preview clip for each OpenAI voice (one-time, owner-initiated,
 * a fraction of a cent each). Members then hear previews without any AI cost.
 */
export async function generateVoicePreviews(_p: ActionResult, _f: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!hasRole(viewer, ["owner"])) return { ok: false, message: "Only the owner can create voice previews." };
  if (!(await getMfaStatus()).verified) return { ok: false, message: "Please complete two-step verification first." };
  const key = serverSecret("OPENAI_API_KEY");
  const db = createAdminClient();
  if (!key || !db) return { ok: false, message: "OpenAI isn't connected yet." };
  let made = 0; const failed: string[] = [];
  for (const v of OPENAI_VOICES) {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: v.id, input: PREVIEW_LINE, response_format: "mp3", instructions: "Speak warmly and naturally, like a thoughtful companion." }),
      signal: AbortSignal.timeout(30_000),
    }).catch(() => null);
    if (!res?.ok) { failed.push(v.name); continue; }
    const audio = Buffer.from(await res.arrayBuffer()).toString("base64");
    const { error } = await db.from("journey_voice_previews").upsert({ voice: v.id, audio_base64: audio, created_at: new Date().toISOString() });
    if (error) failed.push(v.name); else made++;
  }
  revalidatePath("/admin/journey");
  return { ok: made > 0, message: `${made} voice preview${made === 1 ? "" : "s"} ready.${failed.length ? ` Not available from OpenAI right now: ${failed.join(", ")}.` : ""}` };
}
