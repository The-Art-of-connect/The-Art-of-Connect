import { requireExperience } from "@/lib/auth";
import { LivingHero } from "@/components/business/SocietyHero";
import { PhotoCard } from "@/components/Living";
import { DiscoveryInvite } from "@/components/DiscoveryInvite";

export const dynamic = "force-dynamic";

const SINGLES = [
  { title: "Your Personal Society journey", body: "Four short stages — welcome, understanding you, readiness and compatibility. Save and continue anytime.", href: "/app/relationships/onboarding", image: "/images/library/love/candlelit-dinner.webp" },
  { title: "Relationship readiness", body: "Your private discovery report: strengths, growth areas and educational next steps.", href: "/app/readiness", image: "/images/library/life/journaling.webp" },
  { title: "Personality & compatibility", body: "Assessments of values, attachment, communication and life vision.", image: "/images/library/love/mature-dinner.webp" },
  { title: "Intentional matchmaking", body: "Curated introductions with the reasons you may be well suited. Singles 30+ only.", image: "/images/library/love/laughing-dinner.webp" },
  { title: "The Exclusive Connection", body: "When you both choose to focus on each other — mutual, private and respectful.", href: "/app/relationships/exclusive", image: "/images/library/love/sunset-wedding.webp" },
  { title: "Your In Love profile", body: "Used only in In Love, with private photo controls and visibility settings.", image: "/images/library/life/moroccan-lounge.webp", position: "50% 70%" },
];
const COUPLES = [
  { title: "Just us — our calendar", body: "Date nights, trips and plans together, with each partner’s schedule kept private.", href: "/app/relationships/calendar", image: "/images/library/love/sunset-dinner.webp" },
  { title: "Shared relationship space", body: "Goals, guided conversations and connection activities you share together.", image: "/images/library/love/cooking-together.webp" },
  { title: "Private reflections", body: "Your individual reflections — never shared with your partner unless you choose.", image: "/images/library/love/sunlit-anniversary.webp" },
  { title: "Invite your partner", body: "A secure invitation. Your shared space opens only when your partner accepts.", image: "/images/library/love/first-dance.webp", position: "50% 60%" },
  { title: "Journey for couples", body: "Plan memorable dates, communicate intentionally and surprise your partner.", href: "/app/journey", image: "/images/library/journey/orb-glow.webp" },
  { title: "Professional support", body: "Consent-based referrals to counselors and coaches, and appointment scheduling.", href: "/app/counseling/professionals", image: "/images/library/business/advisory-lounge.webp" },
];

export default async function InLove() {
  const { viewer, preview } = await requireExperience("relationships");
  return (
    <>
      {preview && <p className="mb-6 rounded-2xl border border-gold/30 bg-gold/5 px-5 py-3 text-sm text-gold">Staff preview — In Love is not open to members yet.</p>}
      <LivingHero
        slides={[
          { src: "/images/library/love/candlelit-dinner.webp", alt: "A couple smiling over a candlelit dinner" },
          { src: "/images/library/love/sunlit-anniversary.webp", alt: "A couple celebrating in warm afternoon light" },
          { src: "/images/library/love/laughing-dinner.webp", alt: "A couple laughing together at dinner" },
          { src: "/images/library/love/sunset-wedding.webp", alt: "A couple walking hand in hand at sunset" },
        ]}
        eyebrow="The Personal Society · In Love" title="Love begins with" gilded="knowing yourself."
        subtitle="Intentional connection for singles 30+ and enrichment for couples — built on self-awareness, respect and honest communication."
        cta={{ href: "/app/relationships/onboarding", label: "Begin your Personal Society journey" }}
        secondary={{ href: "/app/know-yourself", label: "The Art of Knowing Yourself" }}
      />

      <DiscoveryInvite userId={viewer.id} back="/app/relationships" context="Before you date, marry or recommit — understand what you need, what you offer, and how to keep your individuality within a partnership." />

      <section className="mt-12">
        <p className="eyebrow">For singles · 30+</p>
        <h2 className="display mt-2 text-4xl">Date with intention.</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SINGLES.map((c, i) => <PhotoCard key={c.title} {...c} delay={i * 80} />)}
        </div>
      </section>

      <section className="mt-14">
        <p className="eyebrow">For couples</p>
        <h2 className="display mt-2 text-4xl">Nurture what you’ve built.</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {COUPLES.map((c, i) => <PhotoCard key={c.title} {...c} delay={i * 80} />)}
        </div>
      </section>
      <p className="display mt-14 text-center text-2xl italic text-gold-deep">Connect intentionally.</p>
    </>
  );
}
