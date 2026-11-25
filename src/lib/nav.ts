/**
 * The site's navigation: six primary categories with dropdowns.
 * Every link points to an existing page — reorganizing never duplicates pages.
 * `access`: "public" (anyone), "member" (signed in), "paid" (Journey — uses credits).
 */
export type NavAccess = "public" | "member" | "paid";
export type NavLink = { href: string; label: string; note?: string; access?: NavAccess };
export type NavGroup = { key: string; label: string; href: string; intro: string; links: NavLink[] };

export const NAV: NavGroup[] = [
  {
    key: "home", label: "Home", href: "/", intro: "Welcome to The Art of Connect.",
    links: [
      { href: "/", label: "Welcome" },
      { href: "/membership", label: "Memberships", note: "One account, every experience" },
      { href: "/app", label: "My dashboard", access: "member" },
    ],
  },
  {
    key: "self", label: "The Art of Self", href: "/app/know-yourself", intro: "Before you connect with the world, connect with yourself.",
    links: [
      { href: "/app/know-yourself", label: "The Art of Knowing Yourself", note: "Who Am I? — identity & self-love", access: "member" },
      { href: "/app/know-yourself/identity-self-love", label: "Identity & Self-Love", note: "Six lessons · founding curriculum", access: "member" },
      { href: "/emotional-intelligence", label: "Emotional Intelligence" },
      { href: "/app/know-yourself/emotional-intelligence/lessons", label: "Emotional Intelligence lessons", note: "Six lessons · founding curriculum", access: "member" },
      { href: "/app/know-yourself/love-languages", label: "The Five Love Languages", access: "member" },
      { href: "/emotional-intelligence/self-awareness", label: "Levels of Consciousness", note: "Within Self-Awareness" },
      { href: "/app/know-yourself/boundaries", label: "Boundaries & Self-Worth", access: "member" },
      { href: "/app/know-yourself/who-am-i/what-my-life-represents", label: "Purpose & Personal Alignment", access: "member" },
      { href: "/app/journey/check-ins", label: "Manifestation & Intentional Living", note: "Daily manifestations & reflections", access: "member" },
      { href: "/app/know-yourself/learn", label: "Lessons", access: "member" },
      { href: "/life", label: "The Art of Becoming", note: "In Life" },
    ],
  },
  {
    key: "relationships", label: "Relationships", href: "/love", intro: "Intentional connection for singles and couples.",
    links: [
      { href: "/love", label: "The Personal Society", note: "In Love" },
      { href: "/app/relationships", label: "Singles & couples home", access: "member" },
      { href: "/app/relationships/onboarding", label: "My Personal Society journey", access: "member" },
      { href: "/app/readiness", label: "Relationship readiness", access: "member" },
      { href: "/app/relationships/love-languages", label: "Love languages together", access: "member" },
      { href: "/app/relationships/calendar", label: "Couples calendar", access: "member" },
      { href: "/app/relationships/exclusive", label: "The Exclusive Connection", access: "member" },
    ],
  },
  {
    key: "professional", label: "Professional", href: "/business", intro: "The Professional Society — In Business.",
    links: [
      { href: "/business", label: "The Professional Society" },
      { href: "/business/explore", label: "Explore before you join" },
      { href: "/webinars", label: "The Knowledge Exchange", note: "Live business webinars" },
      { href: "/app/business", label: "My business dashboard", access: "member" },
      { href: "/app/business/board", label: "Business Connection Board", access: "member" },
      { href: "/app/business/inbox", label: "Private business inbox", access: "member" },
    ],
  },
  {
    key: "journey", label: "Journey", href: "/app/journey", intro: "Your personal AI companion — a paid membership benefit.",
    links: [
      { href: "/app/journey", label: "Talk with Journey", access: "paid" },
      { href: "/app/journey/voice", label: "Journey Live", note: "Voice conversations", access: "paid" },
      { href: "/app/journey/daily", label: "My Daily Journey", access: "member" },
      { href: "/app/journey/library", label: "The Journey Library", access: "member" },
      { href: "/app/journey/sessions", label: "Private Sessions", access: "paid" },
      { href: "/app/journey/memory", label: "What Journey remembers", access: "member" },
    ],
  },
  {
    key: "counseling", label: "Counseling", href: "/app/counseling", intro: "Personal growth and professional support.",
    links: [
      { href: "/app/counseling", label: "Counseling & growth home", access: "member" },
      { href: "/app/counseling/professionals", label: "Therapy & Counseling Center", note: "Opening after legal approval", access: "member" },
      { href: "/app/counseling/journal", label: "My private journal", access: "member" },
      { href: "/professionals", label: "For professionals", note: "Counselors, coaches & mentors" },
      { href: "/professionals/apply", label: "Apply as a professional" },
    ],
  },
];

/** The signed-in member's profile menu: account, membership, credits and preferences. */
export const PROFILE_LINKS: NavLink[] = [
  { href: "/app", label: "My dashboard" },
  { href: "/app/know-yourself/emotional-intelligence", label: "My personal profile" },
  { href: "/app/membership", label: "Membership & billing" },
  { href: "/app/journey/plus", label: "Journey credits" },
  { href: "/app/journey/check-ins", label: "Notifications & check-ins" },
  { href: "/app/verify", label: "Identity verification" },
  { href: "/app/safety", label: "Privacy & safety" },
  { href: "/legal", label: "Legal & policies" },
];

/** Bottom navigation inside the signed-in member experience (phones). */
export const MEMBER_TABS = [
  { href: "/app", label: "Home", icon: "home", match: ["/app"] },
  { href: "/app/know-yourself", label: "Self", icon: "self", match: ["/app/know-yourself", "/emotional-intelligence"] },
  { href: "/app/relationships", label: "Connect", icon: "connect", match: ["/app/relationships", "/app/readiness", "/app/business"] },
  { href: "/app/journey", label: "Journey", icon: "journey", match: ["/app/journey"] },
  { href: "#profile", label: "Profile", icon: "profile", match: ["/app/membership", "/app/safety", "/app/verify"] },
] as const;

/** Legacy export kept for any remaining consumers. */
export const SITE_NAV = NAV.filter((g) => g.key !== "home").map((g) => ({ href: g.href, label: g.label, sub: g.intro }));
