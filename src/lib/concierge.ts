/**
 * Journey's concierge routing (founder directive 35 §2): a member describes what they want in everyday language and is guided
 * straight to the right place. Matching is done here, privately and for free; paid members can continue the conversation with
 * Journey. Members never need to know which technology performs a service.
 */
export type Access = "member" | "paid" | "executive";
export type Destination = { id: string; label: string; line: string; href: string; access: Access; words: string[] };

export const DESTINATIONS: Destination[] = [
  { id: "research", label: "Ask Journey to research something", line: "Opportunities, organizations, requirements and sources", href: "/app/connect360/intelligence", access: "executive", words: ["research", "find out", "look up", "investigate", "information about", "learn about", "opportunit", "casting", "audition", "board seat", "acquire", "franchise"] },
  { id: "idea", label: "Develop my business idea", line: "A clear, professional proposal", href: "/app/connect360/proposals", access: "executive", words: ["business idea", "proposal", "pitch", "plan for my business", "present my", "partnership idea"] },
  { id: "funding", label: "Help me find funding", line: "Assess, plan and prepare for financing", href: "/app/connect360/funding", access: "executive", words: ["funding", "loan", "financ", "capital", "money for my business", "lender", "sba", "grant"] },
  { id: "collaborate", label: "Find business collaborators", line: "Members who welcome collaboration", href: "/app/connect360/collaborate", access: "executive", words: ["collaborat", "business partner", "partner with", "joint venture", "co-founder", "work with someone"] },
  { id: "rooms", label: "Work on a project with others", line: "Private Business Deal Rooms with your advisers", href: "/app/connect360/rooms", access: "executive", words: ["deal room", "project with", "attorney", "accountant", "adviser", "advisor", "documents", "due diligence"] },
  { id: "start", label: "Start a business", line: "Every state and D.C., step by step", href: "/app/launch", access: "member", words: ["start a business", "form an llc", "llc", "incorporat", "nonprofit", "ein", "register my business", "business license", "s corp"] },
  { id: "resume", label: "Prepare my résumé", line: "Build, upload or polish it", href: "/app/career", access: "member", words: ["resume", "résumé", "cv", "cover letter", "job", "career", "interview", "apply for"] },
  { id: "grow", label: "Help me grow", line: "Daily practices and lessons", href: "/app/sanctuary", access: "member", words: ["grow", "self", "confidence", "mindset", "affirmation", "journal", "manifest", "purpose", "emotional intelligence", "boundaries", "self-love", "better person"] },
  { id: "conversation", label: "Join today's conversation", line: "The Becoming Circle", href: "/app/circle", access: "member", words: ["talk to people", "discussion", "conversation", "circle", "community", "meet people online"] },
  { id: "love", label: "Find meaningful connections", line: "Singles and couples", href: "/app/relationships", access: "paid", words: ["date", "dating", "relationship", "partner", "love", "romance", "single", "marriage", "couple", "match"] },
  { id: "people", label: "Find my people", line: "Friendships, circles and experiences", href: "/app/connect", access: "paid", words: ["friends", "friendship", "people like me", "social", "events", "meet new", "travel"] },
  { id: "business", label: "Grow my business network", line: "The Professional Society", href: "/app/business", access: "paid", words: ["network", "business owners", "mentor", "professional", "business community", "webinar"] },
  { id: "wellness", label: "Find support for how I'm feeling", line: "Counseling & Wellness Center", href: "/app/wellness", access: "member", words: ["stress", "anxious", "anxiety", "sad", "depressed", "therapy", "counsel", "overwhelmed", "grief", "lonely", "mental health"] },
  { id: "safety", label: "Get help or report a concern", line: "Safety and support", href: "/app/safety", access: "member", words: ["unsafe", "report", "harass", "scam", "block someone", "help me", "problem", "support"] },
  { id: "compare", label: "Which membership is right for me?", line: "Compare plans: what you have, what each adds and the price difference", href: "/app/membership#compare", access: "member", words: ["which membership", "right membership", "best membership", "compare", "which plan", "best plan", "recommend a plan", "what is included", "whats included", "worth it", "best value", "should i upgrade"] },
  { id: "membership", label: "My membership", line: "Plan, billing and benefits", href: "/app/membership", access: "member", words: ["membership", "upgrade", "billing", "cancel", "payment", "subscription", "trial", "price"] },
  { id: "world", label: "My World", line: "Everything that's yours, in one place", href: "/app/world", access: "member", words: ["my saved", "saved", "my projects", "my documents", "my connections", "my progress", "settings", "my account"] },
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/** Best destinations for what the member wrote (most relevant first), with whether their membership includes each. */
export function route(text: string, level: "free" | "one" | "complete" | "executive" | "elite", limit = 3) {
  const q = ` ${norm(text)} `;
  if (q.trim().length < 2) return [];
  const rank = { free: 0, one: 1, complete: 2, executive: 3, elite: 4 }[level];
  const need = { member: 0, paid: 1, executive: 3 } as const;
  return DESTINATIONS
    .map((d) => ({ d, score: d.words.reduce((n, w) => n + (q.includes(norm(w)) ? (w.includes(" ") ? 3 : 2) : 0), 0) + (q.includes(norm(d.label)) ? 4 : 0) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ d }) => ({ ...d, included: rank >= need[d.access] }));
}
