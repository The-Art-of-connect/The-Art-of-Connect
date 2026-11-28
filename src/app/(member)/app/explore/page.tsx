import { GatedLink } from "@/components/Upgrade";
import { needForHref } from "@/lib/gate";
import { NAV } from "@/lib/nav";
import { getNavState } from "@/lib/nav-state";
import { badgeFor, linkFor } from "@/components/nav/linkFor";
import { LuxHero } from "@/components/Lux";

export const metadata = { title: "Everything available to me" };
export const dynamic = "force-dynamic";

/** Every approved page, in one calm place (founder directive 35 §10: reorganize, never remove). */
export default async function Explore() {
  const state = await getNavState();
  return (
    <>
      <LuxHero eyebrow="My World" title="Everything available to me" tagline="Every service, in one place, whenever you want it." />
      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {NAV.filter((g) => g.key !== "home").map((g) => (
          <section key={g.key} className="glass p-6">
            <h2 className="display text-2xl">{g.label}</h2>
            <p className="mt-1 text-xs text-muted">{g.intro}</p>
            <ul className="mt-4 space-y-1">
              {g.links.map((l) => {
                const badge = badgeFor(l, state);
                return (
                  <li key={l.href + l.label}><GatedLink href={linkFor(l, state)} need={needForHref(l.href) ?? (l.access === "paid" ? { level: "one" } : null)} feature={{ name: l.label, what: l.note }} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 text-sm transition hover:bg-champagne/10">
                    <span>{l.label}{l.note && <span className="block text-xs text-muted">{l.note}</span>}</span>
                    {badge && badge !== "Included" && <span className="shrink-0 rounded-full border border-champagne/60 px-2 py-0.5 text-[0.65rem] text-gold-deep">{badge}</span>}
                  </GatedLink></li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
