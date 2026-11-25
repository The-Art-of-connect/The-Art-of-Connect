import "server-only";
import { getMfaStatus, getViewer } from "@/lib/auth";
import { getLaunchState } from "@/lib/launch";
import { serverSecret } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { journeyAccessFor, modeAllowed, ownerTestAccess, type JourneyMode } from "@/lib/journey";
import { assembleInstructions, loadSettings, membershipFor } from "@/lib/journey-server";

/**
 * Journey Live — real-time voice over WebRTC with OpenAI Realtime.
 * The browser never sees the OpenAI API key: the server checks membership,
 * voice minutes and budgets, then asks OpenAI for a short-lived client secret
 * for one session with Journey's full instructions (the same personality,
 * philosophy and memory as written conversations). Raw audio is never stored.
 */

export const REALTIME_VOICES = ["marin", "cedar", "alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"] as const;
export type RealtimeVoice = (typeof REALTIME_VOICES)[number];

export const VOICE_STYLES = {
  warm: { label: "Warm & expressive", voice: "marin" },
  calm: { label: "Calm & reassuring", voice: "sage" },
  confident: { label: "Confident & direct", voice: "cedar" },
  soft: { label: "Soft & reflective", voice: "shimmer" },
  friendly: { label: "Friendly & energetic", voice: "coral" },
} as const;
export type VoiceStyle = keyof typeof VOICE_STYLES | "journey";

const DEPTH_TOKENS = { balanced: 900, complete: 1800, in_depth: 3200 } as const;

/** How Journey listens and speaks in a live conversation (Journey Live brief). */
export const LIVE_GUIDANCE = `# Journey Live — you are in a real-time spoken conversation
- Begin warmly and briefly let the member know you are Journey, an AI companion with an AI-generated voice.
- This should feel like a natural, unhurried telephone conversation with someone who truly listens — never like an automated assistant.
- Clarity before speed. Understanding before responding. Quality before convenience.
- Let the member finish. Natural pauses, hesitation and silence often mean they are gathering their thoughts — do not rush to fill them.
- Never answer incomplete or misunderstood speech as though you understood it. If audio is unclear, noisy or cut off, kindly ask them to repeat or rephrase rather than guessing.
- Ask a clarifying question when the intention isn't clear.
- Do not shorten meaningful responses because this is voice. Give complete, coherent, thoughtful replies the moment calls for — spoken naturally, in flowing sentences rather than lists or headings.
- If the member interrupts you, stop gracefully and listen.
- Match your energy to the moment: calm and gentle in difficult conversations, genuinely warm and celebratory for good news.

## Emotional awareness and compassionate listening
- Notice emotional cues — possible crying, trembling speech, changes in tone, hesitation, laughter or extended silence.
- If the member seems to be crying or overwhelmed: soften and slow your voice; reassure them — "Take your time. I'm here for you."; allow silence without rushing; don't ask several questions at once or jump to solutions; let them know their feelings are welcome, without embarrassment; let them resume when they're ready.
- Never assume tears mean sadness — they may be happiness, relief, frustration, grief or a breakthrough. When cues are uncertain, gently ask how they're feeling.
- If they're emotional while celebrating, celebrate with them.
- Respond to this person and this moment, never with generic emotional scripts.
- If there are signs of danger, abuse or self-harm, prioritize safety and gently encourage immediate human or professional help (911 in the U.S., or call or text 988).`;

export type VoiceStart =
  | { ok: true; clientSecret: string; voiceSessionId: string; conversationId: string | null; allowedSeconds: number; inactivitySeconds: number; model: string; manual: boolean }
  | { ok: false; message: string };

export async function startVoice(input: {
  mode: JourneyMode; style: VoiceStyle; ownerTest?: boolean; conversationId?: string | null; speed?: number | null; manual?: boolean;
  /** Owner auditions only. */
  voice?: RealtimeVoice | null; instructionVersion?: number | null; depth?: keyof typeof DEPTH_TOKENS | null;
}): Promise<VoiceStart> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "Please sign in to talk with Journey." };
  const db = createAdminClient();
  const key = serverSecret("OPENAI_API_KEY");
  if (!db || !key) return { ok: false, message: "Journey Live opens soon." };
  const cfg = await loadSettings(db);
  if (!cfg || !cfg.voice.enabled || !cfg.voice.model || cfg.voice.centsPerMinute === null) return { ok: false, message: "Journey Live opens soon." };
  const { data: vs } = await db.from("journey_settings").select("voice_default, voice_speed, voice_depth, voice_eagerness, voice_noise_reduction, voice_transcribe_model").maybeSingle();

  let holder = viewer.id, pkg: string | null = null, access: "standard" | "enhanced" = "enhanced", allowed = cfg.voice.maxSessionMinutes * 60;
  const owner = Boolean(input.ownerTest);
  if (owner) {
    const mfa = await getMfaStatus();
    if (!ownerTestAccess({ roles: viewer.roles, mfaVerified: mfa.verified, ownerTestingEnabled: cfg.ownerTestingEnabled })) return { ok: false, message: "Owner testing isn't authorized for this session." };
  } else {
    const m = await membershipFor(db, viewer.id);
    const level = journeyAccessFor(m?.membership, { enhancedPackages: cfg.enhancedPackages, entitledStatuses: cfg.entitledStatuses });
    if (!m || level === "none") return { ok: false, message: "Journey is a benefit of paid memberships." };
    if (!modeAllowed(input.mode, level, m.membership)) return { ok: false, message: "This Journey experience isn't part of your membership." };
    const launch = await getLaunchState();
    if (!launch.payments_live) return { ok: false, message: "Journey Live opens soon." };
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

  // Continue a previous conversation (the member's own only).
  let conversationId = input.conversationId ?? null;
  let recent = "";
  if (conversationId) {
    const { data: conv } = await db.from("journey_conversations").select("id").eq("id", conversationId).eq("user_id", viewer.id).maybeSingle();
    if (!conv) return { ok: false, message: "That conversation wasn't found." };
    const { data: msgs } = await db.from("journey_messages").select("role, content").eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(16);
    recent = (msgs ?? []).reverse().map((x) => `${x.role === "journey" ? "Journey" : "Member"}: ${x.content.slice(0, 1200)}`).join("\n");
  } else {
    const { data: c } = await db.from("journey_conversations").insert({ user_id: viewer.id, mode: input.mode, title: `${owner ? "[Owner test] " : ""}Live conversation` }).select("id").single();
    conversationId = c?.id ?? null;
  }

  const reserve = Math.round(((cfg.voice.centsPerMinute * allowed) / 60) * 10_000) / 10_000;
  const { data: started } = await db.rpc("journey_voice_start", { p_user: viewer.id, p_holder: holder, p_package: pkg, p_allowed_seconds: allowed, p_owner_test: owner, p_reserve: reserve });
  if (typeof started !== "string" || started.startsWith("refused:")) {
    return { ok: false, message: started === "refused:in_progress" ? "You already have a voice conversation open." : "Journey Live is resting right now. Please try again later." };
  }
  await db.from("journey_voice_sessions").update({ conversation_id: conversationId, mode: input.mode }).eq("id", started);

  const { instructions: base } = await assembleInstructions(db, cfg, { userId: viewer.id, mode: input.mode, access, ownerTest: owner, instructionVersion: owner ? input.instructionVersion : null });
  const instructions = `${base}\n\n${LIVE_GUIDANCE}${recent ? `\n\n# Earlier in this conversation (continue naturally; don't repeat it back)\n${recent}` : ""}`;

  const voice: RealtimeVoice = owner && input.voice ? input.voice
    : input.style !== "journey" && input.style in VOICE_STYLES ? (VOICE_STYLES[input.style].voice as RealtimeVoice)
    : ((vs?.voice_default as RealtimeVoice) ?? "marin");
  const speed = Math.min(1.3, Math.max(0.7, Number(input.speed ?? vs?.voice_speed ?? 1)));
  const depth = (owner && input.depth) || (vs?.voice_depth as keyof typeof DEPTH_TOKENS) || "complete";
  const manual = Boolean(input.manual);
  const noise = vs?.voice_noise_reduction ?? "near_field";

  const session = {
    type: "realtime",
    model: cfg.voice.model,
    instructions,
    max_output_tokens: DEPTH_TOKENS[depth] ?? 1800,
    audio: {
      input: {
        transcription: { model: vs?.voice_transcribe_model ?? "gpt-4o-mini-transcribe" },
        ...(noise === "off" ? {} : { noise_reduction: { type: noise } }),
        // Patient turn-taking: semantic detection waits for the member to finish their thought. Manual mode: the member decides when they're done.
        turn_detection: manual ? null : { type: "semantic_vad", eagerness: vs?.voice_eagerness ?? "low", create_response: true, interrupt_response: true },
      },
      output: { voice, speed },
    },
  };
  const res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "OpenAI-Safety-Identifier": await hashId(viewer.id) },
    body: JSON.stringify({ expires_after: { anchor: "created_at", seconds: 60 }, session }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  const json = res ? await res.json().catch(() => null) : null;
  if (!res?.ok || !json?.value) {
    await db.rpc("journey_voice_end", { p_id: started, p_user: viewer.id, p_transcript: "" });
    return { ok: false, message: owner && json?.error?.message ? `Journey couldn't connect: ${String(json.error.message).slice(0, 200)}` : "Journey couldn't connect just now. No minutes were used." };
  }
  return { ok: true, clientSecret: json.value, voiceSessionId: started, conversationId, allowedSeconds: allowed, inactivitySeconds: cfg.voice.inactivitySeconds, model: cfg.voice.model, manual };
}

export type Line = { role: "member" | "journey"; text: string };

/** Ends a live conversation; time is measured on the server. With the member's permission the transcript is saved privately and joins the written conversation. */
export async function endVoice(voiceSessionId: string, lines: Line[], saveTranscript: boolean): Promise<number> {
  const viewer = await getViewer();
  const db = createAdminClient();
  if (!viewer || !db) return 0;
  const clean = lines.filter((l) => l.text.trim()).slice(0, 400).map((l) => ({ role: l.role, text: l.text.slice(0, 4000) }));
  const transcript = clean.map((l) => `${l.role === "journey" ? "Journey" : "You"}: ${l.text}`).join("\n");
  const { data } = await db.rpc("journey_voice_end", { p_id: voiceSessionId, p_user: viewer.id, p_transcript: saveTranscript ? transcript : "" });
  if (saveTranscript && clean.length) {
    const { data: v } = await db.from("journey_voice_sessions").select("conversation_id").eq("id", voiceSessionId).eq("user_id", viewer.id).maybeSingle();
    if (v?.conversation_id) {
      await db.from("journey_messages").insert(clean.map((l) => ({ conversation_id: v.conversation_id, user_id: viewer.id, role: l.role, content: l.text })));
      await db.from("journey_conversations").update({ updated_at: new Date().toISOString() }).eq("id", v.conversation_id).eq("user_id", viewer.id);
    }
  }
  return Number(data ?? 0);
}

async function hashId(id: string) {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(`aoc-journey:${id}`).digest("hex").slice(0, 32);
}
