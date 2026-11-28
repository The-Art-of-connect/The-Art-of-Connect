/** In Love (founder directive 38): shared labels and original daily content. Pure. */
export const INTENTS: Record<string, string> = {
  long_term: "A long-term relationship", marriage: "Marriage", companionship: "Companionship", exploring: "Getting to know someone",
};
export const MOODS: Record<string, string> = {
  connected: "Connected", grateful: "Grateful", calm: "Calm", hopeful: "Hopeful", tender: "Tender", stretched: "Stretched thin", distant: "A little distant",
};

/** Today's Connection: one gentle question for both partners, the same for both on the same day. */
export const DAILY_QUESTIONS = [
  { q: "When do you feel most appreciated by your partner?", hint: "Take a moment to listen to each other's perspective." },
  { q: "What is one small thing your partner did recently that meant a lot to you?", hint: "Say it out loud. Small things carry weight." },
  { q: "What would make this week feel lighter for you?", hint: "Listen for one thing you can do, not everything." },
  { q: "Which memory of us still makes you smile?", hint: "Tell the story together, each from your own side." },
  { q: "How do you most like to be comforted when you're stressed?", hint: "There is no wrong answer, only useful ones." },
  { q: "What is one dream you'd like us to work toward this year?", hint: "Dream first. Plan later." },
  { q: "When did you last feel truly heard by me?", hint: "Notice what made that moment work." },
] as const;
export const questionFor = (d: Date = new Date()) => DAILY_QUESTIONS[Math.floor(d.getTime() / 86_400_000) % DAILY_QUESTIONS.length];

export const SINGLES_TABS = [
  { href: "/app/relationships", label: "Discover" },
  { href: "/app/relationships/connections", label: "Connections" },
  { href: "/app/connect/messages", label: "Messages" },
  { href: "/app/relationships/profile", label: "Preferences" },
] as const;
export const COUPLES_TABS = [
  { href: "/app/relationships", label: "Our Relationship" },
  { href: "/app/relationships/checkin", label: "Check-in" },
  { href: "/app/relationships/calendar", label: "Our Calendar" },
] as const;
