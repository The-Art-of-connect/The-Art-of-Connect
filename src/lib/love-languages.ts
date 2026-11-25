/**
 * The five love languages — Physical Touch, Words of Affirmation, Quality Time,
 * Acts of Service and Receiving Gifts — as preferences, never fixed types and
 * never the sole measure of compatibility. Wording is The Art of Connect's own.
 */
export type LoveLanguage = "touch" | "words" | "time" | "service" | "gifts";

export const LOVE_LANGUAGES: Record<LoveLanguage, { name: string; essence: string; feelsLike: string; showIt: string[]; mayHurt: string }> = {
  touch: {
    name: "Physical Touch", essence: "Closeness you can feel.",
    feelsLike: "A hand held, an embrace, sitting close, a reassuring touch on the shoulder.",
    showIt: ["Reach for their hand without a reason", "Greet and part with a real embrace", "Sit close on the couch rather than across the room"],
    mayHurt: "Distance, or affection that only appears when something is wanted.",
  },
  words: {
    name: "Words of Affirmation", essence: "Love you can hear.",
    feelsLike: "Sincere appreciation, encouragement and the words “I’m proud of you.”",
    showIt: ["Name one specific thing you admire about them today", "Leave a note or send a message for no reason", "Say thank you for the small things, out loud"],
    mayHurt: "Harsh criticism, silence after effort, or praise that only comes in public.",
  },
  time: {
    name: "Quality Time", essence: "Attention that is fully present.",
    feelsLike: "Undivided attention, unhurried conversation and time that is truly shared.",
    showIt: ["Put the phone away and give them your full attention", "Protect a standing time that belongs to the two of you", "Ask a question and truly listen to the answer"],
    mayHurt: "Distraction, frequently cancelled plans, or being together without really being present.",
  },
  service: {
    name: "Acts of Service", essence: "Care you can see.",
    feelsLike: "Someone lightening your load, anticipating a need or following through.",
    showIt: ["Take one task off their plate without being asked", "Follow through on what you said you would do", "Ask, “What would make today easier for you?”"],
    mayHurt: "Broken promises, or being left to carry everything alone.",
  },
  gifts: {
    name: "Receiving Gifts", essence: "Thoughtfulness you can hold.",
    feelsLike: "A meaningful token that says “I was thinking of you” — the thought matters more than the price.",
    showIt: ["Bring back something small that reminded you of them", "Remember the details they mention and surprise them later", "Mark meaningful days with something personal"],
    mayHurt: "Forgotten occasions, or a gift that shows no thought behind it.",
  },
};
export const LANGUAGE_KEYS = Object.keys(LOVE_LANGUAGES) as LoveLanguage[];
export const isLanguage = (v: unknown): v is LoveLanguage => typeof v === "string" && v in LOVE_LANGUAGES;

/** Ten gentle either/or moments (each language appears four times, paired once with every other). */
export const DISCOVERY_PAIRS: { a: { lang: LoveLanguage; text: string }; b: { lang: LoveLanguage; text: string } }[] = [
  { a: { lang: "words", text: "Hearing “I appreciate everything you do.”" }, b: { lang: "touch", text: "A long, unhurried embrace." } },
  { a: { lang: "time", text: "An evening together with no phones." }, b: { lang: "gifts", text: "A small surprise that shows they were thinking of me." } },
  { a: { lang: "service", text: "Coming home to find a task already handled." }, b: { lang: "words", text: "A heartfelt note telling me what I mean to them." } },
  { a: { lang: "touch", text: "Holding hands on a walk." }, b: { lang: "time", text: "A long conversation where I feel completely heard." } },
  { a: { lang: "gifts", text: "A keepsake from a meaningful day." }, b: { lang: "service", text: "Help with something stressful without having to ask." } },
  { a: { lang: "words", text: "Encouragement before something important." }, b: { lang: "time", text: "Them making real time for me in a busy week." } },
  { a: { lang: "touch", text: "A reassuring touch when I’m stressed." }, b: { lang: "gifts", text: "My favorite treat, brought home for no reason." } },
  { a: { lang: "service", text: "Them following through on every promise." }, b: { lang: "time", text: "A weekend planned just for the two of us." } },
  { a: { lang: "gifts", text: "A thoughtful present on an ordinary day." }, b: { lang: "words", text: "Being praised for who I am, not just what I do." } },
  { a: { lang: "touch", text: "Sitting close while we relax." }, b: { lang: "service", text: "Breakfast made for me on a busy morning." } },
];

/** Ranks languages from discovery choices (ties keep the canonical order). */
export function rankFromChoices(choices: LoveLanguage[]): LoveLanguage[] {
  const score = Object.fromEntries(LANGUAGE_KEYS.map((k) => [k, 0])) as Record<LoveLanguage, number>;
  for (const c of choices) if (isLanguage(c)) score[c]++;
  return [...LANGUAGE_KEYS].sort((x, y) => score[y] - score[x] || LANGUAGE_KEYS.indexOf(x) - LANGUAGE_KEYS.indexOf(y));
}

/** A complete ordering from a member's (possibly partial) ranking. */
export const completeRank = (rank: string[]): LoveLanguage[] => {
  const seen = [...new Set(rank.filter(isLanguage))];
  return [...seen, ...LANGUAGE_KEYS.filter((k) => !seen.includes(k))];
};

/** Gentle, non-judgmental insights for two people — never a compatibility score. */
export function pairInsights(me: { receive: string[]; express: string[] }, them: { receive: string[]; express: string[] }) {
  const out: string[] = [];
  const myTop = me.receive[0], theirTop = them.receive[0], myGive = me.express[0], theirGive = them.express[0];
  if (isLanguage(myTop) && isLanguage(theirTop) && myTop === theirTop) out.push(`You both feel most loved through ${LOVE_LANGUAGES[myTop].name.toLowerCase()} — a beautiful place to meet each other.`);
  if (isLanguage(theirTop) && isLanguage(myGive) && myGive !== theirTop) out.push(`You naturally show love through ${LOVE_LANGUAGES[myGive].name.toLowerCase()}, while they most often feel it through ${LOVE_LANGUAGES[theirTop].name.toLowerCase()}. Your love may be arriving in a different language than they listen for.`);
  if (isLanguage(myTop) && isLanguage(theirGive) && theirGive !== myTop) out.push(`They tend to express love through ${LOVE_LANGUAGES[theirGive].name.toLowerCase()}. When you notice it, that may be their way of saying “I care” — even if you most need ${LOVE_LANGUAGES[myTop].name.toLowerCase()}.`);
  if (!out.length) out.push("Your preferences complement each other in their own way. Keep asking each other what feels like love today — it can change with the seasons of life.");
  return out;
}

/** Guidance appended to Journey's instructions in Life and Love conversations. */
export const JOURNEY_LOVE_LANGUAGE_GUIDANCE = `# Love languages (Physical Touch, Words of Affirmation, Quality Time, Acts of Service, Receiving Gifts)
- Help members discover how they prefer to RECEIVE love and how they naturally EXPRESS it — these often differ — gently, through conversation rather than tests. Notice what they describe when they felt most loved, most connected or most unappreciated, and reflect it back as a question rather than announcing a "type".
- Help partners see that different needs are not a lack of love: someone may be loving in their own language while their partner listens for another.
- Treat love languages as preferences that can change with seasons of life — never as fixed personality types, and never as the sole measure of compatibility. Values, communication, respect, life goals and how two people repair after conflict matter at least as much.
- When something new emerges, you may invite the member to update their optional Love Language Profile. Never use love languages to excuse disrespect, control or harm.`;
