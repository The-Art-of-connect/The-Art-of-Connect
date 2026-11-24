export type Experience = "relationships" | "business" | "counseling";
export type StaffRole = "owner" | "admin" | "support" | "moderator" | "finance";

export const EXPERIENCES: Record<
  Experience,
  { name: string; eyebrow: string; tagline: string; accent: string; href: string; pillars: string[] }
> = {
  relationships: {
    name: "Relationships",
    eyebrow: "I · Intentional love",
    tagline: "Connection designed with intention — from first conversation to lasting partnership.",
    accent: "var(--relationships)",
    href: "/relationships",
    pillars: ["Compatibility assessments", "Intentional dating", "Relationship development", "Couples’ growth studio"],
  },
  business: {
    name: "Business",
    eyebrow: "II · Purposeful ambition",
    tagline: "A private network where founders, leaders and makers find the partners they’ve been looking for.",
    accent: "var(--business)",
    href: "/business",
    pillars: ["Business compatibility", "Partnerships & collaboration", "Curated referrals", "Entrepreneurial circles"],
  },
  counseling: {
    name: "Counseling",
    eyebrow: "III · Guided growth",
    tagline: "Verified counselors, private by design. Your counseling life stays yours alone.",
    accent: "var(--counseling)",
    href: "/counseling",
    pillars: ["Credential-verified providers", "Confidential client identity", "Seamless scheduling", "Provider memberships"],
  },
};
