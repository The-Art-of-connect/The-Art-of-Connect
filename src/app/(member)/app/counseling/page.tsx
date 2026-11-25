import { requireExperience } from "@/lib/auth";
import { LivingHero } from "@/components/business/SocietyHero";
import { PhotoCard } from "@/components/Living";
import { DiscoveryInvite } from "@/components/DiscoveryInvite";

export const dynamic = "force-dynamic";

const MODULES = [
  { title: "Personal growth dashboard", body: "Your goals, daily practices and progress in one place.", href: "/app/journey/daily", image: "/images/library/life/garden-walk.webp" },
  { title: "Guided self-discovery", body: "The ten Arts — from The Art of Self to The Art of Becoming.", href: "/app/journey/library", image: "/images/library/life/moroccan-lounge.webp", position: "50% 70%" },
  { title: "Emotional intelligence", body: "Reflections and exercises to grow self-awareness and empathy.", href: "/app/readiness", image: "/images/library/life/meditation.webp" },
  { title: "Private journal", body: "Visible only to you — not to partners, matches or The Art of Connect team.", href: "/app/counseling/journal", image: "/images/library/life/journaling.webp" },
  { title: "Journey", body: "Your AI connection concierge for self-discovery and personal growth.", href: "/app/journey", image: "/images/library/journey/orb-glow.webp" },
  { title: "Counselors & coaches", body: "Verified, licensed professionals — opening after legal and professional approval.", href: "/app/counseling/professionals", image: "/images/library/business/advisory-lounge.webp" },
];

export default async function InLife() {
  const { viewer, preview } = await requireExperience("counseling");
  return (
    <>
      {preview && <p className="mb-6 rounded-2xl border border-gold/30 bg-gold/5 px-5 py-3 text-sm text-gold">Staff preview — In Life is not open to members yet.</p>}
      <LivingHero
        slides={[
          { src: "/images/library/life/meditation.webp", alt: "Meditating at sunrise above the sea" },
          { src: "/images/library/life/journaling.webp", alt: "Writing in a journal by a sunlit window" },
          { src: "/images/library/life/garden-walk.webp", alt: "A calm walk through a flowering garden" },
        ]}
        eyebrow="The Art of Becoming · In Life" title="Discover who you are" gilded="becoming."
        subtitle="Self-discovery, emotional awareness and personal growth — a private space to understand yourself before you choose your next chapter."
        cta={{ href: "/app/know-yourself", label: "The Art of Knowing Yourself" }}
        secondary={{ href: "/app/counseling/journal", label: "Open my private journal" }}
      />
      <p className="mt-6 rounded-2xl border border-line-strong bg-ivory/60 p-5 text-sm text-muted">
        Private space. Your journal and reflections are visible only to you, and your In Life activity never appears on your In Love or In Business profiles.
      </p>

      <DiscoveryInvite userId={viewer.id} back="/app/counseling" context="Who are you beyond your titles and responsibilities? Rediscover your values, your patterns and what you want your life to represent." />

      <section className="mt-12">
        <p className="eyebrow">Your growth</p>
        <h2 className="display mt-2 text-4xl">Grow at your own pace.</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((c, i) => <PhotoCard key={c.title} {...c} delay={i * 80} />)}
        </div>
      </section>
      <p className="display mt-14 text-center text-2xl italic text-gold-deep">Discover yourself.</p>
    </>
  );
}
