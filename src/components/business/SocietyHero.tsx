import { HeroSlides, type Slide } from "@/components/business/HeroSlides";
import Link from "next/link";

/** Gold connection lines flowing between owners across the hero image. */
function ConnectionLines() {
  const nodes: [number, number][] = [[60, 70], [210, 40], [330, 95], [120, 170], [270, 190], [380, 30]];
  const paths = [
    "M60 70 C 120 20, 170 20, 210 40", "M210 40 C 260 60, 300 70, 330 95", "M60 70 C 70 120, 90 150, 120 170",
    "M120 170 C 170 210, 230 210, 270 190", "M270 190 C 300 160, 320 130, 330 95", "M210 40 C 230 100, 250 150, 270 190",
    "M330 95 C 350 60, 365 45, 380 30",
  ];
  return (
    <svg viewBox="0 0 400 230" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="goldLine" x1="0" x2="1">
          <stop offset="0" stopColor="#c5a572" stopOpacity="0.2" />
          <stop offset="0.5" stopColor="#f0d9a8" stopOpacity="0.95" />
          <stop offset="1" stopColor="#c5a572" stopOpacity="0.2" />
        </linearGradient>
        <filter id="softGlow"><feGaussianBlur stdDeviation="1.6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <g filter="url(#softGlow)" fill="none" stroke="url(#goldLine)" strokeWidth="1.3" strokeLinecap="round">
        {paths.map((d, i) => <path key={d} d={d} className={`flow-line ${i % 2 ? "slow" : ""}`} style={{ animationDelay: `${-i * 0.9}s` }} />)}
      </g>
      <g fill="#f0d9a8" filter="url(#softGlow)">
        {nodes.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.5" className="node-pulse" style={{ animationDelay: `${i * 0.5}s` }} />)}
      </g>
    </svg>
  );
}

/** A cinematic hero: cross-fading photographs, flowing gold lines, and a call to action. */
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
        <ConnectionLines />
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
