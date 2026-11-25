/**
 * The three experiences. Internal keys (used in the database and permissions)
 * are stable; everything customers see comes from the display fields here.
 *   business      → In Business · Professional Connections
 *   counseling    → In Life     · Personal Growth & Guidance
 *   relationships → In Love     · Romantic Connections
 */
export type Experience = "relationships" | "business" | "counseling";
/** owner · finance · executive · admin/support/moderator (general staff) · investor (reserved, no access yet) */
export type StaffRole = "owner" | "admin" | "support" | "moderator" | "finance" | "executive" | "investor";

export type ExperienceInfo = {
  name: string;
  subtitle: string;
  caption: string;
  summary: string;
  accent: string;
  href: string;
  image: string;
  imageAlt: string;
  pillars: string[];
};

export const EXPERIENCES: Record<Experience, ExperienceInfo> = {
  business: {
    name: "In Business",
    subtitle: "Professional Connections",
    caption: "Connect with purpose.",
    summary:
      "Business compatibility, professional networking, mentorship, strategic partnerships, collaboration and meaningful professional relationships.",
    accent: "var(--business)",
    href: "/business",
    image: "/images/in-business.webp",
    imageAlt: "Professionals talking and laughing together at an elegant evening reception",
    pillars: ["Business compatibility", "Professional networking", "Mentorship", "Strategic partnerships", "Collaboration"],
  },
  counseling: {
    name: "In Life",
    subtitle: "Personal Growth & Guidance",
    caption: "Discover yourself.",
    summary:
      "Self-discovery, personal development, emotional intelligence, private journaling and access to qualified counselors and coaches.",
    accent: "var(--counseling)",
    href: "/life",
    image: "/images/in-life.webp",
    imageAlt: "A woman with silver hair sitting by a sunlit window, smiling thoughtfully",
    pillars: ["Self-discovery", "Personal development", "Emotional intelligence", "Private journaling", "Qualified counselors & coaches"],
  },
  relationships: {
    name: "In Love",
    subtitle: "Romantic Connections",
    caption: "Connect intentionally.",
    summary:
      "Intentional matchmaking for singles, personality and compatibility assessments, relationship readiness, emotional intelligence, meaningful introductions and relationship development tools for existing couples.",
    accent: "var(--relationships)",
    href: "/love",
    image: "/images/in-love.webp",
    imageAlt: "A couple sharing a warm conversation over dinner at golden hour",
    pillars: ["Intentional matchmaking for singles", "Personality & compatibility assessments", "Relationship readiness", "Meaningful introductions", "Tools for existing couples"],
  },
};

/** Display order follows the tagline: In Business. In Life. In Love. */
export const EXPERIENCE_ORDER: Experience[] = ["business", "counseling", "relationships"];
