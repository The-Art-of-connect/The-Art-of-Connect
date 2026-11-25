import Link from "next/link";

/**
 * Shared luxury building blocks for the member area, built only from the
 * brand palette (espresso, champagne gold, burgundy, ivory, cream).
 */

export function LuxHero({ eyebrow, title, tagline, children, tone = "dark" }: {
  eyebrow: string; title: string; tagline?: string; children?: React.ReactNode; tone?: "dark" | "burgundy";
}) {
  return (
    <section className={`theme-${tone} relative overflow-hidden rounded-[2rem] px-6 py-12 sm:px-12 sm:py-16`} style={{ background: "var(--ink)" }}>
      <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "var(--glow)" }} aria-hidden="true" />
      <div className="relative">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display mt-4 text-5xl text-gold-bright sm:text-6xl">{title}</h1>
        {tagline && <p className="display mt-5 text-2xl italic text-muted sm:text-3xl">{tagline}</p>}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}

export function LuxSection({ eyebrow, title, intro, children }: { eyebrow?: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="display mt-2 text-3xl sm:text-4xl">{title}</h2>
      {intro && <p className="mt-3 max-w-2xl text-muted">{intro}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function LuxCard({ title, body, href, badge, mark, children, dark }: {
  title: string; body?: string; href?: string; badge?: string; mark?: string; children?: React.ReactNode; dark?: boolean;
}) {
  const inner = (
    <div className={`${dark ? "theme-dark" : ""} glass group relative h-full p-6 transition sm:p-7 ${href ? "hover:-translate-y-0.5 hover:border-gold/60" : ""}`} style={dark ? { background: "var(--ink)" } : undefined}>
      <div className="flex items-start justify-between gap-3">
        {mark && <span className="display text-3xl text-gold" aria-hidden="true">{mark}</span>}
        {badge && <span className="chip ml-auto">{badge}</span>}
      </div>
      <h3 className={`${mark || badge ? "mt-4" : ""} text-xl font-semibold`}>{title}</h3>
      {body && <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>}
      {children && <div className="mt-4">{children}</div>}
      {href && <p className="mt-5 text-sm font-semibold text-gold-deep group-hover:underline">Open →</p>}
    </div>
  );
  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner;
}

export function GoldRule() {
  return <div className="my-10 h-px w-full" style={{ background: "linear-gradient(90deg, transparent, var(--champagne), transparent)" }} aria-hidden="true" />;
}

export function Notice({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-gold/30 bg-gold/5 px-5 py-3 text-sm text-gold-deep">{children}</p>;
}

/** Shown under every Journey surface, whatever the member's allowance. */
export function SafetyFooter() {
  return (
    <aside className="mt-14 rounded-2xl border border-line px-6 py-5 text-sm text-muted">
      <p className="font-semibold text-text">Journey is an AI assistant, not a licensed therapist.</p>
      <p className="mt-1">
        If you or someone else may be in danger, contact local emergency services (911 in the U.S.) or call or text 988 for the Suicide &amp; Crisis Lifeline.
        You can always reach our team through <Link href="/app/safety" className="font-semibold text-gold-deep underline">Safety</Link>, whatever your membership or Journey allowance.
      </p>
    </aside>
  );
}
