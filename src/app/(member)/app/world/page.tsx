import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMembership } from "@/lib/membership-server";
import { atLeast, LEVEL_LABEL } from "@/lib/membership-level";
import { LuxHero } from "@/components/Lux";

export const metadata = { title: "My World" };
export const dynamic = "force-dynamic";

type Tile = { href: string; title: string; detail: string };

/** My World (founder directive 35 §4): everything that belongs to the member, in one place. Counts are the member's own. */
export default async function MyWorld() {
  const viewer = (await getViewer())!;
  const m = await getMembership(viewer);
  const level = m?.level ?? "free";
  const exec = atLeast(level, "executive");
  const live = !isInsidePreview(viewer) && !viewer.viewAs;
  const db = live ? await createClient() : null;
  const count = async (q: PromiseLike<{ count: number | null }>) => (db ? (await q).count ?? 0 : 0);
  const b = db?.schema("business");
  const head = { count: "exact" as const, head: true };
  const [resumes, businesses, convs, entries, rooms, proposals, funding, research, saved] = db && b ? await Promise.all([
    count(db.from("resumes").select("id", head).eq("user_id", viewer.id)),
    count(db.from("member_businesses").select("id", head).eq("user_id", viewer.id)),
    count(b.from("conversations").select("id", head).in("status", ["requested", "more_info", "accepted"])),
    count(db.from("sanctuary_entries").select("id", head).eq("user_id", viewer.id)),
    exec ? count(b.from("room_participants").select("room_id", head).eq("user_id", viewer.id).eq("status", "active")) : 0,
    exec ? count(b.from("proposals").select("id", head).eq("author_id", viewer.id)) : 0,
    exec ? count(b.from("funding_projects").select("id", head).eq("user_id", viewer.id)) : 0,
    exec ? count(db.from("intel_assignments").select("id", head).eq("user_id", viewer.id)) : 0,
    exec ? count(db.from("intel_findings").select("id", head).eq("saved", true)) : 0,
  ]) : [0, 0, 0, 0, 0, 0, 0, 0, 0];
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const sections: { title: string; tiles: Tile[] }[] = [
    ...(exec ? [{ title: "My projects", tiles: [
      { href: "/app/connect360/rooms", title: "Business Deal Rooms", detail: plural(rooms, "active room", "active rooms") },
      { href: "/app/connect360/proposals", title: "Proposals", detail: plural(proposals, "proposal", "proposals") },
      { href: "/app/connect360/funding", title: "Funding", detail: plural(funding, "project", "projects") },
      { href: "/app/connect360/intelligence", title: "My Intelligence Office", detail: `${plural(research, "assignment", "assignments")} · ${saved} saved` },
    ] }] : []),
    { title: "My professional life", tiles: [
      { href: "/app/career", title: "Résumés", detail: plural(resumes, "résumé or letter", "résumés and letters") },
      { href: "/app/launch", title: "My businesses", detail: plural(businesses, "business", "businesses") },
      { href: "/app/business/inbox", title: "Business conversations", detail: plural(convs, "open conversation", "open conversations") },
    ] },
    { title: "My growth", tiles: [
      { href: "/app/sanctuary", title: "My Daily Sanctuary", detail: plural(entries, "reflection", "reflections") },
      { href: "/app/know-yourself/portfolio", title: "My Discovery Portfolio", detail: "Everything you've discovered" },
      { href: "/app/sanctuary/vision", title: "My Vision Board", detail: "Your goals in sight" },
    ] },
    { title: "My membership and privacy", tiles: [
      { href: "/app/settings", title: "Settings", detail: "Growth reflections, relationship status and preferences" },
      { href: "/app/membership", title: "Membership", detail: LEVEL_LABEL[level] },
      { href: "/app/safety", title: "Safety and privacy", detail: "Blocks, reports and your data" },
      { href: "/app/explore", title: "Everything available to me", detail: "Every service, in one place" },
    ] },
  ];
  return (
    <>
      <LuxHero eyebrow="My World" title={viewer.displayName ? `${viewer.displayName.split(" ")[0]}'s world` : "My World"} tagline="Everything that's yours, in one place." />
      <div className="mt-10 space-y-10">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="display text-2xl">{s.title}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {s.tiles.map((t) => (
                <Link key={t.href} href={t.href} className="glass glass-edge flex flex-col p-5 transition hover:-translate-y-0.5">
                  <span className="display text-xl">{t.title}</span>
                  <span className="mt-1 text-sm text-muted">{t.detail}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
