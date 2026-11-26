/**
 * Voice models the owner can compare in the Voice Studio, with OpenAI's published prices (pricing page, checked 2026-11-26).
 * GPT-Live bills per second of session time; Realtime models bill audio and text tokens.
 * `budgetCentsPerMinute` is what Journey reserves against budgets before a call; the actual expense is
 * recorded afterwards from the usage OpenAI reports.
 */
export type TokenPrices = { audioIn: number; audioOut: number; textIn: number; textOut: number; cachedAudio: number; cachedText: number }; // $ per 1M tokens
export type VoiceModel = {
  id: string; label: string; family: "live" | "realtime"; budgetCentsPerMinute: number;
  note: string; liveCentsPerMinute?: number; prices?: TokenPrices; deprecated?: boolean;
};

export const VOICE_MODELS: VoiceModel[] = [
  { id: "gpt-live-1.1", label: "GPT-Live 1.1", family: "live", budgetCentsPerMinute: 5, liveCentsPerMinute: 5,
    note: "OpenAI's premier natural, expressive voice model. Listens while speaking; smooth interruptions. $0.05 per active minute." },
  { id: "gpt-live-1", label: "GPT-Live 1", family: "live", budgetCentsPerMinute: 5, liveCentsPerMinute: 5,
    note: "The first GPT-Live release. $0.05 per active minute." },
  { id: "gpt-realtime-2.1-mini", label: "GPT-Realtime 2.1 mini", family: "realtime", budgetCentsPerMinute: 10,
    prices: { audioIn: 10, audioOut: 20, textIn: 0.6, textOut: 2.4, cachedAudio: 0.3, cachedText: 0.06 },
    note: "Current low-cost Realtime model, billed by tokens." },
  { id: "gpt-realtime-2.1", label: "GPT-Realtime 2.1", family: "realtime", budgetCentsPerMinute: 30,
    prices: { audioIn: 32, audioOut: 64, textIn: 4, textOut: 24, cachedAudio: 0.4, cachedText: 0.4 },
    note: "Current full Realtime model, billed by tokens." },
  { id: "gpt-realtime-mini", label: "GPT-Realtime mini (current setup)", family: "realtime", budgetCentsPerMinute: 10, deprecated: true,
    note: "What Journey used first. OpenAI marks it deprecated; its price is no longer listed." },
];
export const voiceModelById = (id: string | null | undefined) => VOICE_MODELS.find((m) => m.id === id) ?? null;
export const isLiveModel = (id: string | null | undefined) => voiceModelById(id)?.family === "live" || /^gpt-live-/.test(id ?? "");

export type RealtimeUsage = { audioIn: number; audioOut: number; textIn: number; textOut: number; cachedAudio: number; cachedText: number };

/** Actual expense in cents from the usage OpenAI reported, or null when the model's price isn't published. */
export function providerCostCents(modelId: string, usage: { seconds?: number } & Partial<RealtimeUsage>): number | null {
  const m = voiceModelById(modelId);
  if (!m) return null;
  if (m.family === "live") return m.liveCentsPerMinute != null && usage.seconds != null ? round((m.liveCentsPerMinute * Math.max(0, usage.seconds)) / 60) : null;
  if (!m.prices) return null;
  const n = (k: keyof RealtimeUsage) => Math.max(0, Number(usage[k] ?? 0));
  const p = m.prices;
  // Cached tokens are part of the input totals; bill them at the cached rate instead.
  const dollars = ((n("audioIn") - n("cachedAudio")) * p.audioIn + n("cachedAudio") * p.cachedAudio
    + (n("textIn") - n("cachedText")) * p.textIn + n("cachedText") * p.cachedText
    + n("audioOut") * p.audioOut + n("textOut") * p.textOut) / 1_000_000;
  return round(Math.max(0, dollars) * 100);
}
const round = (c: number) => Math.round(c * 10_000) / 10_000;

/** Adds one Realtime `response.done` usage object to running totals. */
export function addRealtimeUsage(total: RealtimeUsage, u: unknown): RealtimeUsage {
  const x = (u ?? {}) as { input_token_details?: { text_tokens?: number; audio_tokens?: number; cached_tokens_details?: { text_tokens?: number; audio_tokens?: number } }; output_token_details?: { text_tokens?: number; audio_tokens?: number } };
  const i = x.input_token_details ?? {}, o = x.output_token_details ?? {}, c = i.cached_tokens_details ?? {};
  return {
    audioIn: total.audioIn + (i.audio_tokens ?? 0), textIn: total.textIn + (i.text_tokens ?? 0),
    cachedAudio: total.cachedAudio + (c.audio_tokens ?? 0), cachedText: total.cachedText + (c.text_tokens ?? 0),
    audioOut: total.audioOut + (o.audio_tokens ?? 0), textOut: total.textOut + (o.text_tokens ?? 0),
  };
}
export const EMPTY_USAGE: RealtimeUsage = { audioIn: 0, audioOut: 0, textIn: 0, textOut: 0, cachedAudio: 0, cachedText: 0 };
