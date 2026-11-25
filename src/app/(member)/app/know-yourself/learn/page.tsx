import Link from "next/link";
import { LESSONS, PILLARS } from "@/lib/who-am-i";
import { PillarIcon } from "@/components/PillarIcon";
import { LivingHero } from "@/components/business/SocietyHero";

export const metadata = { title: "Learn · The Art of Knowing Yourself" };

export default function Learn() {
  return (
    <>
      <LivingHero
        slides={[{ src: "/images/library/life/moroccan-lounge.webp", alt: "A thoughtful moment in an elegant lounge", position: "50% 65%" }, { src: "/images/library/life/journaling.webp", alt: "Writing in a journal" }]}
        eyebrow="The Art of Knowing Yourself · Educate yourself" title="Knowledge that helps you" gilded="choose with intention."
        subtitle="Short lessons you can read anytime — free for every member, with no AI processing."
        cta={{ href: "#lessons", label: "Start reading" }} secondary={{ href: "/app/know-yourself", label: "Back to Who Am I?" }}
      />
      <div id="lessons" className="mt-10 grid scroll-mt-24 gap-5 md:grid-cols-2">
        {LESSONS.map((l, i) => {
          const p = PILLARS.find((x) => x.key === l.pillar)!;
          return (
            <article key={l.title} className="glass tile-in p-7" style={{ animationDelay: `${i * 70}ms` }}>
              <p className="flex items-center gap-2 text-xs tracking-[0.22em] uppercase text-gold"><PillarIcon pillar={l.pillar} className="h-4 w-4" /> {p.title}</p>
              <h2 className="display mt-3 text-3xl">{l.title}</h2>
              {l.body.map((b) => <p key={b.slice(0, 24)} className="mt-3 text-muted">{b}</p>)}
              <p className="mt-5 rounded-xl border border-champagne/40 bg-champagne/10 p-4 text-sm"><span className="font-semibold">Try this: </span>{l.practice}</p>
            </article>
          );
        })}
      </div>
      <p className="mt-10 text-center text-sm text-muted">Educational content only — not therapy or professional advice. If you’re struggling, qualified support can help. <Link href="/app/safety" className="text-gold underline">Safety resources</Link></p>
    </>
  );
}
