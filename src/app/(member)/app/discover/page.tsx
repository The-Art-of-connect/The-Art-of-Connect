import Link from "next/link";
import { getViewer, hasPaidAccess, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { discoverState } from "@/lib/sanctuary-server";
import { connectHighlights } from "@/lib/connect-previews";
import { formatWhen } from "@/lib/webinars";
import { INTEREST_LABEL } from "@/lib/social";
import { LuxHero, LuxSection, Notice } from "@/components/Lux";
import { ReadinessCard } from "@/components/ReadinessCard";

export const metadata = { title: "Discover What’s Possible" };
export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  event: "Upcoming event", discussion: "Discussion", circle: "Circle", webinar: "Webinar", "business-topic": "Business topic",
  travel: "Travel", singles: "Singles", couples: "Couples", friendship: "Friendship", elite: "Elite",
};

/**
 * Discover What's Possible (founder directive 18): part of The Art of Becoming dashboard. Personalized with standard,
 * preference-based rules from the member's own authorized choices (no AI). Shows genuine, approved previews only and
 * never unlocks paid features, exposes members or implies matches exist.
 */
export default async function DiscoverWhatsPossible() {
  const viewer = (await getViewer())!;
  const db = await createClient();
  const paid = hasPaidAccess(viewer);
  const [state, { data: trialOpen }] = await Promise.all([
    discoverState(viewer.id, viewer.society ?? null),
    !isInsidePreview(viewer) && db ? db.rpc("trial_available", { p: viewer.id }) : Promise.resolve({ data: true }),
  ]);
  const highlights = await connectHighlights(state.settings.explore_interests);
  const cta = trialOpen ? "Start a 15-day trial" : "Choose a membership";
  return (
    <>
      <LuxHero eyebrow="The Art of Becoming" title="Discover What’s Possible" tagline="Who could you meet? What could you learn? What could you experience together?" />
      {paid && <p className="mb-8 rounded-2xl border border-gold/40 bg-gold/5 p-4 text-sm">Your membership already includes these experiences. <Link href="/app/connect" className="text-gold underline">Go to Connect</Link></p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div>
          <LuxSection eyebrow="For you" title={state.opportunities.length ? "Opportunities that match what you’ve shared" : "Your suggestions will grow with you"}
            intro={state.opportunities.length ? "Based only on what you chose to share. These are areas to explore, not matches; we never suggest that compatible people have been identified." : undefined}>
            {state.opportunities.length ? (
              <ul className="grid gap-4 md:grid-cols-2">
                {state.opportunities.map((o) => (
                  <li key={o.key} className="glass flex flex-col p-6">
                    <p className="display text-2xl">{o.title}</p>
                    <p className="mt-2 flex-1 text-sm text-muted">{o.body}</p>
                    <p className="mt-3 text-xs text-faint">Why you&rsquo;re seeing this: {o.why.join(" and ")}.</p>
                    <p className="mt-1 text-xs text-gold-deep">Included with {o.membership}</p>
                    <Link href={o.href} className="mt-4 text-sm text-gold underline">Learn more</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="glass p-6 text-sm text-muted">
                <p>Completing a few more discovery activities will make these suggestions more relevant. Choose what you&rsquo;d like to explore and answer a few scenarios in <Link href="/app/sanctuary/discover" className="text-gold underline">Self-discovery</Link>.</p>
                <p className="mt-2">You can still explore every membership now, in any order: <Link href="/membership" className="text-gold underline">see all memberships</Link>.</p>
              </div>
            )}
          </LuxSection>

          <LuxSection eyebrow="What’s Happening Inside Connect" title="A look inside" intro="Approved previews of real community activity. Member profiles, conversations and photographs stay private.">
            {highlights.previews.length > 0 && (
              <ul className="grid gap-4 md:grid-cols-2">
                {highlights.previews.map((p) => (
                  <li key={p.id} className="glass p-6">
                    <p className="text-xs uppercase tracking-[0.2em] text-gold-deep">{KIND_LABEL[p.kind] ?? p.kind}{p.starts_at ? ` · ${new Date(p.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}</p>
                    <p className="display mt-2 text-xl">{p.title}</p>
                    <p className="mt-2 text-sm text-muted">{p.summary}</p>
                  </li>
                ))}
              </ul>
            )}
            {highlights.webinars.length > 0 && (
              <div className="mt-6"><p className="text-xs uppercase tracking-[0.2em] text-gold-deep">Upcoming webinars</p>
                <ul className="mt-3 grid gap-3 md:grid-cols-3">{highlights.webinars.map((w) => (
                  <li key={w.id}><Link href={`/webinars/${w.id}`} className="glass block p-5 hover:border-gold"><span className="block font-semibold">{w.title}</span><span className="mt-1 block text-xs text-muted">{(({ date, time }) => `${date} · ${time}`)(formatWhen(w.starts_at, w.time_zone))}</span></Link></li>
                ))}</ul></div>
            )}
            {highlights.circles.length > 0 && (
              <div className="mt-6"><p className="text-xs uppercase tracking-[0.2em] text-gold-deep">Circles you could join</p>
                <ul className="mt-3 grid gap-3 md:grid-cols-3">{highlights.circles.map((c) => (
                  <li key={c.slug} className="glass p-5"><span className="block font-semibold">{c.name}</span>
                    {c.description && <span className="mt-1 line-clamp-3 block text-xs text-muted">{c.description}</span>}
                    {c.interests.length > 0 && <span className="mt-2 block text-[0.7rem] text-faint">{c.interests.slice(0, 3).map((i) => INTEREST_LABEL[i] ?? i).join(" · ")}</span>}
                    {c.members_band && <span className="mt-1 block text-[0.7rem] text-gold-deep">{c.members_band}</span>}</li>
                ))}</ul></div>
            )}
            {!highlights.previews.length && !highlights.webinars.length && !highlights.circles.length && (
              <p className="glass p-6 text-sm text-muted">Previews will appear here as our community grows. We only ever show genuine activity.</p>
            )}
          </LuxSection>
        </div>

        <aside className="space-y-5 lg:pt-10">
          <ReadinessCard r={state.readiness} />
          {!paid && (
            <div className="theme-dark rounded-[1.5rem] p-6" style={{ background: "var(--ink)" }}>
              <p className="display text-2xl text-gold-bright">Ready when you are</p>
              <p className="mt-2 text-sm text-ivory/80">{trialOpen ? "Try any membership except Elite free for 15 days. A card is required; cancel before the trial ends and you won’t be charged." : "Choose the membership that fits you."} Your Art of Becoming stays free either way.</p>
              <Link href="/app/onboarding" className="btn btn-gold mt-4 w-full">{cta}</Link>
              <Link href="/membership" className="btn btn-ghost mt-2 w-full">Compare memberships</Link>
            </div>
          )}
          <p className="text-sm"><Link href="/app/sanctuary" className="text-gold underline">Back to My Daily Sanctuary</Link></p>
        </aside>
      </div>
      <Notice>Suggestions use only what you chose to share and simple, explainable rules. No AI is used, no other member&rsquo;s private information is shown, and nothing here is a match or a guarantee.</Notice>
    </>
  );
}
