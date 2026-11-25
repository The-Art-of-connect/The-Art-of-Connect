import Image from "next/image";
import Link from "next/link";
import { selfSection } from "@/lib/art-of-self";

/** The approved signature banner for a section of The Art of Self, with optional actions beneath. */
export function SelfBanner({ section, actions }: { section: string; actions?: { href: string; label: string; primary?: boolean }[] }) {
  const s = selfSection(section);
  return (
    <header className="rise">
      <div className="relative aspect-[16/9] overflow-hidden rounded-[28px] border border-champagne/70 shadow-xl">
        <Image src={s.banner} alt={`${s.title}: ${s.tagline}`} fill priority sizes="(min-width: 1280px) 1200px, 100vw" className="object-cover" />
      </div>
      <h1 className="sr-only">{s.title}</h1>
      {actions?.length ? (
        <div className="mt-5 flex flex-wrap gap-3">
          {actions.map((a) => <Link key={a.href} href={a.href} className={`btn ${a.primary ? "btn-gold" : "btn-ghost"}`}>{a.label}</Link>)}
        </div>
      ) : null}
    </header>
  );
}
