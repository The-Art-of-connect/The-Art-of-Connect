import "server-only";
import { guideInstructions } from "@/lib/journey-guide";
import { isLiveModel, providerCostCents, voiceModelById } from "@/lib/journey-voice-models";
import { loadGuideAnswers, resolveGuide } from "@/lib/journey-guide-server";
import { personaIsPaid } from "@/lib/view-as";
import { cleanPrefs, DEFAULT_PREFS, paceSpeed, voiceById } from "@/lib/journey-customize";
import { discoveryCategory, discoveryInstructions } from "@/lib/journey-discovery";
import { FOUNDER_PRINCIPLES } from "@/lib/journey-training-seed";
import { getMfaStatus, getViewer, hasRole } from "@/lib/auth";
import { getLaunchState } from "@/lib/launch";
import { serverSecret } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { effectiveMode, journeyAccessFor, modeAllowed, ownerTestAccess, type JourneyMode } from "@/lib/journey";
import { composeFoundation, loadSettings, membershipFor, trainingFor } from "@/lib/journey-server";

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
  | { ok: true; family: "realtime"; clientSecret: string; voiceSessionId: string; allowedSeconds: number; inactivitySeconds: number; model: string }
  | { ok: true; family: "live"; answerSdp: string; liveSessionId: string; voiceSessionId: string; allowedSeconds: number; inactivitySeconds: number; model: string; sample?: string }
  | { ok: false; message: string };

/** GPT-Live accepts up to 16,384 tokens of instructions; keep a safe margin (about 4 characters per token). */
const LIVE_INSTRUCTION_CHARS = 56_000;

export async function startVoice(input: {
  mode: JourneyMode; style: VoiceStyle; ownerTest?: boolean; lesson?: string | null; discovery?: string | null;
  /** Owner Voice Studio only: compare another supported voice model. Members always use the production model. */
  model?: string | null;
  /** GPT-Live: the browser's WebRTC offer, exchanged here for OpenAI's answer (the API key never leaves the server). */
  sdp?: string | null;
  /** Owner only: record a short GPT-Live sample of this voice for members' free previews. */
  previewVoice?: string | null;
}): Promise<VoiceStart> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "Please sign in to talk with Journey." };
  if (viewer.viewAs) {
    if (!personaIsPaid(viewer.viewAs)) return { ok: false, message: "Journey is a benefit of paid memberships." };
    input = { ...input, ownerTest: true };
  }
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
    if (allowed < 30) return { ok: false, message: "You've used this period's voice minutes. You can keep talking with Journey in writing, your minutes reset on your next billing date, and additional voice minutes are available at our cost in Journey Plus if you'd like." };
  }

  const previewVoice = input.ownerTest && input.previewVoice && voiceById(input.previewVoice) && hasRole(viewer, ["owner"]) && !viewer.viewAs ? voiceById(input.previewVoice)! : null;
  if (input.previewVoice && !previewVoice) return { ok: false, message: "Only the owner can record voice previews." };
  if (previewVoice) allowed = Math.min(allowed, 45);
  const model = previewVoice ? "gpt-live-1.1" : input.ownerTest && input.model && voiceModelById(input.model) ? input.model : cfg.voice.model;
  const catalog = voiceModelById(model);
  const live = isLiveModel(model);
  if (live && !input.sdp) return { ok: false, message: "Please refresh the page and try again." };
  // GPT-Live has an official per-minute price; other models use the owner's rate, or the catalog estimate when comparing.
  const rate = live ? (catalog?.liveCentsPerMinute ?? 5) : model === cfg.voice.model ? cfg.voice.centsPerMinute : (catalog?.budgetCentsPerMinute ?? cfg.voice.centsPerMinute);
  const reserve = Math.round(((rate * allowed) / 60) * 10_000) / 10_000;
  const { data: started } = await db.rpc("journey_voice_start", { p_user: viewer.id, p_holder: holder, p_package: pkg, p_allowed_seconds: allowed, p_owner_test: Boolean(input.ownerTest), p_reserve: reserve });
  if (typeof started !== "string" || started.startsWith("refused:")) {
    const why: Record<string, string> = {
      "refused:in_progress": "You already have a voice conversation open.",
      "refused:test_budget": "Owner testing budget reached for this month. Raise it under Company budgets to keep testing.",
      "refused:test_budget_unset": "Owner testing budget isn't set. Set it under Company budgets.",
      "refused:company_budget": "This month's company AI budget has been reached.",
      "refused:company_budget_unset": "The company AI budget isn't set yet.",
    };
    return { ok: false, message: (input.ownerTest && typeof started === "string" && why[started]) || (started === "refused:in_progress" ? why[started] : "Talk to Journey is resting right now. Please try again later.") };
  }
  await db.from("journey_voice_sessions").update({ model, cents_per_minute: rate }).eq("id", started);

  if (previewVoice) {
    const sample = PREVIEW_SAMPLES[previewVoice.language] ?? PREVIEW_SAMPLES.en;
    const res = await fetch("https://api.openai.com/v1/live/sessions", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ session: { model, instructions: `You are Journey, the AI companion of The Art of Connect, recording a short voice sample. Speak warmly and naturally. When asked, read the sample text exactly, then stop and stay silent. Do not generate <|SpawnThinking|>; do not delegate.`, audio: { output: { voice: previewVoice.id } }, delegation: { type: "client" } }, transport: { type: "webrtc", sdp: input.sdp } }),
      signal: AbortSignal.timeout(20_000),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => null) : null;
    if (!res?.ok || !json?.transport?.sdp || !json?.session?.id) {
      await db.rpc("journey_voice_end", { p_id: started, p_user: viewer.id, p_transcript: "" });
      return { ok: false, message: `${previewVoice.name}: ${json?.error?.message ? String(json.error.message).slice(0, 200) : "OpenAI didn't accept this voice."}` };
    }
    return { ok: true, family: "live", answerSdp: String(json.transport.sdp), liveSessionId: String(json.session.id), voiceSessionId: started, allowedSeconds: allowed, inactivitySeconds: cfg.voice.inactivitySeconds, model, sample } as VoiceStart;
  }

  // The same foundation as written conversations: Blueprint, philosophy, founder principles, knowledge, member context.
  const foundation = await composeFoundation(db, cfg, { userId: viewer.id, mode: input.mode, access, ownerTest: Boolean(input.ownerTest), lesson: input.lesson ?? null, spoken: true });
  let topic = "";
  if (input.lesson) {
    topic += "\n\nThis is a live, spoken lesson: teach conversationally, one idea and one question at a time.";
    // Universal integration: any guided module (questionnaires, reflections, lessons) can be completed by voice.
    const gm = await resolveGuide(db, input.lesson);
    if (gm) topic += `\n\n${guideInstructions(gm, await loadGuideAnswers(db, viewer.id, gm), true)}`;
  }
  const dc = input.discovery ? discoveryCategory(input.discovery) : null;
  if (dc) {
    const { data: tc } = await db.from("journey_training_categories").select("learning_objectives").eq("key", dc.key).maybeSingle();
    topic += `\n\n${discoveryInstructions(dc, tc?.learning_objectives ?? [], FOUNDER_PRINCIPLES[dc.key] ?? [], false)}\nThis discovery is spoken aloud: ask one short question at a time and wait.`;
  }
  // Voice has no typed message to match against, so include the founder training for this lesson or topic area.
  topic += await trainingFor(db, `${input.lesson ?? ""} ${dc?.key ?? ""} ${input.mode}`, { lesson: input.lesson ?? null, mode: input.mode, ownerTest: Boolean(input.ownerTest), max: 4 });
  const { data: prefRow } = await db.from("journey_voice_preferences").select("presentation, voice, age_style, language, accent, personality, pace, avatar").eq("user_id", viewer.id).maybeSingle();
  const prefs = prefRow ? cleanPrefs({ ...prefRow, age: prefRow.age_style }) : { ...DEFAULT_PREFS, voice: VOICE_STYLES[input.style].voice };
  const instructions = foundation.instructions + topic;
  const fail = async (detail?: string) => {
    await db.rpc("journey_voice_end", { p_id: started, p_user: viewer.id, p_transcript: "" });
    return { ok: false as const, message: `Journey couldn't connect just now. No minutes were used.${input.ownerTest && detail ? ` OpenAI said: ${detail}` : ""}` };
  };

  if (live) {
    // GPT-Live: full-duplex conversation. No backend model: Journey answers from her foundation directly.
    const livePrompt = `${instructions}

# Live conversation policies
Backchannel policy: Use gentle, natural backchannels (a soft "mm-hm" or "I hear you") sparingly, without talking over the member.
Interruption policy: When the member starts speaking, stop and listen. Continue from what they said, not from where you stopped.
Delegation policy: There is no backend. ${model === "gpt-live-1" ? "Do not generate <|SpawnThinking|>." : "Do not delegate."} Answer directly from your instructions and the conversation.
Greet the member once, warmly and briefly, when the conversation begins.`.slice(0, LIVE_INSTRUCTION_CHARS);
    const create = (voice: string) => fetch("https://api.openai.com/v1/live/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ session: { model, instructions: livePrompt, audio: { output: { voice } }, delegation: { type: "client" } }, transport: { type: "webrtc", sdp: input.sdp } }),
      signal: AbortSignal.timeout(20_000),
    }).catch(() => null);
    let res = await create(prefs.voice);
    // Some voices may not be offered by GPT-Live; fall back to its default voice rather than failing.
    if (res && res.status === 400 && prefs.voice !== "marin") res = await create("marin");
    const json = res ? await res.json().catch(() => null) : null;
    if (!res?.ok || !json?.transport?.sdp || !json?.session?.id) return fail(json?.error?.message ? String(json.error.message).slice(0, 300) : res ? `HTTP ${res.status}` : "no response");
    return { ok: true, family: "live", answerSdp: String(json.transport.sdp), liveSessionId: String(json.session.id), voiceSessionId: started, allowedSeconds: allowed, inactivitySeconds: cfg.voice.inactivitySeconds, model };
  }

  const res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "OpenAI-Safety-Identifier": await hashId(viewer.id) },
    body: JSON.stringify({
      expires_after: { anchor: "created_at", seconds: 60 },
      session: { type: "realtime", model, instructions, audio: {
        // GPT-Live's additional voices aren't available on Realtime models: use the core voice of the same presentation.
        output: { voice: voiceById(prefs.voice)?.liveOnly ? (prefs.presentation === "masculine" ? "cedar" : "marin") : prefs.voice, speed: paceSpeed(prefs.pace) },
        input: {
          // The member's words are transcribed so the private transcript (when they choose to keep one) and lesson answers include both sides.
          transcription: { model: "gpt-4o-mini-transcribe" },
          // Phones and laptops: filter room noise and speaker echo so Journey doesn't answer background sound or her own voice.
          noise_reduction: { type: "near_field" },
          // Wait for the member to finish their thought before replying, instead of reacting to every pause or sound.
          turn_detection: { type: "semantic_vad", eagerness: "low", create_response: true, interrupt_response: true },
        },
      }, max_output_tokens: 1200 },
    }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  const json = res ? await res.json().catch(() => null) : null;
  if (!res?.ok || !json?.value) return fail(json?.error?.message ? String(json.error.message).slice(0, 300) : res ? `HTTP ${res.status}` : "no response");
  return { ok: true, family: "realtime", clientSecret: json.value, voiceSessionId: started, allowedSeconds: allowed, inactivitySeconds: cfg.voice.inactivitySeconds, model };
}

export async function endVoice(voiceSessionId: string, transcript: string, saveTranscript: boolean, providerUsage?: Record<string, number> | null): Promise<number> {
  const viewer = await getViewer();
  const db = createAdminClient();
  if (!viewer || !db) return 0;
  const { data } = await db.rpc("journey_voice_end", { p_id: voiceSessionId, p_user: viewer.id, p_transcript: saveTranscript ? transcript : "" });
  // Usage as OpenAI reported it to the browser (seconds for GPT-Live, tokens for Realtime), priced from the published rates.
  // Informational for the owner's model comparison; budgets always use the server-measured time above.
  if (providerUsage) {
    const { data: v } = await db.from("journey_voice_sessions").select("model").eq("id", voiceSessionId).eq("user_id", viewer.id).maybeSingle();
    if (v?.model) await db.from("journey_voice_sessions").update({ provider_usage: providerUsage, provider_cost_cents: providerCostCents(v.model, providerUsage) }).eq("id", voiceSessionId).eq("user_id", viewer.id);
  }
  return Number(data ?? 0);
}

async function hashId(id: string) {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(`aoc-journey:${id}`).digest("hex").slice(0, 32);
}

/** What each GPT-Live voice says in its preview, in the language it was made for (gender-neutral wording). */
const PREVIEW_SAMPLES: Record<string, string> = {
  en: "Hello, I'm Journey, your AI companion at The Art of Connect. I'm here to listen, to understand, and to help you grow, at your own pace.",
  es: "Hola, soy Journey, la inteligencia artificial de The Art of Connect. Estoy aquí para escucharte, comprenderte y ayudarte a crecer, a tu propio ritmo.",
  pt: "Olá, eu sou Journey, a inteligência artificial da The Art of Connect. Estou aqui para ouvir, compreender e ajudar você a crescer, no seu próprio ritmo.",
  fr: "Bonjour, je suis Journey, l'intelligence artificielle de The Art of Connect. Je suis là pour vous écouter, vous comprendre et vous aider à grandir, à votre rythme.",
  de: "Hallo, ich bin Journey, die künstliche Intelligenz von The Art of Connect. Ich bin hier, um zuzuhören, zu verstehen und Ihnen zu helfen, in Ihrem eigenen Tempo zu wachsen.",
  hi: "नमस्ते, मैं Journey हूँ, The Art of Connect की AI साथी। मैं यहाँ सुनने, समझने और आपकी अपनी गति से आगे बढ़ने में मदद करने के लिए हूँ।",
  ja: "こんにちは、The Art of Connect の AI、Journey です。あなたのペースで、耳を傾け、理解し、成長をお手伝いします。",
  ko: "안녕하세요, 저는 The Art of Connect의 AI, Journey입니다. 당신의 속도에 맞춰 귀 기울이고, 이해하고, 성장을 도울게요.",
};
