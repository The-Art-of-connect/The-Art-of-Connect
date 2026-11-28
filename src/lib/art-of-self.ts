/** The Art of Knowing Yourself: each section's signature banner (approved artwork) and where it lives. */
export type SelfSection = { key: string; title: string; tagline: string; banner: string; href: string | null; note?: string };

export const SELF_SECTIONS: SelfSection[] = [
  { key: "identity", title: "Identity & Self-Love", tagline: "Discover who you are beyond roles, responsibilities and expectations.", banner: "/images/self/identity-self-love.webp", href: "/app/know-yourself/identity-self-love" },
  { key: "purpose", title: "Purpose & Personal Alignment", tagline: "Clarify what matters and move in the direction of your life.", banner: "/images/self/purpose-alignment.webp", href: "/app/know-yourself/who-am-i/what-my-life-represents" },
  { key: "boundaries", title: "Boundaries & Self-Worth", tagline: "Honor your value and protect the essence of who you are.", banner: "/images/self/boundaries-self-worth.webp", href: "/app/know-yourself/boundaries" },
  { key: "emotional-intelligence", title: "Emotional Intelligence", tagline: "Understand your emotions. Respond with intention.", banner: "/images/self/emotional-intelligence.webp", href: "/emotional-intelligence" },
  { key: "consciousness", title: "Levels of Consciousness", tagline: "Recognize your awareness, growth and alignment.", banner: "/images/self/levels-of-consciousness.webp", href: "/emotional-intelligence/self-awareness", note: "Begins within Self-Awareness" },
  { key: "love-languages", title: "Five Love Languages", tagline: "Understand how you give, receive and experience love.", banner: "/images/self/five-love-languages.webp", href: "/app/know-yourself/love-languages" },
  { key: "attachment", title: "Attachment Styles", tagline: "Understand closeness, trust and how you connect.", banner: "/images/self/attachment-styles.webp", href: null, note: "Curriculum in preparation" },
  { key: "inner-child", title: "Inner-Child Discovery", tagline: "Reconnect with the part of you that still needs understanding.", banner: "/images/self/inner-child.webp", href: null, note: "Curriculum in preparation" },
  { key: "manifestation", title: "Manifestation & Intentional Living", tagline: "Set your intentions and live with clarity, gratitude and purpose.", banner: "/images/self/manifestation.webp", href: "/app/journey/check-ins" },
];
export const selfSection = (key: string) => SELF_SECTIONS.find((s) => s.key === key)!;
