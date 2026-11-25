import "server-only";
import { teachingGuidance } from "@/lib/curricula";
import { cleanPrefs, DEFAULT_PREFS, paceSpeed, styleInstructions } from "@/lib/journey-customize";
import { discoveryCategory, discoveryInstructions } from "@/lib/journey-discovery";
import { FOUNDER_PRINCIPLES, RESPONSE_STANDARDS } from "@/lib/journey-training-seed";
import { getMfaStatus, getViewer } from "@/lib/auth";
import { getLaunchState } from "@/lib/launch";
import { serverSecret } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildJourneyInstructions, effectiveMode, journeyAccessFor, modeAllowed, ownerTestAccess, type JourneyMode } from "@/lib/journey";
import { loadSettings, membershipFor } from "@/lib/journey-server";

/**
 * Talk to Journey — OpenAI Realtime voice over WebRTC.
 * The browser never sees the OpenAI API key: the server checks membership,
 * voice minutes and budgets, then asks OpenAI for a short-lived client secret
 * (ek_…) that only works for one session with Journey's instructions.
 * Time is measured on the server and capped at the minutes allowed.
 */

export const VOICE_STYLES = {
  warm: { label: "Warm & expressive", voice: "marin" },
  calm: { label: "Calm & reassuring", voice: "sage" },
  confident: { label: "Confident & direct", voice: "cedar" },
  soft: { label: "Soft & reflective", voice: "shimmer" },
  friendly: { label: "Friendly & energetic", voice: "coral" },
} as const;
export type VoiceStyle = keyof typeof VOICE_STYLES;

export type VoiceStart =
  | { ok: true; clientSecret: string; voiceSessionId: string; allowedSeconds: number; inactivitySeconds: number; model: string }
  | { ok: false; message: string };

export async function startVoice(input: { mode: JourneyMode; style: VoiceStyle; ownerTest?: boolean; lesson?: string | null; discovery?: string | null }): Promise<VoiceStart> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "Please sign in to talk with Journey." };
  const db = createAdminClient();
  const key = serverSecret("OPENAI_API_KEY");
  if (!db || !key) return { ok: false, message: "Talk to Journey opens soon." };
  const cfg = await loadSettings(db);
  if (!cfg || !cfg.voice.enabled || !cfg.voice.model || cfg.voice.centsPerMinute === null) return { ok: false, message: "Talk to Journey opens soon." };

  let holder = viewer.id, pkg: string | null = null, access: "standard" | "enhanced" = "enhanced", allowed = cfg.voice.maxSessionMinutes * 60;
  if (input.ownerTest) {
    const mfa = await getMfaStatus();
    if (!ownerTestAccess({ roles: viewer.roles, mfaVerified: mfa.verified, ownerTestingEnabled: cfg.ownerTestingEnabled })) return { ok: false, message: "Owner testing isn't authorized for this session." };
  } else {
    const m = await membershipFor(db, viewer.id);
    const level = journeyAccessFor(m?.membership, { enhancedPackages: cfg.enhancedPackages, entitledStatuses: cfg.entitledStatuses });
    if (!m || level === "none") return { ok: false, message: "Journey is a benefit of paid memberships." };
    // Live voice is included in every paid plan: fall back to an experience the plan includes.
    const em = input.mode === "concierge" ? (modeAllowed("concierge", level, m.membership) ? "concierge" : null) : effectiveMode(input.mode, level, m.membership);
    if (!em) return { ok: false, message: "This Journey experience isn't part of your membership." };
    input = { ...input, mode: em };
    const launch = await getLaunchState();
    if (!launch.payments_live) return { ok: false, message: "Talk to Journey opens soon." };
    access = level; holder = m.holderId; pkg = m.membership.packageSlug;
    const [{ data: t }, { data: used }, { data: credits }] = await Promise.all([
      db.from("journey_tier_limits").select("monthly_voice_minutes").eq("package_slug", pkg ?? "").maybeSingle(),
      db.rpc("journey_voice_used", { p_holder: holder, p_period_start: m.periodStart.toISOString() }),
      db.from("journey_message_credits").select("messages, used").eq("holder_id", holder).eq("kind", "voice_minutes").or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`),
    ]);
    if (t?.monthly_voice_minutes == null) return { ok: false, message: "Voice isn't included in your membership yet." };
    const extra = (credits ?? []).reduce((n, c) => n + (c.messages - c.used), 0) * 60;
    const remaining = t.monthly_voice_minutes * 60 + extra - Number(used ?? 0);
    allowed = Math.min(allowed, remaining);
    if (allowed < 30) return { ok: false, message: "You've used this period's voice minutes. You can still chat with Journey in writing, and your minutes reset on your next billing date." };
  }

  const reserve = Math.round(((cfg.voice.centsPerMinute * allowed) / 60) * 10_000) / 10_000;
  const { data: started } = await db.rpc("journey_voice_start", { p_user: viewer.id, p_holder: holder, p_package: pkg, p_allowed_seconds: allowed, p_owner_test: Boolean(input.ownerTest), p_reserve: reserve });
  if (typeof started !== "string" || started.startsWith("refused:")) {
    return { ok: false, message: started === "refused:in_progress" ? "You already have a voice conversation open." : "Talk to Journey is resting right now. Please try again later." };
  }

  let topic = `\n\n# Response standards\n${RESPONSE_STANDARDS.map((x) => `- ${x}`).join("\n")}`;
  if (input.lesson) topic += `\n\n${await teachingGuidance(db, input.lesson)}\nThis is a live, spoken lesson: teach conversationally, one idea and one question at a time.`;
  const dc = input.discovery ? discoveryCategory(input.discovery) : null;
  if (dc) {
    const { data: tc } = await db.from("journey_training_categories").select("learning_objectives").eq("key", dc.key).maybeSingle();
    topic += `\n\n${discoveryInstructions(dc, tc?.learning_objectives ?? [], FOUNDER_PRINCIPLES[dc.key] ?? [], false)}\nThis discovery is spoken aloud: ask one short question at a time and wait.`;
  }
  const { data: prefRow } = await db.from("journey_voice_preferences").select("presentation, voice, age_style, language, accent, personality, pace, avatar").eq("user_id", viewer.id).maybeSingle();
  const prefs = prefRow ? cleanPrefs({ ...prefRow, age: prefRow.age_style }) : { ...DEFAULT_PREFS, voice: VOICE_STYLES[input.style].voice };
  topic += `\n\n${styleInstructions(prefs, true)}`;
  const instructions = buildJourneyInstructions({ mode: input.mode, access, ownerInstructions: null, disabledCapabilities: cfg.disabled }) + topic
    + "\n\n# Voice conversation\nYou are speaking aloud. Begin by briefly saying you are Journey, an AI assistant with an AI-generated voice. Keep replies warm, natural and concise (a few sentences), and pause to let the member speak.";
  const res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "OpenAI-Safety-Identifier": await hashId(viewer.id) },
    body: JSON.stringify({
      expires_after: { anchor: "created_at", seconds: 60 },
      session: { type: "realtime", model: cfg.voice.model, instructions, audio: { output: { voice: prefs.voice, speed: paceSpeed(prefs.pace) } }, max_output_tokens: 1200 },
    }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  const json = res ? await res.json().catch(() => null) : null;
  if (!res?.ok || !json?.value) {
    await db.rpc("journey_voice_end", { p_id: started, p_user: viewer.id, p_transcript: "" });
    return { ok: false, message: "Journey couldn't connect just now. No minutes were used." };
  }
  return { ok: true, clientSecret: json.value, voiceSessionId: started, allowedSeconds: allowed, inactivitySeconds: cfg.voice.inactivitySeconds, model: cfg.voice.model };
}

export async function endVoice(voiceSessionId: string, transcript: string, saveTranscript: boolean): Promise<number> {
  const viewer = await getViewer();
  const db = createAdminClient();
  if (!viewer || !db) return 0;
  const { data } = await db.rpc("journey_voice_end", { p_id: voiceSessionId, p_user: viewer.id, p_transcript: saveTranscript ? transcript : "" });
  return Number(data ?? 0);
}

async function hashId(id: string) {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(`aoc-journey:${id}`).digest("hex").slice(0, 32);
}
