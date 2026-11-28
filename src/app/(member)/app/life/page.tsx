import Link from "next/link";
import Image from "next/image";
import { LuxHero } from "@/components/Lux";

export const metadata = { title: "In Life" };

const DOORS = [
  { href: "/app/sanctuary", title: "My Daily Sanctuary", line: "A few quiet minutes each day: reflections, lessons and gratitude.", img: "/images/library/life/meditation.webp" },
  { href: "/app/know-yourself", title: "The Art of Knowing Yourself", line: "Identity, self-love, emotional intelligence and boundaries.", img: "/images/library/life/journaling.webp" },
  { href: "/app/circle", title: "The Becoming Circle", line: "A new open conversation every four hours.", img: "/images/library/life/moroccan-lounge.webp" },
  { href: "/app/career", title: "My Professional Readiness", line: "Your résumé, polished and ready for opportunity.", img: "/images/library/business/executive-portrait.webp" },
  { href: "/app/launch", title: "Start a business", line: "Step-by-step guidance for every state.", img: "/images/library/business/executive-coffee.webp" },
  { href: "/app/wellness", title: "Counseling & Wellness", line: "Support whenever you need it.", img: "/images/library/life/garden-walk.webp" },
];

/** In Life (founder directive 35): personal growth and practical life tools, complimentary with every account. */
export default function InLife() {
  return (
    <>
      <LuxHero eyebrow="In Life" title="Discover yourself. Become more." tagline="Everything here is yours with every account." />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {DOORS.map((d) => (
          <Link key={d.href} href={d.href} className="group overflow-hidden rounded-[1.75rem] border border-line bg-[var(--surface,#fffdf8)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="relative aspect-[16/9] overflow-hidden"><Image src={d.img} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-700 group-hover:scale-[1.03]" /></div>
            <div className="p-5"><p className="display text-2xl">{d.title}</p><p className="mt-1 text-sm text-muted">{d.line}</p></div>
          </Link>
        ))}
      </div>
    </>
  );
}
