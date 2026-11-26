/**
 * The Becoming Circle (founder directive 19) and The Art of Connect Safety Shield. Pure, testable logic.
 * The database enforces the personal-information rules too (shield_findings); this adds respectful-wording screening.
 */

export const CATEGORIES = [
  ["everyday-life", "Everyday life"], ["relationships-marriage", "Relationships & marriage"], ["friendships", "Friendships"],
  ["parenting", "Parenting & children"], ["family", "Family dynamics"], ["personal-development", "Personal development"],
  ["business", "Business & entrepreneurship"], ["career", "Career opportunities"], ["financial-mindset", "Financial mindset"],
  ["retirement", "Retirement"], ["travel-lifestyle", "Travel & lifestyle"], ["current-events", "Current events"],
  ["world-perspectives", "World perspectives"], ["culture-society", "Culture & society"], ["communication-ei", "Communication & emotional intelligence"],
  ["goals-ambitions", "Personal goals & future ambitions"],
] as const;
export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES);

export const SLOT_MS = 4 * 3600_000;
export const slotStart = (d = new Date()) => new Date(Math.floor(d.getTime() / SLOT_MS) * SLOT_MS);
export const nextSlot = (d = new Date()) => new Date(slotStart(d).getTime() + SLOT_MS);

export type Topic = { id: string; title: string; prompt: string; category: string; slot_start: string | null; open_hours: number; paused: boolean; closed_at: string | null; room: string; status: string };
/** Open for written participation: begun, within its open window, not paused or closed. */
export function topicOpen(t: Topic, now = new Date()) {
  if (t.status !== "scheduled" || !t.slot_start || t.closed_at || t.paused) return false;
  const s = Date.parse(t.slot_start);
  return s <= now.getTime() && now.getTime() < s + t.open_hours * 3600_000;
}

// ─── Safety Shield ──────────────────────────────────────────────────────────────────────────
const PERSONAL: [string, RegExp][] = [
  ["an email address", /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i],
  ["a phone number", /(\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/],
  ["a Social Security number", /\b\d{3}-\d{2}-\d{4}\b/],
  ["a card or account number", /\b(?:\d[ -]?){13,19}\b/],
  ["bank details", /(routing|account|acct)\s*(number|no\.?|#)?\s*[:#]?\s*\d{6,}/i],
  ["login details", /\b(password|passcode|pin|login)\s*(is|:|=)\s*\S+/i],
  ["a street address", /\b\d{1,6}\s+[a-z0-9.' ]{2,40}\s(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|way|place|pl|terrace|circle)\b\.?/i],
];
// Serious: never published, recorded for moderators.
const THREATS = [
  /\b(i('| a)?m|i will|i'll|gonna|going to)\s+(kill|hurt|beat|shoot|stab|find)\s+(you|u|him|her|them)\b/i,
  /\byou('| a)?re\s+(dead|going to pay|gonna pay)\b/i, /\bwatch your back\b/i, /\bi know where you live\b/i,
  /\b(kill|hurt)\s+yourself\b/i,
];
const FRAUD = [
  /\b(send|wire|cash ?app|zelle|venmo|western union|gift cards?)\b.{0,40}\b(money|me|\$\d+|payment)\b/i,
  /\bguaranteed\s+(returns?|profits?|income)\b/i, /\b(double|triple)\s+your\s+money\b/i, /\b(crypto|bitcoin)\b.{0,40}\b(invest|opportunity|returns?)\b/i,
];
// Disrespect: the member is asked to revise before it can be posted.
const DISRESPECT = [
  /\byou('| a)?re\s+(so\s+)?(stupid|an idiot|dumb|worthless|pathetic|ignorant|a loser|clueless)\b/i,
  /\b(shut up|nobody cares|who asked you|get lost)\b/i, /\bobviously you (don'?t|do not) (understand|get it)\b/i,
  /\b(idiot|moron|loser|stupid)\b/i, /\byou people\b/i,
];

export type Screening = { ok: true } | { ok: false; kind: "personal" | "threat" | "fraud" | "disrespect"; message: string };

/**
 * Screens a written contribution. Personal information is refused (the database refuses it too); threats and fraudulent
 * solicitations are blocked and recorded; disrespectful wording asks the member to revise. Website addresses are allowed.
 */
export function screen(text: string, opts: { confirmedRespectful?: boolean } = {}): Screening {
  for (const [what, re] of PERSONAL) if (re.test(text)) {
    return { ok: false, kind: "personal", message: `For your privacy, please remove ${what} before posting. Share contact details only through approved, private channels. Public business websites are welcome.` };
  }
  if (THREATS.some((r) => r.test(text))) return { ok: false, kind: "threat", message: "This can't be posted. Threats are never permitted, and this has been shared with our moderators." };
  if (FRAUD.some((r) => r.test(text))) return { ok: false, kind: "fraud", message: "Requests for money and investment promotions aren't permitted in discussions." };
  if (!opts.confirmedRespectful && DISRESPECT.some((r) => r.test(text))) {
    return { ok: false, kind: "disrespect", message: "Some of this wording may come across as disrespectful. Would you like to revise it? Every member deserves respect, even in disagreement." };
  }
  return { ok: true };
}

/** Database Safety Shield codes (SAFETY_SHIELD:phone,email) → a respectful message. */
export function shieldMessage(err: string | undefined) {
  const m = /SAFETY_SHIELD:([a-z,]+)/.exec(err ?? "");
  if (!m) return null;
  return "For your privacy, personal contact details, account numbers and login information can't be shared here. Please remove them and try again.";
}
