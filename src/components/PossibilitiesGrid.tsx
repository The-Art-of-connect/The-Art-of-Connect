import Link from "next/link";

type Tile = { title: string; href: string; icon: string; free?: boolean; needs?: "paid" | "executive"; soon?: boolean; locked?: string };

const TILES: Tile[] = [
  { title: "The Art of Self", href: "/app/know-yourself", icon: "❀", free: true },
  { title: "My Future Self", href: "/app/sanctuary/becoming", icon: "◎", free: true },
  { title: "The Becoming Circle", href: "/app/circle", icon: "◌◌", free: true },
  { title: "My Daily Sanctuary", href: "/app/sanctuary", icon: "✎", free: true },
  { title: "Professional Society", href: "/app/business", icon: "▭", needs: "paid", locked: "business" },
  { title: "Personal Society", href: "/app/relationships", icon: "♡", needs: "paid", locked: "relationships" },
  { title: "Couples Connection", href: "/app/relationships", icon: "♥", needs: "paid", locked: "relationships" },
  { title: "Find People Like Me", href: "/app/connect/people", icon: "◇", needs: "paid", locked: "connect" },
  { title: "Travel Connections", href: "/app/connect/circles", icon: "✈", needs: "paid", locked: "connect" },
  { title: "Connect Calendar", href: "/app/connect/events", icon: "▦", needs: "paid", locked: "connect" },
  { title: "Discussion Lounges", href: "/app/circle", icon: "❝", needs: "paid", soon: true, locked: "connect" },
  { title: "Talk with Journey", href: "/app/journey", icon: "✦", needs: "paid", locked: "journey" },
  { title: "Private Meeting Suite", href: "/elite", icon: "♛", needs: "executive", soon: true },
];

/**
 * "Your world of possibilities" (directive 19, section 21): complimentary experiences, plus elegant greyed-out previews
 * of paid experiences. Selecting a locked one explains its membership and the 15-day trial. Nothing private is shown.
 */
export function PossibilitiesGrid({ paid, executive = false }: { paid: boolean; executive?: boolean }) {
  return (
    <section aria-labelledby="possibilities" className="rounded-[28px] bg-ivory/60 p-6 sm:p-8">
      <p className="eyebrow">My Art of Connect</p>
      <h2 id="possibilities" className="display mt-2 text-4xl">Your world of possibilities.</h2>
      <p className="mt-1 text-sm text-muted">{paid ? "Everything your membership includes, and what's coming next." : "Complimentary membership"}</p>
      <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {TILES.map((t) => {
          const open = t.free || (t.needs === "paid" && paid) || (t.needs === "executive" && executive);
          const href = open ? (t.soon ? "#" : t.href) : t.needs === "executive" ? "/membership#compare" : `/app/membership?locked=${t.locked}`;
          return (
            <li key={t.title}>
              <Link href={href} aria-disabled={open && t.soon ? true : undefined}
                className={`flex h-full flex-col rounded-2xl border p-4 transition ${open ? "border-champagne/70 bg-white hover:border-gold" : "border-transparent bg-stone-200/60 text-muted hover:bg-stone-200"}`}>
                <span className="flex items-start justify-between"><span aria-hidden="true" className={open ? "text-gold" : "text-faint"}>{t.icon}</span>{!open && <span aria-label="Locked" className="text-xs text-faint">🔒</span>}</span>
                <span className={`mt-3 text-lg ${open ? "text-text" : ""}`}>{t.title}</span>
                <span className={`mt-1 text-xs ${open ? "text-gold-deep" : "text-faint"}`}>{t.free ? "Complimentary" : open ? (t.soon ? "Coming soon" : "Included") : t.needs === "executive" ? "Executive & Elite" : "Explore membership benefits"}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
