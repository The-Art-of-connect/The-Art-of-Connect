/**
 * Customize Your Journey: how Journey sounds, looks and converses for each paid member.
 *
 * Uses OpenAI's own voices exclusively. Voices are grouped by how they are commonly
 * perceived (masculine, feminine, neutral); they never represent a race, ethnicity or
 * real person. Perceived age, accent and personality are shaped through speaking
 * instructions, never by changing who Journey is: the founder's philosophy,
 * knowledge, accountability, emotional awareness and safety standards always apply.
 */

export type Presentation = "feminine" | "masculine" | "neutral";

export const OPENAI_VOICES: { id: string; name: string; presentation: Presentation; character: string }[] = [
  { id: "marin", name: "Marin", presentation: "feminine", character: "Warm and natural" },
  { id: "coral", name: "Coral", presentation: "feminine", character: "Bright and friendly" },
  { id: "shimmer", name: "Shimmer", presentation: "feminine", character: "Soft and gentle" },
  { id: "sage", name: "Sage", presentation: "feminine", character: "Calm and grounded" },
  { id: "cedar", name: "Cedar", presentation: "masculine", character: "Warm and steady" },
  { id: "ash", name: "Ash", presentation: "masculine", character: "Clear and confident" },
  { id: "echo", name: "Echo", presentation: "masculine", character: "Resonant and calm" },
  { id: "verse", name: "Verse", presentation: "masculine", character: "Expressive and engaging" },
  { id: "ballad", name: "Ballad", presentation: "masculine", character: "Gentle and melodic" },
  { id: "alloy", name: "Alloy", presentation: "neutral", character: "Balanced and clear" },
];
export const voiceById = (id: string | null | undefined) => OPENAI_VOICES.find((v) => v.id === id) ?? null;

export const AGES = [
  { id: "21-29", label: "21–29", style: "the lively, contemporary speaking manner of an adult in their twenties" },
  { id: "30-39", label: "30–39", style: "the confident, grounded speaking manner of an adult in their thirties" },
  { id: "40-49", label: "40–49", style: "the assured, experienced speaking manner of an adult in their forties" },
  { id: "50-59", label: "50–59", style: "the seasoned, unhurried speaking manner of an adult in their fifties" },
  { id: "60+", label: "60+", style: "the wise, gentle speaking manner of an adult in their sixties or beyond" },
  { id: "none", label: "No preference", style: "" },
];

export const LANGUAGES = [
  { id: "en", label: "English" }, { id: "es", label: "Español" }, { id: "fr", label: "Français" }, { id: "pt", label: "Português" },
  { id: "de", label: "Deutsch" }, { id: "it", label: "Italiano" }, { id: "zh", label: "中文" }, { id: "ja", label: "日本語" },
  { id: "ko", label: "한국어" }, { id: "hi", label: "हिन्दी" }, { id: "ar", label: "العربية" },
];
const LANGUAGE_NAMES: Record<string, string> = { en: "English", es: "Spanish", fr: "French", pt: "Portuguese", de: "German", it: "Italian", zh: "Mandarin Chinese", ja: "Japanese", ko: "Korean", hi: "Hindi", ar: "Arabic" };

/** Regional English accents (regions, never ethnic groups). */
export const ACCENTS = [
  { id: "none", label: "No preference" }, { id: "american", label: "American" }, { id: "southern-us", label: "Southern U.S." },
  { id: "british", label: "British" }, { id: "irish", label: "Irish" }, { id: "scottish", label: "Scottish" },
  { id: "australian", label: "Australian" }, { id: "canadian", label: "Canadian" },
];

export const PERSONALITIES = [
  { id: "warm", label: "Warm & encouraging", style: "Be especially warm and encouraging, celebrating effort and progress." },
  { id: "direct", label: "Direct & accountability-focused", style: "Be clear and direct, gently but honestly naming patterns and inviting accountability." },
  { id: "calm", label: "Calm & reflective", style: "Be calm and unhurried, leaving room for reflection and silence." },
  { id: "energetic", label: "Energetic & motivational", style: "Be upbeat and motivating, helping the member build momentum." },
  { id: "professional", label: "Professional & strategic", style: "Be polished and strategic, organizing ideas into clear next steps." },
  { id: "balanced", label: "Balanced & adaptive", style: "Adapt your tone to what the member needs in each moment." },
];

export const PACES = [
  { id: "slower", label: "Slower", speed: 0.9 },
  { id: "natural", label: "Natural", speed: 1 },
  { id: "brisker", label: "A little brisker", speed: 1.1 },
];

/**
 * Journey's appearance: signature orbs, or fictional portraits from founder-approved artwork.
 * Portraits are fictional and never represent a real person; labels are neutral by design.
 */
export type Avatar = { id: string; label: string; from?: string; to?: string; image?: string };
const LETTERS = "abcdefghijklmno";
export const AVATARS: Avatar[] = [
  { id: "champagne", label: "Champagne orb", from: "#f3dfb6", to: "#b08a4e" },
  { id: "rose", label: "Rose orb", from: "#f0c9cf", to: "#7a2e3e" },
  { id: "midnight", label: "Midnight orb", from: "#c9b8a0", to: "#2b1d16" },
  ...Array.from({ length: 15 }, (_, i) => ({ id: `portrait-${LETTERS[i]}`, label: `Journey portrait ${i + 1}`, image: `/images/avatars/portrait-${i + 1}.webp` })),
];
export const avatarById = (id: string | null | undefined) => AVATARS.find((a) => a.id === id) ?? AVATARS[0];

export type JourneyPrefs = {
  presentation: Presentation; voice: string; age: string; language: string; accent: string;
  personality: string; pace: string; avatar: string; save_transcripts?: boolean;
};
export const DEFAULT_PREFS: JourneyPrefs = { presentation: "feminine", voice: "marin", age: "none", language: "en", accent: "none", personality: "balanced", pace: "natural", avatar: "champagne" };

const pick = <T extends { id: string }>(list: T[], id: unknown, fallback: string) => (list.find((x) => x.id === id) ?? list.find((x) => x.id === fallback)!).id;

/** Validates member input; anything unknown falls back to a safe default. The voice must match the presentation. */
export function cleanPrefs(raw: Partial<Record<keyof JourneyPrefs, unknown>>): JourneyPrefs {
  const presentation = (["feminine", "masculine", "neutral"] as const).find((p) => p === raw.presentation) ?? DEFAULT_PREFS.presentation;
  const voices = OPENAI_VOICES.filter((v) => v.presentation === presentation);
  const voice = voices.find((v) => v.id === raw.voice)?.id ?? voices[0].id;
  return {
    presentation, voice,
    age: pick(AGES, raw.age, "none"), language: pick(LANGUAGES, raw.language, "en"), accent: pick(ACCENTS, raw.accent, "none"),
    personality: pick(PERSONALITIES, raw.personality, "balanced"), pace: pick(PACES, raw.pace, "natural"), avatar: pick(AVATARS, raw.avatar, "champagne"),
  };
}

/** Style instructions only: they shape tone, never Journey's philosophy, knowledge or safety. */
export function styleInstructions(p: JourneyPrefs, spoken: boolean) {
  const lines = [
    "# The member's personal style preferences",
    "These preferences change only your tone and delivery. Your founder-approved philosophy, knowledge, accountability, emotional awareness and safety standards stay exactly the same.",
    PERSONALITIES.find((x) => x.id === p.personality)?.style ?? "",
    p.language !== "en" ? `Converse in ${LANGUAGE_NAMES[p.language]} unless the member writes or speaks in another language.` : "",
  ];
  if (spoken) {
    const age = AGES.find((a) => a.id === p.age)?.style;
    if (age) lines.push(`Speak with ${age}. Never state or imply a specific age.`);
    const accent = ACCENTS.find((a) => a.id === p.accent);
    if (accent && accent.id !== "none" && p.language === "en") lines.push(`Speak English with a natural, respectful ${accent.label} accent. Never exaggerate or caricature it.`);
    lines.push("Never claim to be a person or to belong to any racial, ethnic or demographic group. You are Journey, an AI with an AI-generated voice.");
  }
  return lines.filter(Boolean).join("\n");
}

export const paceSpeed = (pace: string) => PACES.find((x) => x.id === pace)?.speed ?? 1;
