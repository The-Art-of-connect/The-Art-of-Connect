import { HeroSlides, type Slide } from "@/components/business/HeroSlides";
import Link from "next/link";

/** A cinematic hero: cross-fading photographs and a call to action. Photos are shown clean — no overlays across faces. */
export function LivingHero({ slides, eyebrow, title, gilded, subtitle, cta, secondary, aspect = "aspect-[16/10] sm:aspect-[21/9]" }: {
  slides?: Slide[]; eyebrow: string; title: string; gilded?: string; subtitle: string;
  cta: { href: string; label: string }; secondary?: { href: string; label: string }; aspect?: string;
}) {
  return (
    <section className="theme-dark relative overflow-hidden rounded-[28px] bg-ink p-3 sm:p-4">
      <div className={`relative overflow-hidden rounded-[22px] ${aspect}`}>
        <HeroSlides slides={slides} />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/35 to-ink/10" />
        <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_85%_10%,rgb(116_63_77/0.35),transparent_70%)]" />
      </div>
      <div className="relative px-3 pt-6 pb-4 sm:px-6 sm:pb-6">
        <p className="eyebrow rise">{eyebrow}</p>
        <h1 className="display rise rise-2 mt-3 text-4xl leading-tight sm:text-6xl">{title}{gilded && <> <span className="gilded italic">{gilded}</span></>}</h1>
        <p className="rise rise-3 mt-4 max-w-xl text-muted">{subtitle}</p>
        <div className="rise rise-4 mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href={cta.href} className="btn btn-gold shimmer w-full sm:w-auto">{cta.label}</Link>
          {secondary && <Link href={secondary.href} className="btn btn-ghost w-full sm:w-auto">{secondary.label}</Link>}
        </div>
      </div>
    </section>
  );
}

export function SocietyHero({ ctaHref }: { ctaHref: string }) {
  return (
    <LivingHero eyebrow="Your next chapter in business" title="Great businesses aren’t" gilded="built alone."
      subtitle="Connect with visionaries. Exchange knowledge. Build beyond boundaries." cta={{ href: ctaHref, label: "Discover Your Business Network" }} />
  );
}
