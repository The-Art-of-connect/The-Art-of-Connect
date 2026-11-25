/**
 * Journey check-ins (Master Blueprint §10). Morning manifestations, evening
 * reflections and wellness check-ins come from this approved library (written
 * by The Art of Connect — no AI cost) and are personalized with the values the
 * member chose in “Who Am I?”. Personal check-ins come from what the member
 * asked Journey to remember.
 */
export const CHECKIN_KINDS: Record<string, { label: string; ask: string }> = {
  event: { label: "An important event", ask: "How did it go?" },
  interview: { label: "A job interview or opportunity", ask: "How did the conversation go — and how are you feeling about it?" },
  goal: { label: "A personal goal", ask: "How is this goal feeling for you today?" },
  milestone: { label: "A birthday, anniversary or milestone", ask: "Wishing you a meaningful day. How would you like to honor it?" },
  support: { label: "Something I’m going through", ask: "I’ve been thinking about you. How are you feeling about this now?" },
  relationship: { label: "A relationship or family situation", ask: "How are things feeling between you now?" },
  growth: { label: "A boundary or growth step", ask: "How has this step been going for you?" },
  transition: { label: "A life transition", ask: "Change can take time. How are you settling into this new chapter?" },
  wellness: { label: "A general check-in", ask: "How are you, truly?" },
};

const MORNING = [
  "Today I honor what matters most to me{value}.",
  "I am allowed to grow at my own pace, and today I take one intentional step{value}.",
  "I welcome connections that respect who I am becoming.",
  "My worth is not measured by anyone’s approval — including my own harshest thoughts.",
  "I meet today with curiosity rather than fear{value}.",
  "I can be kind to others and still keep my boundaries.",
  "I am open to good things, and I am prepared to receive them.",
  "I choose alignment over approval{value}.",
  "Loving myself is not selfish; it is how I show up well for the people I love.",
  "Whatever today brings, I will listen to myself with patience.",
  "I carry my values with me into every room{value}.",
  "I am becoming someone I am proud to know.",
];

const EVENING = [
  "What moment today felt most like you?",
  "Where did you honor a boundary today — even a small one?",
  "What are you grateful for tonight?",
  "What did today teach you about what you need?",
  "Was there a moment you wished you had responded differently? What would you choose next time?",
  "Who or what gave you energy today?",
  "What is one thing you can release before you rest tonight?",
  "How did you show yourself kindness today?",
];

const WELLNESS = [
  "It’s been a little while. How are you, truly — not the polite answer?",
  "Checking in with you. What’s been on your mind lately?",
  "How has your energy been this week? What would help you feel more like yourself?",
  "Is there anything you’ve been carrying that you’d like to talk through?",
];

const dayNumber = (d: Date) => Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86_400_000);
/** A stable daily pick, different for each member. */
function pick<T>(list: T[], userId: string, date: Date, salt = 0) {
  let h = salt;
  for (const ch of userId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[(dayNumber(date) + h) % list.length];
}

export function morningManifestation(userId: string, values: string[], date = new Date()) {
  const v = values.length ? values[dayNumber(date) % values.length].toLowerCase() : "";
  return pick(MORNING, userId, date).replace("{value}", v ? ` — especially ${v}` : "");
}
export const eveningReflection = (userId: string, date = new Date()) => pick(EVENING, userId, date, 7);
export const wellnessPrompt = (userId: string, date = new Date()) => pick(WELLNESS, userId, date, 13);

/** "HH:MM" in the member's time zone. */
export function localClock(timeZone: string, date = new Date()) {
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-GB", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  }
}

/** True when "now" falls inside the member's quiet hours (which may cross midnight). */
export function inQuietHours(now: string, start: string, end: string) {
  const n = now.slice(0, 5), s = start.slice(0, 5), e = end.slice(0, 5);
  return s <= e ? n >= s && n < e : n >= s || n < e;
}

export const TIME_ZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu",
  "America/Puerto_Rico", "America/Toronto", "Europe/London", "Europe/Paris", "Africa/Lagos", "Asia/Dubai", "Asia/Tokyo", "Australia/Sydney",
];

/** Whether today is this member's wellness check-in day (spread across the week so it never feels like a broadcast). */
export function wellnessDueToday(userId: string, frequency: string, date = new Date()) {
  let h = 0;
  for (const ch of userId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const day = dayNumber(date);
  if (frequency === "monthly") return date.getUTCDate() === (h % 28) + 1;
  const period = frequency === "biweekly" ? 14 : 7;
  return (day + h) % period === 0;
}
