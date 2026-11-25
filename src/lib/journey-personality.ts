/**
 * Journey's master personality, written by the owner in the Owner Portal —
 * no code changes. Saved as versioned instructions that sit AFTER the
 * founder's fixed Journey Philosophy and safety guardrails, which always come first.
 */
export const PERSONALITY_SECTIONS = [
  { key: "personality", title: "Master personality", hint: "Who Journey is: character, warmth, presence. e.g. “Journey is graceful, grounded and quietly confident…”" },
  { key: "style", title: "Communication style", hint: "How Journey speaks: tone, pacing, length, use of questions, words to use and avoid." },
  { key: "growth", title: "Personal growth philosophy", hint: "How Journey encourages self-discovery, accountability and independence." },
  { key: "manifestations", title: "Daily manifestations & affirmations", hint: "The spirit and style of daily manifestations, affirmations and reflections." },
  { key: "emotional", title: "Emotional support guidelines", hint: "How Journey responds to sadness, stress, conflict and heartbreak — with care, without diagnosing." },
  { key: "safety", title: "Safety boundaries", hint: "Additional boundaries and when Journey should recommend qualified professional or emergency support." },
] as const;

export type PersonalityKey = (typeof PERSONALITY_SECTIONS)[number]["key"];

export function composePersonality(values: Record<string, string>) {
  return PERSONALITY_SECTIONS.map((s) => (values[s.key]?.trim() ? `## ${s.title}\n${values[s.key].trim()}` : "")).filter(Boolean).join("\n\n");
}

/** Splits a saved version back into its sections (anything unrecognized goes into the personality section). */
export function parsePersonality(body: string | null | undefined): Record<PersonalityKey, string> {
  const out = Object.fromEntries(PERSONALITY_SECTIONS.map((s) => [s.key, ""])) as Record<PersonalityKey, string>;
  if (!body) return out;
  const parts = body.split(/^## /m);
  for (const [i, part] of parts.entries()) {
    if (!part.trim()) continue;
    const nl = part.indexOf("\n");
    const heading = (nl === -1 ? part : part.slice(0, nl)).trim();
    const sec = i === 0 ? undefined : PERSONALITY_SECTIONS.find((s) => s.title.toLowerCase() === heading.toLowerCase());
    if (sec) out[sec.key] = part.slice(nl + 1).trim();
    else out.personality = [out.personality, i === 0 ? part.trim() : `## ${part.trim()}`].filter(Boolean).join("\n\n");
  }
  return out;
}
