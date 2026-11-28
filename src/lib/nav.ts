/**
 * The site's navigation: six primary categories with dropdowns.
 * Every link points to an existing page — reorganizing never duplicates pages.
 * `access` (membership access v2): "public" (anyone), "member" (any free account: The Art of Becoming, including The Art of
 * Self, safety and counseling access), "paid" (a paid membership or active 15-day trial: social, societies, Journey).
 */
export type NavAccess = "public" | "member" | "paid";
export type NavLink = { href: string; label: string; note?: string; access?: NavAccess };
export type NavGroup = { key: string; label: string; href: string; intro: string; links: NavLink[] };

export const NAV: NavGroup[] = [
  {
    key: "home", label: "Home", href: "/", intro: "Welcome to The Art of Connect.",
    links: [
      { href: "/", label: "Welcome" },
      { href: "/membership", label: "Memberships", note: "Free account · 15-day trial · memberships" },
      { href: "/what-we-offer", label: "What does this website offer?", note: "Every feature, explained" },
      { href: "/elite", label: "Elite Concierge", note: "Apply · qualification required" },
      { href: "/app", label: "My dashboard", access: "member" },
    ],
  },
  {
    key: "self", label: "The Art of Knowing Yourself", href: "/app/know-yourself", intro: "Before you connect with the world, connect with yourself.",
    links: [
      { href: "/app/circle", label: "The Becoming Circle", note: "A new open discussion every four hours", access: "member" },
      { href: "/app/sanctuary", label: "My Daily Sanctuary", note: "Daily practices, lessons & reflections", access: "member" },
      { href: "/app/sanctuary/becoming", label: "Who Am I Becoming?", note: "My Future Self · 1, 5 and 10-year goals", access: "member" },
      { href: "/app/sanctuary/vision", label: "My Vision Board", access: "member" },
      { href: "/app/discover", label: "Discover What’s Possible", note: "What could you meet, learn and share?", access: "member" },
      { href: "/app/career", label: "My Professional Readiness", note: "Résumé Builder · upload, build or approve", access: "member" },
      { href: "/app/launch", label: "Business Launch Center", note: "Start a business in any state", access: "member" },
      { href: "/app/know-yourself", label: "The Art of Knowing Yourself", note: "Who Am I? — identity & self-love", access: "member" },
      { href: "/app/know-yourself/portfolio", label: "My Personal Discovery Portfolio", note: "Everything you've discovered, together", access: "member" },
      { href: "/app/know-yourself/identity-self-love", label: "Identity & Self-Love", note: "Six lessons · founding curriculum", access: "member" },
      { href: "/emotional-intelligence", label: "Emotional Intelligence" },
      { href: "/app/know-yourself/emotional-intelligence/lessons", label: "Emotional Intelligence lessons", note: "Six lessons · founding curriculum", access: "member" },
      { href: "/app/know-yourself/love-languages", label: "The Five Love Languages", access: "member" },
      { href: "/emotional-intelligence/self-awareness", label: "Levels of Consciousness", note: "Within Self-Awareness" },
      { href: "/app/know-yourself/boundaries", label: "Boundaries & Self-Worth", access: "member" },
      { href: "/app/know-yourself/who-am-i/what-my-life-represents", label: "Purpose & Personal Alignment", access: "member" },
      { href: "/app/journey/check-ins", label: "Manifestation & Intentional Living", note: "Daily manifestations & reflections", access: "member" },
      { href: "/app/know-yourself/learn", label: "Lessons", access: "member" },
      { href: "/life", label: "The Art of Becoming", note: "In Life · free with every account" },
    ],
  },
  {
    key: "relationships", label: "Relationships", href: "/love", intro: "Intentional connection for singles and couples.",
    links: [
      { href: "/love", label: "The Personal Society", note: "In Love" },
      { href: "/app/relationships", label: "Singles & couples home", access: "paid" },
      { href: "/app/relationships/onboarding", label: "My Personal Society journey", access: "paid" },
      { href: "/app/readiness", label: "Relationship readiness", access: "paid" },
      { href: "/app/relationships/love-languages", label: "Love languages together", access: "paid" },
      { href: "/app/relationships/calendar", label: "Our Calendar", access: "paid" },
      { href: "/app/relationships/exclusive", label: "The Exclusive Connection", access: "paid" },
    ],
  },
  {
    key: "connect", label: "Connect", href: "/app/connect", intro: "Your world. Your connections. Find your people and experience life together.",
    links: [
      { href: "/app/connect", label: "The Connection Feed", note: "Your world. Your connections.", access: "paid" },
      { href: "/app/connect/circles", label: "Find Your Circle", note: "Open, lifestyle and Elite circles", access: "paid" },
      { href: "/app/connect/events", label: "The Connect Calendar", note: "Events members share", access: "paid" },
      { href: "/app/connect/people", label: "Find People Like Me", note: "Friends, peers, mentors, travel companions", access: "paid" },
      { href: "/app/connect/messages", label: "Messages", access: "paid" },
      { href: "/app/connect/profile", label: "My profile & photographs", access: "paid" },
      { href: "/app/connect/preferences", label: "My connection preferences", access: "paid" },
    ],
  },
  {
    key: "professional", label: "Professional", href: "/business", intro: "The Professional Society — In Business.",
    links: [
      { href: "/business", label: "The Professional Society" },
      { href: "/business/explore", label: "Explore before you join" },
      { href: "/webinars", label: "The Knowledge Exchange", note: "Live business webinars" },
      { href: "/app/business", label: "My business dashboard", access: "paid" },
      { href: "/app/business/board", label: "Business Connection Board", access: "paid" },
      { href: "/app/business/inbox", label: "Private business inbox", access: "paid" },
      { href: "/app/connect360", label: "CONNECT 360", note: "Executive & Elite · Business Deal Rooms and collaboration", access: "paid" },
      { href: "/app/connect360/rooms", label: "Business Deal Rooms", note: "Executive & Elite", access: "paid" },
      { href: "/app/connect360/proposals", label: "Strategic Proposal Builder", note: "Executive & Elite", access: "paid" },
      { href: "/app/connect360/funding", label: "Capital & Funding Intelligence Center", note: "Executive & Elite", access: "paid" },
      { href: "/app/connect360/intelligence", label: "My Intelligence Office", note: "Executive & Elite · research with Journey", access: "paid" },
      { href: "/app/career", label: "My Professional Readiness", note: "Résumé Builder", access: "member" },
      { href: "/app/launch", label: "Business Launch Center", note: "All 50 states and D.C.", access: "member" },
      { href: "/app/launch/orders", label: "My formation requests", note: "Business Launch Center · reviewed before anything is filed", access: "member" },
    ],
  },
  {
    key: "journey", label: "Journey", href: "/app/journey", intro: "Your personal AI companion: part of every paid membership and trial.",
    links: [
      { href: "/app/journey", label: "Talk with Journey", access: "paid" },
      { href: "/app/journey/voice", label: "Journey Live", note: "Voice conversations", access: "paid" },
      { href: "/app/journey/customize", label: "Customize Your Journey", note: "Voice, language and style", access: "paid" },
      { href: "/app/journey/discover", label: "Discovery Sessions", note: "Adaptive questions, just for you", access: "paid" },
      { href: "/app/journey/daily", label: "My Daily Journey", access: "member" },
      { href: "/app/journey/library", label: "The Journey Library", access: "member" },
      { href: "/app/journey/sessions", label: "Private Sessions", access: "paid" },
      { href: "/app/journey/memory", label: "What Journey remembers", access: "paid" },
    ],
  },
  {
    key: "counseling", label: "Counseling", href: "/app/wellness", intro: "Counseling & Wellness Center, free with every account.",
    links: [
      { href: "/app/wellness", label: "Counseling & Wellness Center", note: "Journey, independent counselors, The Art of Wellness", access: "member" },
      { href: "/app/wellness/counselors", label: "Find a counselor", note: "Verified counselors · appointments open after approval", access: "member" },
      { href: "/app/wellness/appointments", label: "My appointments", note: "Counseling requests and confirmations", access: "member" },
      { href: "/app/wellness/art-of-wellness", label: "The Art of Wellness", note: "In-house counseling · coming soon", access: "member" },
      { href: "/wellness", label: "Crisis resources", note: "Always available, no account needed" },
      { href: "/app/counseling", label: "The Art of Becoming", note: "Free with every account", access: "member" },
      { href: "/app/counseling/journal", label: "My private journal", note: "The Art of Becoming", access: "member" },
      { href: "/professionals", label: "For professionals", note: "Counselors, coaches & mentors" },
      { href: "/professionals/apply", label: "Apply as a professional" },
    ],
  },
];

/** The signed-in member's profile menu: account, membership, Journey allowance and preferences. */
export const PROFILE_LINKS: NavLink[] = [
  { href: "/app", label: "My dashboard" },
  { href: "/app/message-center", label: "Message Center" },
  { href: "/app/know-yourself/portfolio", label: "My Personal Discovery Portfolio" },
  { href: "/app/settings", label: "Settings" },
  { href: "/app/membership", label: "Membership & billing" },
  { href: "/what-we-offer", label: "What my membership includes" },
  { href: "/app/journey#chat", label: "My Journey allowance" },
  { href: "/app/journey/customize", label: "Customize Your Journey" },
  { href: "/app/journey/check-ins", label: "Notifications & check-ins" },
  { href: "/app/verify", label: "Identity verification" },
  { href: "/app/safety", label: "Privacy & safety" },
  { href: "/app/support", label: "Support" },
  { href: "/app/assist", label: "Help & suggestions" },
  { href: "/legal", label: "Legal & policies" },
];

/** Bottom navigation inside the signed-in member experience (phones). */
/**
 * Luxury Through Simplicity (founder directive 35): four destinations for members, five for visitors. Everything else lives
 * inside the In Life, In Love and In Business experiences, My World, and "Everything available to me" (/app/explore).
 */
export const MEMBER_TABS = [
  { href: "/app", label: "Home", icon: "home", match: ["/app"] },
  { href: "/app/connections", label: "Connect", icon: "connect", match: ["/app/connections", "/app/connect", "/app/relationships", "/app/readiness", "/app/business", "/app/connect360"] },
  { href: "/app/journey", label: "Journey", icon: "journey", match: ["/app/journey"] },
  { href: "/app/world", label: "My World", icon: "profile", match: ["/app/world", "/app/settings", "/app/membership", "/app/safety", "/app/verify", "/app/career", "/app/explore"] },
] as const;
export const PUBLIC_PRIMARY = [
  { href: "/", label: "Home" }, { href: "/life", label: "In Life" }, { href: "/love", label: "In Love" }, { href: "/business", label: "In Business" }, { href: "/membership", label: "Memberships" },
] as const;

/** Legacy export kept for any remaining consumers. */
export const SITE_NAV = NAV.filter((g) => g.key !== "home").map((g) => ({ href: g.href, label: g.label, sub: g.intro }));
