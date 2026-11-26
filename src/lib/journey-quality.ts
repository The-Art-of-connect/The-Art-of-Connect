/**
 * Realistic multi-turn conversations used to check Journey's quality before the owner approves her for members.
 * Fictional people only. Each later message depends on Journey having listened to the earlier ones.
 */
export type QualityScenario = { key: string; title: string; mode: "life" | "love" | "business"; turns: string[] };

export const QUALITY_SCENARIOS: QualityScenario[] = [
  { key: "identity", title: "Identity & self-love", mode: "life", turns: [
    "Honestly, I don't really know who I am anymore outside of being a mom.",
    "I used to paint. I loved it. I stopped when my first was born and never went back.",
    "I think I feel guilty doing anything just for me.",
  ] },
  { key: "divorce", title: "Divorce & rediscovering yourself", mode: "life", turns: [
    "My divorce was finalized last month, after fourteen years.",
    "Most days I'm okay, but evenings are hard. The house is so quiet.",
    "I don't even know what I like to do on a Friday night anymore.",
  ] },
  { key: "love-languages", title: "Love languages", mode: "love", turns: [
    "My husband keeps buying me gifts, but what I really want is time with him.",
    "When I tell him, he gets defensive and says I'm never satisfied.",
    "How do I bring it up without it turning into a fight?",
  ] },
  { key: "emotional-intelligence", title: "Emotional intelligence", mode: "life", turns: [
    "I snapped at my team in a meeting today and I feel awful.",
    "I'd been up since four and the project is behind. That's not an excuse, I know.",
    "What should I say to them tomorrow?",
  ] },
  { key: "childhood", title: "Childhood experiences", mode: "life", turns: [
    "My dad was never really around when I was growing up, and I think it still affects me.",
    "I always assume people are going to leave eventually.",
    "Is it actually possible to change that?",
  ] },
  { key: "boundaries", title: "Boundaries", mode: "life", turns: [
    "My sister calls me every single day to vent, and I'm exhausted.",
    "If I don't answer, she says I don't care about her.",
    "Can you help me figure out what to say to her?",
  ] },
  { key: "marriage", title: "Marriage & communication", mode: "love", turns: [
    "My wife and I keep having the same argument about money.",
    "She wants to save everything and I like to enjoy life a little.",
    "We both end up frustrated and just stop talking for a day.",
  ] },
  { key: "manifestation", title: "Manifestations", mode: "life", turns: [
    "I want to start manifesting a better career, but it feels a little silly.",
    "Someday I'd love to lead my own team.",
    "Could you help me write an affirmation I'd actually believe?",
  ] },
  { key: "business", title: "Business development", mode: "business", turns: [
    "I'm launching a small bakery business and I feel overwhelmed.",
    "I have loyal customers from the farmers market, but no storefront yet.",
    "What should I focus on first?",
  ] },
];

/** What the owner looks for in every conversation (shown beside each transcript). */
export const QUALITY_CRITERIA = [
  "Responds to what was actually said, using the person's details",
  "Builds each question on the previous answer; never repeats a question",
  "Introduces herself at most once; never asks \"what can I help with\" again",
  "Teaches something meaningful, not only questions",
  "Warm, honest and accountable; no assumptions, labels or diagnosis",
  "Sounds like Journey and The Art of Connect, not a generic assistant",
];
