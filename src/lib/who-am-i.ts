/**
 * The Art of Knowing Yourself — "Who Am I?" progressive discovery program.
 * Approved static educational content written by The Art of Connect: no AI
 * processing. One shared, private profile across Business, Life, Singles and
 * Couples — each question is asked once and never repeated elsewhere.
 * Reflection only: never a diagnosis and never a measure of relationship suitability.
 */

export const BRAND_MESSAGE = "Before you connect with the world, connect with yourself.";

export const PILLARS = [
  { key: "know", title: "Know Yourself", line: "Who are you beyond your titles, responsibilities and relationships?" },
  { key: "understand", title: "Understand Yourself", line: "Recognize your values, beliefs, emotions and behavioral patterns." },
  { key: "honor", title: "Honor Yourself", line: "Understand your boundaries, standards and non-negotiables." },
  { key: "educate", title: "Educate Yourself", line: "Gain knowledge that empowers you to make intentional decisions." },
  { key: "grow", title: "Grow Yourself", line: "Develop the confidence and independence to create a fulfilling life." },
  { key: "connect", title: "Connect With Intention", line: "Welcome people and opportunities that align with who you are." },
] as const;
export type PillarKey = (typeof PILLARS)[number]["key"];

export type Question = { key: string; prompt: string; hint?: string; type?: "text" | "values"; options?: string[]; max?: number };
export type DiscoveryModule = { slug: string; title: string; pillar: PillarKey; image: string; minutes: number; intro: string; questions: Question[] };

export const VALUES = [
  "Honesty", "Family", "Faith", "Freedom", "Growth", "Security", "Adventure", "Loyalty", "Kindness", "Achievement",
  "Peace", "Creativity", "Health", "Respect", "Independence", "Community", "Wisdom", "Generosity", "Excellence", "Joy",
  "Justice", "Legacy", "Balance", "Humor",
];

export const MODULES: DiscoveryModule[] = [
  {
    slug: "beyond-my-titles", title: "Beyond my titles", pillar: "know", image: "/images/library/life/journaling.webp", minutes: 5,
    intro: "Before you were an employee, an owner, a partner or a parent, you were you. Let’s meet that person again.",
    questions: [
      { key: "beyond_titles", prompt: "If you couldn’t mention your job, relationship status or family role, how would you describe yourself?" },
      { key: "true_self", prompt: "When do you feel most like yourself?", hint: "A place, an activity, the people you’re with." },
      { key: "others_see", prompt: "What do the people who know you best appreciate about you?" },
    ],
  },
  {
    slug: "values-and-beliefs", title: "My values & beliefs", pillar: "understand", image: "/images/library/life/garden-walk.webp", minutes: 6,
    intro: "Your values are your compass. When your choices match them, you feel at peace — even when life is hard.",
    questions: [
      { key: "core_values", prompt: "Choose up to five values that matter most to you.", type: "values", options: VALUES, max: 5 },
      { key: "values_in_action", prompt: "Where in your life do you live these values well — and where would you like to live them more fully?" },
      { key: "beliefs", prompt: "What beliefs guide the way you treat people and make decisions?" },
    ],
  },
  {
    slug: "emotional-needs", title: "My emotional needs", pillar: "understand", image: "/images/library/life/meditation.webp", minutes: 5,
    intro: "Knowing what you need emotionally helps you ask for it clearly — and recognize who can offer it.",
    questions: [
      { key: "feel_valued", prompt: "What helps you feel valued, safe and respected?" },
      { key: "under_stress", prompt: "When you’re stressed or hurt, what do you need most from yourself and from others?" },
      { key: "recharge", prompt: "What restores your energy?" },
    ],
  },
  {
    slug: "strengths-and-growth", title: "Strengths & growth", pillar: "know", image: "/images/library/business/executive-portrait.webp", minutes: 5,
    intro: "Honest self-awareness holds both: what you do beautifully, and where you’re still becoming.",
    questions: [
      { key: "strengths", prompt: "What are three strengths you bring to work, friendship and love?" },
      { key: "growth_areas", prompt: "Which one or two areas would you most like to grow in this year?" },
      { key: "proud_of", prompt: "What are you proud of overcoming?" },
    ],
  },
  {
    slug: "my-patterns", title: "My recurring patterns", pillar: "understand", image: "/images/library/life/moroccan-lounge.webp", minutes: 6,
    intro: "Patterns are not flaws — they’re information. Noticing them is the first step to choosing differently.",
    questions: [
      { key: "repeat_situations", prompt: "Are there situations you seem to find yourself in again and again?", hint: "At work, in friendships or in relationships." },
      { key: "conflict_style", prompt: "How do you usually respond to disagreement — and how would you like to respond?" },
      { key: "pattern_change", prompt: "Which one pattern would you like to change, and what would be different if you did?" },
    ],
  },
  {
    slug: "love-languages", title: "How I give and receive love", pillar: "understand", image: "/images/library/love/cooking-together.webp", minutes: 4,
    intro: "Discover how you most feel loved, how you naturally show love, and what helps you feel truly connected.",
    questions: [],
  },
  {
    slug: "boundaries", title: "Boundaries & non-negotiables", pillar: "honor", image: "/images/library/business/advisory-lounge.webp", minutes: 8,
    intro: "What you will do, what you won’t, and how to say it with respect — for yourself, at work, in life and in love.",
    questions: [],
  },
  {
    slug: "interests-and-aspirations", title: "Interests & aspirations", pillar: "grow", image: "/images/library/business/executive-coffee.webp", minutes: 5,
    intro: "Your individuality is worth protecting — in a career, a business and a partnership.",
    questions: [
      { key: "interests", prompt: "What interests, hobbies or passions are yours alone?" },
      { key: "aspirations", prompt: "What would you love to learn, create or experience in the next few years?" },
      { key: "independence", prompt: "How will you keep your own identity and interests while sharing your life or work with others?" },
    ],
  },
  {
    slug: "happiness-and-success", title: "Happiness & success", pillar: "grow", image: "/images/library/love/sunlit-anniversary.webp", minutes: 5,
    intro: "No one else can define a good life for you. Write your own definition.",
    questions: [
      { key: "happiness", prompt: "What does happiness look like on an ordinary day for you?" },
      { key: "success", prompt: "How do you define success — in your own words, not anyone else’s?" },
    ],
  },
  {
    slug: "what-my-life-represents", title: "What my life represents", pillar: "connect", image: "/images/library/love/sunset-wedding.webp", minutes: 5,
    intro: "Connection with intention starts with knowing what you want your life to stand for.",
    questions: [
      { key: "legacy", prompt: "What do you want your life to represent?" },
      { key: "intentional_connections", prompt: "What kind of people and opportunities do you want to welcome into your life?" },
      { key: "first_step", prompt: "What is one intentional step you will take this month?" },
    ],
  },
];

export const QUESTION_KEYS = MODULES.flatMap((m) => m.questions.map((q) => q.key));
export const moduleBySlug = (slug: string) => MODULES.find((m) => m.slug === slug);

/** Educational lessons — static, approved content, available without AI processing. */
export const LESSONS: { pillar: PillarKey; title: string; body: string[]; practice: string }[] = [
  { pillar: "know", title: "You are more than your roles", body: [
    "Titles describe what you do and who you are connected to. They can change — through a new job, a move, a loss or a new chapter. Your character, curiosity and care remain.",
    "Knowing yourself beyond your roles gives you steadiness when life changes, and helps others meet the real you.",
  ], practice: "Write three sentences about yourself that don’t mention your work, relationship status or family role." },
  { pillar: "understand", title: "Values: your quiet compass", body: [
    "Values are what you consider most important. When decisions honor them, you feel aligned; when they don’t, you often feel uneasy even if everything looks fine from the outside.",
    "In business, shared values make partnerships stronger. In love, they predict harmony more reliably than shared hobbies.",
  ], practice: "Choose your top five values, then notice one decision this week where they guided you." },
  { pillar: "understand", title: "Noticing your patterns", body: [
    "Most of us repeat familiar ways of responding — to conflict, to praise, to uncertainty. These patterns once made sense; some still serve us and some don’t.",
    "Awareness without judgment is the goal. You can’t change what you haven’t noticed.",
  ], practice: "Recall the last time you felt frustrated. What happened just before, and how did you respond?" },
  { pillar: "honor", title: "Boundaries are a kindness", body: [
    "A boundary is a clear statement of what you will and won’t do. It protects your energy and makes relationships more honest, not less loving.",
    "The most respectful boundaries are calm and brief, start with the value behind them, and offer what you can do.",
  ], practice: "Finish this sentence: “Because I value ___, I will ___, and I won’t ___.”" },
  { pillar: "educate", title: "Decide with knowledge, not pressure", body: [
    "Intentional decisions come from information and reflection — not urgency. Before a big yes, it helps to ask what you know, what you assume and what you still need to learn.",
    "Seeking qualified professional guidance is a sign of wisdom, especially for legal, financial, health or emotional decisions.",
  ], practice: "Pick a decision ahead of you. List what you know, what you’re assuming, and one question to research." },
  { pillar: "grow", title: "Confidence is built, not found", body: [
    "Confidence grows from keeping small promises to yourself. Each kept promise is evidence that you can trust yourself.",
    "Independence isn’t doing everything alone — it’s knowing you can stand on your own while choosing to share your life and work.",
  ], practice: "Make one small promise to yourself today and keep it." },
  { pillar: "connect", title: "Connecting with intention", body: [
    "When you know who you are, you can recognize who and what belongs in your life — in business, in friendship and in love.",
    "Intentional connection means choosing alignment over convenience and respect over approval.",
  ], practice: "Think of one relationship that brings out your best. What makes it work?" },
];

/** Areas Journey can help paid members explore more deeply (subject to membership and usage limits). */
export const JOURNEY_DEEPER = [
  "Daily manifestations and affirmations", "Emotional awareness", "Mindset development", "Personal accountability",
  "Identifying recurring patterns", "Understanding personal boundaries", "Confidence and independence", "Personal purpose",
  "Career and business development", "Relationship readiness", "Individuality within a partnership", "Knowing when professional support may help",
];
