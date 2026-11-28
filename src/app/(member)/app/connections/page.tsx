import { GatedLink } from "@/components/Upgrade";
import Image from "next/image";
import { getViewer } from "@/lib/auth";
import { getMembership } from "@/lib/membership-server";
import { atLeast } from "@/lib/membership-level";
import { LuxHero } from "@/components/Lux";

export const metadata = { title: "Connect" };
export const dynamic = "force-dynamic";

/** Connect (founder directive 35): the ways to meet people, in one place. Each door opens what the membership includes. */
export default async function Connect() {
  const viewer = (await getViewer())!;
  const m = await getMembership(viewer);
  const level = m?.level ?? "free";
  const love = viewer.experiences.includes("relationships"), business = viewer.experiences.includes("business");
  const doors = [
    { title: "Find my people", line: "Friendships, circles and shared experiences.", href: "/app/connect", need: love || business ? null : { level: "one" as const }, img: "/images/library/life/moroccan-lounge.webp", locked: !(love || business) },
    { title: "In Love", line: "Singles and couples, with intention.", href: "/app/relationships", need: undefined, img: "/images/in-love.webp", locked: !love },
    { title: "In Business", line: "Business owners, mentors and The Professional Society.", href: "/app/business", need: undefined, img: "/images/in-business.webp", locked: !business },
    { title: "CONNECT 360", line: "Collaborators, Business Deal Rooms, proposals, funding and My Intelligence Office.", href: "/app/connect360", need: undefined, img: "/images/library/business/advisory-lounge.webp", locked: !atLeast(level, "executive") },
    { title: "Today's conversation", line: "The Becoming Circle, open to every account.", href: "/app/circle", need: null, img: "/images/library/life/garden-walk.webp", locked: false },
  ];
  return (
    <>
      <LuxHero eyebrow="Connect" title="Find your people." tagline="Meaningful connection, in life, in love and in business." />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {doors.map((d) => (
          <GatedLink key={d.title} href={d.href} need={d.need} feature={{ name: d.title, what: d.line }} className="group overflow-hidden rounded-[1.75rem] border border-line bg-[var(--surface,#fffdf8)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="relative aspect-[16/9] overflow-hidden"><Image src={d.img} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-700 group-hover:scale-[1.03]" /></div>
            <div className="p-5"><p className="display text-2xl">{d.title}</p><p className="mt-1 text-sm text-muted">{d.line}</p>{d.locked && level !== "elite" && <p className="mt-2 text-xs text-gold-deep">Available with a membership upgrade</p>}</div>
          </GatedLink>
        ))}
      </div>
    </>
  );
}
