import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadFeed } from "@/lib/social-server";
import { Composer, PostCard } from "@/components/social/ui";
import { EliteBadge } from "@/components/EliteBadge";
import { EliteExperienceIcon } from "@/components/EliteIcons";

export const metadata = { title: "Your world. Your connections." };

const SHORTCUTS = [
  { href: "/app/connect/profile", label: "My Story", icon: "plus" },
  { href: "/app/connect/circles?category=business", label: "Business", icon: "briefcase" },
  { href: "/app/connect/circles?category=life", label: "Life", icon: "sparkle" },
  { href: "/app/connect/circles?category=couples", label: "Love", icon: "heart" },
  { href: "/app/connect/circles?category=elite", label: "Elite", icon: "elite" },
] as const;
const FILTERS = [["all", "Everything"], ["connections", "My connections"], ["circles", "My circles"], ["saved", "Saved"]] as const;

/** Home of the social ecosystem: the Connection Feed. Chronological; no outrage or popularity ranking. */
export default async function ConnectHome({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const viewer = (await getViewer())!;
  const preview = isInsidePreview(viewer) || Boolean(viewer.viewAs);
  const requested = (await searchParams).filter;
  const filter = (FILTERS.find(([k]) => k === requested)?.[0] ?? "all") as "all" | "connections" | "circles" | "saved";
  const db = (await createClient())!;
  const [{ data: myCircles }, { data: profile }, feed] = await Promise.all([
    preview ? Promise.resolve({ data: [] }) : db.from("social_circle_members").select("circle_id, social_circles(id, name)").eq("user_id", viewer.id),
    preview ? Promise.resolve({ data: null }) : db.from("social_profiles").select("user_id").eq("user_id", viewer.id).maybeSingle(),
    preview ? Promise.resolve(null) : loadFeed(db, viewer.id, { filter }),
  ]);
  const circles = ((myCircles ?? []) as unknown as { social_circles: { id: string; name: string } | null }[]).map((m) => m.social_circles).filter(Boolean) as { id: string; name: string }[];

  return (
    <div className="space-y-6">
      <section>
        <h1 className="display text-4xl sm:text-5xl">Your world. Your connections.</h1>
        <p className="display mt-1 text-xl italic text-gold-deep">Make today meaningful.</p>
        <ul className="mt-6 grid grid-cols-5 gap-2 text-center">
          {SHORTCUTS.map((s) => (
            <li key={s.label}>
              <Link href={s.href} className="group flex flex-col items-center gap-2 text-xs sm:text-sm">
                <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-gold/60 text-gold-deep transition group-hover:border-[#e8701a] sm:h-16 sm:w-16">
                  {s.icon === "plus" ? <span className="text-2xl leading-none">+</span> : s.icon === "elite" ? <EliteBadge size={24} interactive={false} /> : <EliteExperienceIcon kind={s.icon} />}
                </span>
                {s.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {preview ? (
        <p className="rounded-2xl border border-gold/40 bg-gold/10 p-4 text-sm text-gold-deep">Preview: sign in with your own account (or a test account in an owner testing session) to post and connect.</p>
      ) : (
        <>
          {!profile && (
            <Link href="/app/connect/profile" className="block rounded-2xl border border-[#e8701a]/50 bg-[#e8701a]/5 p-4 text-sm">
              <span className="font-semibold">Begin with your story.</span> Add a photograph and your interests so the right people and circles can find you. You choose what&rsquo;s visible. →
            </Link>
          )}
          <Composer circles={circles} />
        </>
      )}

      <section className="theme-dark rounded-[28px] p-6" style={{ background: "#241a15" }}>
        <p className="text-[0.7rem] uppercase tracking-[0.2em] text-[#f0c98a]">Your daily Journey</p>
        <p className="display mt-2 text-3xl text-[#f6e7c8]">Who are you becoming?</p>
        <p className="mt-2 text-sm text-[#f5ecdf]/80">Today is an opportunity to become more intentional about the life you&rsquo;re creating.</p>
        <Link href="/app/journey" className="btn btn-gold mt-4 w-full sm:w-auto">Talk to Journey</Link>
      </section>

      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Feed filter">
        {FILTERS.map(([k, v]) => <Link key={k} href={k === "all" ? "/app/connect" : `/app/connect?filter=${k}`} className={`rounded-full border px-3 py-1 ${filter === k ? "border-gold bg-gold/10 font-semibold" : "border-line"}`}>{v}</Link>)}
      </nav>

      {feed && feed.posts.length === 0 && (
        <div className="glass p-8 text-center">
          <p className="display text-2xl">{filter === "all" ? "Be among the first to share." : "Nothing here yet."}</p>
          <p className="mt-2 text-sm text-muted">Join a few <Link href="/app/connect/circles" className="text-gold underline">circles</Link>, find <Link href="/app/connect/people" className="text-gold underline">people like you</Link>, or share an <Link href="/app/connect/events/new" className="text-gold underline">event</Link>.</p>
        </div>
      )}
      {feed && <div className="space-y-5">{feed.posts.map((p) => <PostCard key={p.id} post={p} feed={feed} viewerId={viewer.id} />)}</div>}
    </div>
  );
}
