import Link from "next/link";
import { EliteBadge } from "@/components/EliteBadge";
import { ELITE_TAGLINE } from "@/lib/elite";
import { comingSoonPaths } from "@/lib/section-status";

const TILES = [
  { href: "/app/elite", title: "Elite Concierge", body: "Your private Elite dashboard and experiences." },
  { href: "/app/journey", title: "Journey Concierge", body: "Personal guidance with the largest included monthly Journey allowance." },
  { href: "/app/connect/circles?category=elite", title: "Elite circles", body: "Verified peers, plus every open circle you choose." },
  { href: "/app/connect/events?eligibility=elite", title: "Elite experiences", body: "Exclusive events on The Connect Calendar." },
  { href: "/app/journey/sessions", title: "Private Sessions", body: "Included with your membership." },
  { href: "/app/support", title: "Priority support", body: "Your requests are answered first." },
  { href: "/app/connect/profile", title: "Elite privacy", body: "Choose who sees your profile and photographs." },
  { href: "/app/connect/people", title: "Find your people", body: "Peers, partners, mentors and friends: Elite-only or open, your choice." },
];

/** The black-and-gold personalized dashboard for Elite Concierge members. */
export async function EliteHome({ name, since }: { name: string | null; since: string | null }) {
  const soon = await comingSoonPaths();
  return (
    <section className="theme-dark relative overflow-hidden rounded-[32px] border border-[#c9a96e]/50 px-6 py-10 sm:px-10" style={{ background: "linear-gradient(160deg,#16100d 0%,#241a15 55%,#1b1310 100%)" }}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_60%_at_85%_0%,rgb(232_112_26/0.16),transparent_70%),radial-gradient(45%_50%_at_0%_100%,rgb(201_169_110/0.18),transparent_70%)]" aria-hidden="true" />
      <div className="relative">
        <p className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.3em] text-[#f0c98a]"><EliteBadge size={18} /> Elite Concierge{since ? ` · since ${since}` : ""}</p>
        <h2 className="display mt-4 text-4xl text-[#f6e7c8] sm:text-6xl">Welcome back{name ? `, ${name}` : ""}.</h2>
        <p className="display mt-2 text-xl italic text-[#e8892b]">{ELITE_TAGLINE}</p>
        <p className="mt-3 max-w-2xl text-sm text-[#f5ecdf]/75">Elite includes every society, every course, every eligible circle you choose, and our largest monthly Journey allowance.</p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TILES.map((t) => (
            <li key={t.href}>
              <Link href={t.href} className="block h-full rounded-2xl border border-[#c9a96e]/35 bg-white/[0.03] p-4 transition hover:border-[#e8892b]">
                <span className="display block text-xl text-[#f0c98a]">{t.title}</span>
                <span className="mt-1 block text-xs text-[#f5ecdf]/70">{soon.includes(t.href) ? "Coming soon" : t.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
