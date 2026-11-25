import Image from "next/image";
import Link from "next/link";
import { SELF_SECTIONS } from "@/lib/art-of-self";

/** The Art of Self: every section, presented with its signature artwork. */
export function SelfCollection() {
  return (
    <section id="art-of-self" aria-labelledby="aos-title" className="mt-14 scroll-mt-24">
      <p className="eyebrow">The Art of Self</p>
      <h2 id="aos-title" className="display mt-2 text-4xl sm:text-5xl">Every part of you, <span className="italic text-burgundy">honored.</span></h2>
      <p className="mt-3 max-w-2xl text-muted">Explore at your own pace, in any order. Each section is optional, private and yours to return to whenever you wish.</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SELF_SECTIONS.map((s, i) => {
          const card = (
            <>
              <div className="relative aspect-[16/9] overflow-hidden">
                <Image src={s.banner} alt={`${s.title}: ${s.tagline}`} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-[1200ms] group-hover:scale-105" />
              </div>
              <div className="flex items-center justify-between gap-3 px-5 py-4">
                <span className="text-sm font-semibold text-burgundy">{s.href ? "Explore" : s.note}</span>
                {s.href ? <span className="text-xs text-muted">{s.note ?? ""} <span aria-hidden="true" className="text-gold-deep">→</span></span> : <span className="chip chip-locked">Coming soon</span>}
              </div>
            </>
          );
          const cls = "glass tile-in group block overflow-hidden !p-0";
          return s.href
            ? <Link key={s.key} href={s.href} className={`${cls} lift`} style={{ animationDelay: `${i * 60}ms` }}>{card}</Link>
            : <div key={s.key} className={`${cls} opacity-90`} style={{ animationDelay: `${i * 60}ms` }}>{card}</div>;
        })}
      </div>
    </section>
  );
}
