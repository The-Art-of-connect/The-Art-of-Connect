/**
 * Customize Your Journey: how Journey sounds, looks and converses for each paid member.
 *
 * Uses OpenAI's own voices exclusively. Each voice is described only by how it presents
 * (masculine or feminine), the language it was made for and its regional speaking style, as
 * OpenAI documents it. Voices never represent a race, ethnicity or real person, and nothing
 * here links an avatar to a voice, accent or language: every choice is the member's own.
 * Perceived age and personality are shaped through speaking instructions, never by changing
 * who Journey is: the founder's philosophy, knowledge, accountability, emotional awareness and
 * safety standards always apply, in every language.
 */

export type Presentation = "feminine" | "masculine";

export type JourneyVoice = {
  id: string; name: string; presentation: Presentation; character: string;
  /** Language the voice was designed for (OpenAI's own description); every voice can still speak other languages. */
  language: string;
  /** Regional speaking style as OpenAI describes it (e.g. "British"); "Standard" for OpenAI's core voices. */
  region: string;
  /** Available only with GPT-Live models. */
  liveOnly?: boolean;
};

/** OpenAI's core voices: available with every voice model. */
const CORE: JourneyVoice[] = [
  { id: "marin", name: "Marin", presentation: "feminine", character: "Warm and natural", language: "en", region: "Standard" },
  { id: "coral", name: "Coral", presentation: "feminine", character: "Bright and friendly", language: "en", region: "Standard" },
  { id: "shimmer", name: "Shimmer", presentation: "feminine", character: "Soft and gentle", language: "en", region: "Standard" },
  { id: "sage", name: "Sage", presentation: "feminine", character: "Calm and grounded", language: "en", region: "Standard" },
  { id: "cedar", name: "Cedar", presentation: "masculine", character: "Warm and steady", language: "en", region: "Standard" },
  { id: "ash", name: "Ash", presentation: "masculine", character: "Clear and confident", language: "en", region: "Standard" },
  { id: "echo", name: "Echo", presentation: "masculine", character: "Resonant and calm", language: "en", region: "Standard" },
  { id: "verse", name: "Verse", presentation: "masculine", character: "Expressive and engaging", language: "en", region: "Standard" },
  { id: "ballad", name: "Ballad", presentation: "masculine", character: "Gentle and melodic", language: "en", region: "Standard" },
];

/** GPT-Live's additional voices, exactly as OpenAI documents them (language, regional influence, presentation). */
const LIVE: [string, string, string, string, Presentation][] = [
  ["pearl", "Pearl", "en", "Australian", "feminine"], ["quartz", "Quartz", "en", "Australian", "feminine"], ["ripple", "Ripple", "en", "Australian", "masculine"],
  ["halo", "Halo", "en", "British", "feminine"], ["vesper", "Vesper", "en", "British", "masculine"],
  ["willow", "Willow", "en", "Irish", "feminine"], ["stone", "Stone", "en", "Irish", "masculine"],
  ["gleam", "Gleam", "en", "North American", "feminine"], ["meridian", "Meridian", "en", "North American", "masculine"],
  ["delta", "Delta", "en", "Southern U.S.", "feminine"], ["cinder", "Cinder", "en", "Southern U.S.", "masculine"],
  ["beacon", "Beacon", "en", "Filipino", "masculine"],
  ["bossa", "Bossa", "pt", "Brazilian", "feminine"], ["tempo", "Tempo", "pt", "Brazilian", "masculine"],
  ["calandria", "Calandria", "es", "Argentine", "feminine"], ["compas", "Compás", "es", "Argentine", "masculine"], ["hornero", "Hornero", "es", "Argentine", "masculine"],
  ["luciernaga", "Luciérnaga", "es", "Mexican", "feminine"], ["destello", "Destello", "es", "Mexican", "masculine"],
  ["nuri", "Nuri", "de", "Standard", "feminine"], ["juni", "Juni", "de", "Standard", "feminine"], ["flitz", "Flitz", "de", "Standard", "masculine"],
  ["brise", "Brise", "fr", "Standard", "feminine"], ["sillage", "Sillage", "fr", "Standard", "masculine"],
  ["nira", "Nira", "hi", "Standard", "feminine"],
  ["harema", "Harema", "ja", "Standard", "feminine"], ["shida", "Shida", "ja", "Standard", "masculine"],
  ["noeul", "Noeul", "ko", "Standard", "feminine"],
];

export const JOURNEY_VOICES: JourneyVoice[] = [
  ...CORE,
  ...LIVE.map(([id, name, language, region, presentation]) => ({ id, name, presentation, language, region, character: "Natural", liveOnly: true })),
];
/** Kept for existing callers: the core voices available with every model. */
export const OPENAI_VOICES = CORE;
export const voiceById = (id: string | null | undefined) => JOURNEY_VOICES.find((v) => v.id === id) ?? null;
export const voicesFor = (opts: { live: boolean; presentation?: Presentation; language?: string }) =>
  JOURNEY_VOICES.filter((v) => (opts.live || !v.liveOnly) && (!opts.presentation || v.presentation === opts.presentation) && (!opts.language || v.language === opts.language));

export const AGES = [
  { id: "21-29", label: "21–29", style: "the lively, contemporary speaking manner of an adult in their twenties" },
  { id: "30-39", label: "30–39", style: "the confident, grounded speaking manner of an adult in their thirties" },
  { id: "40-49", label: "40–49", style: "the assured, experienced speaking manner of an adult in their forties" },
  { id: "50-59", label: "50–59", style: "the seasoned, unhurried speaking manner of an adult in their fifties" },
  { id: "60+", label: "60+", style: "the wise, gentle speaking manner of an adult in their sixties or beyond" },
  { id: "none", label: "No preference", style: "" },
];

/** Languages Journey converses in. "auto" follows whatever language the member uses. */
export const LANGUAGES = [
  { id: "auto", label: "Automatic (match my language)", name: "" },
  { id: "en", label: "English", name: "English" }, { id: "es", label: "Español", name: "Spanish" }, { id: "fr", label: "Français", name: "French" },
  { id: "pt", label: "Português", name: "Portuguese" }, { id: "de", label: "Deutsch", name: "German" }, { id: "it", label: "Italiano", name: "Italian" },
  { id: "zh", label: "中文 (普通话)", name: "Mandarin Chinese" }, { id: "ja", label: "日本語", name: "Japanese" }, { id: "ko", label: "한국어", name: "Korean" },
  { id: "ar", label: "العربية", name: "Arabic" }, { id: "hi", label: "हिन्दी", name: "Hindi" }, { id: "tl", label: "Filipino", name: "Filipino (Tagalog)" },
  { id: "vi", label: "Tiếng Việt", name: "Vietnamese" }, { id: "ru", label: "Русский", name: "Russian" }, { id: "nl", label: "Nederlands", name: "Dutch" },
  { id: "pl", label: "Polski", name: "Polish" }, { id: "tr", label: "Türkçe", name: "Turkish" },
];
export const languageName = (id: string) => LANGUAGES.find((l) => l.id === id)?.name ?? "";

/** Kept for stored preferences; the accent now comes from the chosen voice's own regional style. */
export const ACCENTS = [{ id: "none", label: "No preference" }];

export const PERSONALITIES = [
  { id: "warm", label: "Warm & encouraging", style: "Be especially warm and encouraging, celebrating effort and progress." },
  { id: "direct", label: "Direct & accountability-focused", style: "Be clear and direct, gently but honestly naming patterns and inviting accountability." },
  { id: "calm", label: "Calm & reflective", style: "Be calm and unhurried, leaving room for reflection and silence." },
  { id: "energetic", label: "Energetic & motivational", style: "Be upbeat and motivating, helping the member build momentum." },
  { id: "professional", label: "Professional & strategic", style: "Be polished and strategic, organizing ideas into clear next steps." },
  { id: "balanced", label: "Balanced & adaptive", style: "Adapt your tone to what the member needs in each moment." },
];

export const PACES = [
  { id: "slower", label: "Slower", speed: 0.9, style: "Speak at a slower, unhurried pace with natural pauses." },
  { id: "natural", label: "Natural", speed: 1, style: "" },
  { id: "brisker", label: "A little brisker", speed: 1.1, style: "Speak at a slightly brisker pace while staying easy to follow." },
];

/**
 * Journey's appearance: signature orbs, or fictional portraits from founder-approved artwork.
 * Portraits are fictional and never represent a real person; labels are neutral by design.
 * `age` is the portrait's apparent age range only, so members can filter by it.
 */
export type AvatarAge = "20s" | "30s" | "40s" | "50s+";
export type Avatar = { id: string; label: string; from?: string; to?: string; image?: string; age?: AvatarAge; presentation?: Presentation };
const LETTERS = "abcdefghijklmnopqrstuvwxyz";
/** portrait-a … portrait-z, then portrait-za, portrait-zb … (ids the database accepts: letters and hyphens). */
const portraitId = (i: number) => `portrait-${i < 26 ? LETTERS[i] : `z${LETTERS[i - 26]}`}`;
const PORTRAIT_AGE: AvatarAge[] = ["40s", "50s+", "30s", "40s", "50s+", "50s+", "30s", "30s", "40s", "50s+", "40s", "30s", "40s", "50s+", "30s", ...Array<AvatarAge>(14).fill("20s")];
const PORTRAIT_PRESENTATION: Presentation[] = ["feminine", "masculine", "masculine", "feminine", "masculine", "feminine", "feminine", "masculine", "feminine", "masculine", "feminine", "feminine", "masculine", "feminine", "masculine",
  "feminine", "masculine", "feminine", "masculine", "feminine", "masculine", "feminine", "feminine", "masculine", "feminine", "masculine", "feminine", "masculine", "feminine"];
export const AVATAR_AGES: { id: AvatarAge; label: string }[] = [{ id: "20s", label: "20s" }, { id: "30s", label: "30s" }, { id: "40s", label: "40s" }, { id: "50s+", label: "50s and beyond" }];
export const AVATARS: Avatar[] = [
  { id: "champagne", label: "Champagne orb", from: "#f3dfb6", to: "#b08a4e" },
  { id: "rose", label: "Rose orb", from: "#f0c9cf", to: "#7a2e3e" },
  { id: "midnight", label: "Midnight orb", from: "#c9b8a0", to: "#2b1d16" },
  ...Array.from({ length: PORTRAIT_AGE.length }, (_, i) => ({ id: portraitId(i), label: `Journey portrait ${i + 1}`, image: `/images/avatars/portrait-${i + 1}.webp`, age: PORTRAIT_AGE[i], presentation: PORTRAIT_PRESENTATION[i] })),
];
export const avatarById = (id: string | null | undefined) => AVATARS.find((a) => a.id === id) ?? AVATARS[0];

export type JourneyPrefs = {
  presentation: Presentation; voice: string; age: string; language: string; accent: string;
  personality: string; pace: string; avatar: string; save_transcripts?: boolean;
};
export const DEFAULT_PREFS: JourneyPrefs = { presentation: "feminine", voice: "marin", age: "none", language: "auto", accent: "none", personality: "balanced", pace: "natural", avatar: "champagne" };

const pick = <T extends { id: string }>(list: T[], id: unknown, fallback: string) => (list.find((x) => x.id === id) ?? list.find((x) => x.id === fallback)!).id;

/** Validates member input; anything unknown falls back to a safe default. The voice must match the presentation. */
export function cleanPrefs(raw: Partial<Record<keyof JourneyPrefs, unknown>>): JourneyPrefs {
  const presentation = (["feminine", "masculine"] as const).find((p) => p === raw.presentation) ?? DEFAULT_PREFS.presentation;
  const voices = JOURNEY_VOICES.filter((v) => v.presentation === presentation);
  const voice = voices.find((v) => v.id === raw.voice)?.id ?? voices[0].id;
  return {
    presentation, voice,
    age: pick(AGES, raw.age, "none"), language: pick(LANGUAGES, raw.language, "auto"), accent: "none",
    personality: pick(PERSONALITIES, raw.personality, "balanced"), pace: pick(PACES, raw.pace, "natural"), avatar: pick(AVATARS, raw.avatar, "champagne"),
  };
}

/** Style instructions only: they shape tone and language, never Journey's philosophy, knowledge or safety. */
export function styleInstructions(p: JourneyPrefs, spoken: boolean) {
  const lang = languageName(p.language);
  const lines = [
    "# The member's personal style preferences",
    "These preferences change only your tone, language and delivery. Your founder-approved philosophy, knowledge, accountability, emotional awareness and safety standards stay exactly the same in every language.",
    PERSONALITIES.find((x) => x.id === p.personality)?.style ?? "",
    "# Language",
    lang
      ? `The member prefers ${lang}. Converse in ${lang} by default. If they speak or write in another language, or ask to switch, follow them naturally into that language.`
      : "Reply in the language the member uses. If they switch languages or ask you to, follow them naturally.",
    "In every language, teach the same lessons with the same care: questions, guided answers, analyses, affirmations and manifestations are written natively in that language, not translated word for word, with culturally respectful examples. Never assume a person's culture, ethnicity or beliefs from their language.",
  ];
  if (spoken) {
    const age = AGES.find((a) => a.id === p.age)?.style;
    if (age) lines.push(`Speak with ${age}. Never state or imply a specific age.`);
    const pace = PACES.find((x) => x.id === p.pace)?.style;
    if (pace) lines.push(pace);
    lines.push("Use your natural voice and its own regional speaking style; never exaggerate or imitate an accent.");
    lines.push("Never claim to be a person or to belong to any racial, ethnic or demographic group. You are Journey, an AI with an AI-generated voice.");
  }
  return lines.filter(Boolean).join("\n");
}

export const paceSpeed = (pace: string) => PACES.find((x) => x.id === pace)?.speed ?? 1;
