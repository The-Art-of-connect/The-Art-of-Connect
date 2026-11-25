/**
 * Adaptive Discovery Sessions (paid Journey). Journey generates each question
 * from the member's previous answers; members may skip, change topic, pause or
 * end at any time. Every Journey reply counts toward the member's allowance, so
 * Journey is told never to ask questions merely to extend the conversation.
 */
import type { JourneyMode } from "@/lib/journey";

export const DISCOVERY_CATEGORIES: { key: string; title: string; intro: string; resources: { label: string; href: string }[] }[] = [
  { key: "love-languages", title: "The Five Love Languages", intro: "How you give, receive and experience love.", resources: [{ label: "Five Love Languages", href: "/app/know-yourself/love-languages" }] },
  { key: "childhood", title: "Childhood & Family Dynamics", intro: "How your upbringing and family shaped who you are today.", resources: [{ label: "Who Am I?", href: "/app/know-yourself" }] },
  { key: "emotional-intelligence", title: "Emotional Intelligence", intro: "Your emotions, triggers, empathy and responses.", resources: [{ label: "Emotional Intelligence lessons", href: "/app/know-yourself/emotional-intelligence/lessons" }] },
  { key: "dating", title: "Dating & Compatibility", intro: "What you seek, what you offer and what truly aligns.", resources: [{ label: "Relationship readiness", href: "/app/readiness" }] },
  { key: "marriage", title: "Marriage & Commitment", intro: "Partnership, reciprocity and growing together.", resources: [{ label: "Love languages together", href: "/app/relationships/love-languages" }] },
  { key: "communication", title: "Communication", intro: "How you express yourself, listen and respond.", resources: [{ label: "Identity & Self-Love: Effective Communication", href: "/app/know-yourself/identity-self-love#effective-communication" }] },
  { key: "conflict-resolution", title: "Conflict Resolution", intro: "Disagreements, repair and finding a way forward.", resources: [{ label: "Accountability Starts Within", href: "/app/know-yourself/emotional-intelligence/lessons#accountability-starts-within" }] },
  { key: "boundaries", title: "Boundaries & Independence", intro: "What you will and will not accept, and how you say it.", resources: [{ label: "Boundaries & Self-Worth", href: "/app/know-yourself/boundaries" }] },
  { key: "divorce", title: "Divorce & Starting Over", intro: "Endings, healing, co-parenting and new beginnings.", resources: [{ label: "Counseling & growth", href: "/app/counseling" }] },
  { key: "consciousness", title: "Consciousness & Awareness", intro: "How your beliefs and choices shape your experiences.", resources: [{ label: "Self-Awareness", href: "/emotional-intelligence/self-awareness" }] },
  { key: "manifestations", title: "Manifestations & Affirmations", intro: "Intentions, gratitude and aligned action.", resources: [{ label: "Daily manifestations", href: "/app/journey/check-ins" }] },
  { key: "financial-mindset", title: "Financial Mindset", intro: "Your beliefs about money, independence and shared responsibility.", resources: [{ label: "Identity & Self-Love", href: "/app/know-yourself/identity-self-love" }] },
  { key: "business-leadership", title: "Business & Leadership", intro: "How you lead, build and grow with integrity.", resources: [{ label: "The Professional Society", href: "/app/business" }] },
  { key: "personal-development", title: "Personal Development", intro: "Identity, self-love, purpose and growth.", resources: [{ label: "Identity & Self-Love", href: "/app/know-yourself/identity-self-love" }, { label: "Purpose & Personal Alignment", href: "/app/know-yourself/who-am-i/what-my-life-represents" }] },
];
export const discoveryCategory = (key: string) => DISCOVERY_CATEGORIES.find((c) => c.key === key) ?? null;

export const CATEGORY_ANALYSIS_HEADINGS = [
  "Summary of Your Responses", "Your Preferences & Values", "Your Strengths", "Recurring Themes", "Educational Insights",
  "Opportunities for Growth", "Practical Recommendations", "Recommended Resources", "Optional Next Steps",
];

export const discoveryMode = (key: string): JourneyMode =>
  ["love-languages", "dating", "marriage", "divorce"].includes(key) ? "love" : key === "business-leadership" ? "business" : "life";

export const SKIP_MESSAGE = "I'd prefer to skip that question.";
export const SUMMARY_MESSAGE = "I'm ready for my personal summary of this discovery session.";
export const OPENING = (title: string) => `Welcome to your ${title} discovery. There are no right or wrong answers, and you can skip any question, change topics or pause whenever you like. To begin, what drew you to explore this today?`;

/** Journey's instructions for a discovery session. */
export function discoveryInstructions(c: { title: string; resources: { label: string; href: string }[] }, objectives: string[], principles: string[], summarize: boolean) {
  const base = [
    `# Adaptive Discovery Session: ${c.title}`,
    "You are guiding a private, paid discovery session. The member's earlier answers are in this conversation: build on them.",
    "Ask ONE meaningful, personalized question at a time, generated from what the member has already shared, their goals and the principles below. Explore the reasons behind preferences and behaviors with curiosity.",
    "Never repeat a question that has already been answered. Never ask unnecessary questions to extend the conversation: each reply uses the member's allowance.",
    "Explain relevant educational concepts briefly and naturally when they help. Adjust depth to the member's openness.",
    "If the member skips a question, accept it warmly, without pressure or follow-up on that topic, and move to a different area. If they change topic, follow them.",
    "When you have gathered enough to offer meaningful insight (often after 6 to 10 exchanges), say so and offer the personal summary instead of asking more.",
    "Never assume childhood trauma, diagnose psychological conditions or treat personal preferences as evidence of a disorder. Recognize when qualified human support may be appropriate and say so gently.",
    "Personal answers are confidential: never suggest sharing them with matches, partners or providers.",
    objectives.length ? `Learning objectives:\n${objectives.map((o) => `- ${o}`).join("\n")}` : "",
    principles.length ? `Founder principles:\n${principles.map((p) => `- ${p}`).join("\n")}` : "",
  ];
  if (summarize) {
    base.push(
      `The member has asked for their personal summary. Write it now, using exactly these headings in order: ${CATEGORY_ANALYSIS_HEADINGS.join("; ")}.`,
      "Distinguish clearly between what the member shared (begin those sentences with \"You shared\") and your own educational reflections. Include recurring themes only where the member's answers support them. Never invent information or present causal conclusions as fact.",
      `Under Recommended Resources, choose from: ${c.resources.map((r) => r.label).join("; ")}; and The Personal Discovery Portfolio.`,
      "Close warmly. This is educational and reflective, not a clinical assessment.",
    );
  }
  return base.filter(Boolean).join("\n");
}
