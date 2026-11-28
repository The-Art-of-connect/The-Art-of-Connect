import { matchTerms } from "./brand.ts";
/**
 * The site's navigation index — every page a visitor, member or team member
 * might be looking for, with the everyday words people use to find it.
 * Used by the search box in each area (website, member area, Owner Portal).
 * Contains page names and descriptions only — never member data.
 */
export type SearchArea = "site" | "member" | "owner";
export type SearchEntry = { href: string; title: string; section: string; summary: string; keywords?: string; area: SearchArea };

const site = (href: string, title: string, section: string, summary: string, keywords = ""): SearchEntry => ({ href, title, section, summary, keywords, area: "site" });
const member = (href: string, title: string, section: string, summary: string, keywords = ""): SearchEntry => ({ href, title, section, summary, keywords, area: "member" });

export const SITE_PAGES: SearchEntry[] = [
  site("/", "Home", "The Art of Connect", "Start here — In Business. In Life. In Love.", "main home page start welcome landing"),
  site("/wellness", "Crisis resources & wellness", "Counseling", "Help right now: 911, 988 Suicide & Crisis Lifeline, Crisis Text Line. No account needed.", "crisis emergency 988 suicide help hotline wellness counseling safety"),
  site("/membership", "Memberships & pricing", "Memberships", "Choose your experiences and build your membership.", "price prices cost plans packages join subscribe annual monthly bundle couples dual society"),
  site("/membership#build", "Build your membership", "Memberships", "Pick experiences and see your package.", "builder join sign up choose plan"),
  site("/business", "The Professional Society", "In Business", "Professional connections, networking, mentorship and partnerships.", "business networking mentor partners entrepreneurs owners"),
  site("/business/explore", "Explore The Professional Society", "In Business", "See what’s included before you join. Try The Professional Society free for 15 days.", "business trial founding member explore guest"),
  site("/webinars", "The Knowledge Exchange — webinars", "In Business", "Live business webinars hosted by members.", "webinar webinars classes learn events live training education"),
  site("/life", "The Art of Becoming", "In Life", "Self-discovery, personal growth, journaling and guidance.", "life growth personal development journal counseling coaching wellness"),
  site("/love", "The Personal Society", "In Love", "Intentional matchmaking for singles and enrichment for couples.", "love dating singles couples relationship match matchmaking partner"),
  site("/professionals", "For professionals", "Professionals", "Counselors, coaches and mentors who serve our members.", "counselor coach mentor therapist provider professional"),
  site("/professionals/apply", "Apply as a professional", "Professionals", "Apply to join our professional network.", "apply application provider credentials"),
  site("/emotional-intelligence", "The Art of Emotional Intelligence", "The Art of Knowing Yourself", "Understand yourself. Respond with intention.", "emotional intelligence eq self awareness self regulation motivation empathy relationship skills triggers conflict boundaries resilience"),
  site("/legal", "Legal & policies", "Help", "Terms, privacy, cancellation, refunds and community standards.", "terms privacy policy cancel cancellation refund rules community standards safety cookies accessibility legal"),
  site("/sign-in", "Sign in", "Account", "Members and team sign in.", "login log in account member access"),
  site("/forgot-password", "Forgot password", "Account", "Reset your password by email.", "reset password forgot can't log in locked out"),
  site("/join", "Join", "Account", "Create your account.", "register sign up create account enroll"),
  site("mailto:info@theartofconnect.com", "Contact us", "Help", "Email info@theartofconnect.com — we’re happy to help.", "contact help support email question customer service"),
];

export const MEMBER_PAGES: SearchEntry[] = [
  member("/app", "Member home", "Your membership", "Your experiences and what’s next.", "home dashboard start"),
  member("/app/know-yourself", "The Art of Knowing Yourself", "Who Am I?", "Before you connect with the world, connect with yourself.", "who am i self discovery know yourself values beliefs purpose identity personal journey"),
  member("/app/know-yourself/portfolio", "My Personal Discovery Portfolio", "The Art of Knowing Yourself", "Your identity, emotional blueprint, patterns, values, growth and action plan, together.", "portfolio analysis overall report personal discovery results summary progress growth compare print download"),
  member("/app/wellness/counselors", "Find a counselor", "Counseling & Wellness Center", "Verified counselors, their own fees and open times. Appointment requests open after legal, licensing and privacy approval.", "book counselor appointment therapist booking schedule session find a therapist counseling appointment"),
  member("/app/wellness/appointments", "My appointments", "Counseling & Wellness Center", "Your counseling requests and confirmed appointments with verified counselors.", "my appointments counseling session upcoming booking requested confirmed"),
  member("/app/launch/orders", "My formation requests", "Business Launch Center", "Prepare an LLC, corporation or nonprofit formation and send it as a request, reviewed before anything is filed or charged.", "formation request form my llc file llc incorporate order formation status nonprofit corporation filing"),
  member("/app/wellness", "Counseling & Wellness Center", "Counseling", "Journey guided support, independent counselors and The Art of Wellness, open to every member.", "counseling therapy therapist counselor wellness mental health support grief divorce stress help professional"),
  member("/app/journey/discover", "Discovery Sessions with Journey", "Journey", "Adaptive, personal questions across 14 areas of life, with a private summary.", "discovery session adaptive questions journey personal summary analysis childhood dating marriage money leadership"),
  member("/app/know-yourself/identity-self-love", "Identity & Self-Love", "The Art of Knowing Yourself", "Discover who you are beyond roles, responsibilities and expectations.", "identity self love self-love alone solitude giving guilt boundaries communication worth needs"),
  member("/app/know-yourself/emotional-intelligence/lessons", "Emotional Intelligence: Founding Curriculum", "The Art of Knowing Yourself", "Six lessons: reactions, triggers, empathy, delivery, accountability and emotional maturity.", "emotional intelligence lessons triggers reaction empathy delivery tone accountability apology maturity curriculum"),
  member("/app/know-yourself/emotional-intelligence", "My Emotional Intelligence Profile", "Who Am I?", "Strengths, triggers, communication, conflict and growth milestones.", "emotional intelligence profile triggers conflict strengths growth"),
  member("/app/know-yourself/love-languages", "Love Language Profile", "Who Am I?", "How you give and receive love — physical touch, words, quality time, acts of service and gifts.", "love languages love language physical touch words of affirmation quality time acts of service receiving gifts affection"),
  member("/app/relationships/love-languages", "Love languages together", "In Love", "For couples and mutual matches: how you each feel loved.", "love languages partner couples matches compatibility"),
  member("/app/know-yourself/boundaries", "Boundaries & non-negotiables", "Who Am I?", "What you will do, what you won’t, and how to say it respectfully.", "boundaries standards non negotiables respect dating marriage work"),
  member("/app/know-yourself/learn", "Self-discovery lessons", "Who Am I?", "Short lessons on values, patterns, boundaries and confidence.", "learn lessons education values patterns confidence"),
  member("/app/know-yourself/growth", "My growth plan", "Who Am I?", "Personal development goals and how you’ve grown.", "goals growth plan progress personal development"),
  member("/app/membership", "My membership & billing", "Your membership", "Plan, billing, invoices, change or cancel.", "billing invoice payment card cancel change plan upgrade downgrade receipt"),
  member("/app/onboarding", "Complete your membership", "Your membership", "Finish setting up your membership.", "checkout finish setup"),
  member("/app/verify", "Verify your identity", "Your membership", "Confirm your identity for a verified badge.", "verification id identity verified badge"),
  member("/app/safety", "Safety & privacy", "Your membership", "Blocking, reporting and privacy controls.", "block report privacy safety harassment appeal"),
  member("/app/journey", "Journey", "Journey", "Your AI concierge for business, life and love.", "ai assistant chat concierge journey guidance"),
  member("/app/journey/check-ins", "Journey check-ins", "Journey", "Morning manifestations, evening reflections and personal check-ins.", "check in check-ins reminders manifestation affirmation reflection notifications quiet hours"),
  member("/app/journey/daily", "My Daily Journey", "Journey", "Daily manifestations, reflections and journaling.", "daily manifestation affirmation reflection"),
  member("/app/journey/library", "The Library", "Journey", "The Art of… knowledge library.", "library knowledge learn modules art of"),
  member("/app/journey/sessions", "Private Sessions", "Journey", "Private guided sessions with Journey.", "sessions private session guided"),
  member("/app/journey/voice", "Talk to Journey", "Journey", "Voice conversations and voice selection.", "voice talk speak"),
  member("/app/journey/memory", "What Journey remembers", "Journey", "Review and delete Journey’s memory of you.", "memory remember delete privacy"),
  member("/app/journey/plus", "Journey Plus & Auto-Reload", "Journey", "Message packages, Auto-Reload and spending limits.", "messages allowance auto reload package spending cap limit"),
  member("/app/business", "Business dashboard", "In Business", "Your pathway, goals and readiness checklist.", "business dashboard goals checklist"),
  member("/app/business/onboarding", "Let’s Talk About Your Business", "In Business", "Tell us how we can help — and how you can help others.", "business profile onboarding questions"),
  member("/app/business/board", "Business Connection Board", "In Business", "Posts from owners who need help or offer expertise.", "board posts connect help offer need"),
  member("/app/business/board/new", "Create a business post", "In Business", "Post a need or offer your expertise.", "new post create"),
  member("/app/business/inbox", "Private business inbox", "In Business", "Connection requests and private messages.", "inbox messages requests conversations"),
  member("/app/business/learn", "The Knowledge Exchange", "In Business", "Webinars to attend and host.", "webinar webinars learn events"),
  member("/app/business/learn/host/new", "Host a webinar", "In Business", "Create and submit a webinar.", "host webinar create flyer qr"),
  member("/app/relationships", "The Personal Society", "In Love", "Singles and couples.", "love dating singles couples"),
  member("/app/relationships/onboarding", "In Love onboarding", "In Love", "Your relationship questionnaire, saved as you go.", "questionnaire onboarding questions profile"),
  member("/app/readiness", "Readiness Profile", "In Love", "Your relationship readiness results.", "readiness results profile assessment"),
  member("/app/relationships/exclusive", "The Exclusive Connection", "In Love", "Pause matchmaking when you’ve found your person.", "exclusive found my person pause"),
  member("/app/relationships/calendar", "Our Calendar", "In Love", "Your shared calendar for date nights and trips.", "calendar couples date night trip schedule"),
  member("/app/connect360", "CONNECT 360", "In Business", "Your private business workspace: collaborators, Business Deal Rooms, proposals, funding and research. Executive Private and Elite Concierge.", "connect 360 connect360 business workspace collaboration collaborators deal room proposals funding capital research executive elite"),
  member("/app/connect360/intelligence", "My Intelligence Office", "CONNECT 360", "Ask Journey to research an opportunity: cited sources, clear labels and a private report.", "my intelligence office intelligence research assignment report opportunity radar market research acquisition suppliers sources citations"),
  member("/app/connect360/rooms", "Business Deal Rooms", "CONNECT 360", "Private rooms for a business project: people, documents, milestones and professional review.", "deal room rooms project documents milestones due diligence"),
  member("/app/connect360/collaborate", "Collaborators", "CONNECT 360", "Find Executive and Elite members open to business collaboration.", "collaborators collaboration partners directory executive elite"),
  member("/app/connect360/proposals", "Strategic Proposal Builder", "CONNECT 360", "Write, version and share strategic proposals.", "proposal proposals strategic plan versions"),
  member("/app/connect360/funding", "Capital & Funding Intelligence Center", "CONNECT 360", "Plan how a project is funded, track applications and lender decisions.", "funding capital financing loan lender application proof of funds"),
  member("/app/counseling", "The Art of Becoming", "In Life", "Personal growth and guidance.", "life growth counseling"),
  member("/app/counseling/journal", "Private journal", "In Life", "Your private journal — only you can read it.", "journal diary private writing"),
];

/** Words people type that mean the same thing. */
const SYNONYMS: Record<string, string> = {
  login: "sign in", logon: "sign in", signin: "sign in", register: "join", signup: "join", price: "pricing", cost: "pricing",
  dating: "love", match: "matchmaking", ai: "journey", chat: "journey", refund: "cancel", bill: "billing", password: "password",
};

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s+]/gu, " ").replace(/\s+/g, " ").trim();

/** Ranks entries for a query: title matches first, then keywords, section and description. */
export function searchEntries<T extends SearchEntry>(entries: T[], query: string, limit = 12): T[] {
  const q = norm(query);
  if (!q) return [];
  const terms = q.split(" ").flatMap((t) => [t, ...(SYNONYMS[t] ? norm(SYNONYMS[t]).split(" ") : [])]);
  const official = new Set(matchTerms(query).map((t) => norm(t.name)));
  const scored = entries.map((e, i) => {
    const title = norm(e.title), kw = norm(e.keywords ?? ""), sec = norm(e.section), sum = norm(e.summary);
    let score = title === q ? 50 : title.startsWith(q) ? 30 : title.includes(q) ? 20 : 0;
    let matched = 0;
    for (const t of new Set(terms)) {
      const hit = (title.includes(t) ? 6 : 0) + (kw.split(" ").some((w) => w.startsWith(t)) ? 4 : kw.includes(t) ? 2 : 0) + (sec.includes(t) ? 2 : 0) + (sum.includes(t) ? 1 : 0);
      if (hit) matched++;
      score += hit;
    }
    // Brand Terminology Registry: everyday words ("research", "loan") lead to the official feature name first.
    if (official.has(title)) { score += 60; matched++; }
    return { e, i, score: matched ? score : 0 };
  });
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score || a.i - b.i).slice(0, limit).map((s) => s.e);
}
