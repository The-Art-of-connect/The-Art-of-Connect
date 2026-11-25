import Image from "next/image";
import Link from "next/link";
import { CRISIS } from "@/lib/wellness";

export const metadata = { title: "The Art of Wellness" };

const SERVICES = [
  { title: "Individual Counseling", body: "Personal support, emotional wellness and life transitions.", image: "/images/wellness/individual.webp", format: "Virtual or in-person" },
  { title: "Marriage & Couples Counseling", body: "Communication, relationship concerns and rebuilding connection.", image: "/images/wellness/couples.webp", format: "Virtual or in-person" },
  { title: "Family Counseling", body: "Understanding, communication and healing within families.", image: "/images/wellness/family.webp", format: "Virtual or in-person" },
  { title: "Grief & Loss Support", body: "Compassionate care through loss and the changes it brings.", image: "/images/wellness/grief.webp", format: "Virtual or in-person" },
  { title: "Divorce & Life Transitions", body: "Support through endings, new beginnings and change.", image: "/images/library/life/journaling.webp", format: "Virtual or in-person" },
  { title: "Specialized Counseling", body: "Qualified professionals for specific personal and emotional concerns.", image: "/images/library/business/advisory-lounge.webp", format: "By specialty and availability" },
];

/** The Art of Connect's future in-house counseling division. Coming Soon until legal, licensing and privacy requirements are met. */
export default function ArtOfWellness() {
  return (
    <>
      <Link href="/app/wellness" className="text-sm font-semibold text-gold">← Counseling &amp; Wellness Center</Link>
      <article className="theme-dark mx-auto mt-4 max-w-3xl rounded-[28px] bg-ink px-6 py-10 text-ivory shadow-2xl sm:px-12">
        <p className="text-center text-xs tracking-[0.3em] uppercase text-gold">The Art of Connect</p>
        <h1 className="display mt-3 text-center text-4xl text-gold-bright sm:text-5xl">The Art of Wellness</h1>
        <p className="mt-3 text-center text-xl italic text-ivory/85">Counseling &amp; Professional Support</p>
        <p className="mt-2 text-center italic text-ivory/70">Professional support for every chapter of your life.</p>
        <p className="mx-auto mt-5 w-fit rounded-full border border-gold/60 px-4 py-1 text-sm text-gold">Coming soon</p>
        <div className="mx-auto mt-6 h-px w-full bg-gold/40" />
        {SERVICES.map((s) => (
          <section key={s.title} className="flex gap-5 border-b border-gold/25 py-6 last:border-0">
            <span className="relative h-28 w-24 shrink-0 overflow-hidden rounded-2xl sm:h-32 sm:w-28"><Image src={s.image} alt="" fill sizes="112px" className="object-cover object-center" /></span>
            <div>
              <h2 className="display text-2xl text-gold-bright">{s.title}</h2>
              <p className="mt-1 text-sm text-ivory/85">{s.body}</p>
              <p className="mt-2 text-xs text-gold">{s.format}</p>
            </div>
          </section>
        ))}
        <div className="mx-auto mt-4 h-px w-full bg-gold/40" />
        <p className="display mt-6 text-center text-2xl text-gold-bright">Understanding. Support. Growth.</p>
        <p className="mx-auto mt-4 max-w-xl text-center text-xs text-ivory/60">Licensed professionals affiliated with The Art of Connect will offer virtual and in-person appointments. Each professional sets their own fees, shown before you book. Opens once all legal, licensing and privacy requirements are complete. Separate from Journey, which offers nonclinical guided support only.</p>
        <p className="mt-4 text-center text-[0.65rem] text-ivory/45">Illustrative imagery; not actual counselors or clients.</p>
      </article>
      <section className="mx-auto mt-8 max-w-3xl rounded-[24px] border border-danger/30 bg-danger/5 p-6">
        <h2 className="display text-2xl">If you need help right now</h2>
        <ul className="mt-3 space-y-2 text-sm">{CRISIS.map((c) => <li key={c.label}><span className="font-semibold">{c.label}:</span> {c.detail}</li>)}</ul>
      </section>
    </>
  );
}
