import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LEVEL_LABEL, LEVEL_PROMISE, type Level } from "@/lib/membership-level";
import { ownerStatus, whatsNew } from "@/lib/features";
import { comingSoonPaths } from "@/lib/section-status";
import { LocalTime } from "@/components/LocalTime";

/**
 * The paid-member home (founder directive 20, section 3): conversations, events, connections, messages, goals,
 * benefits and what's new, from the member's own real data only. Nothing is invented or ranked.
 */
export async function PaidHome({ userId, level }: { userId: string; level: Level }) {
  const db = await createClient();
  if (!db) return null;
  const now = new Date().toISOString();
  const [{ data: topics }, { data: rsvps }, { count: connections }, { count: requests }, { data: goals }] = await Promise.all([
    db.from("circle_topics").select("id, title, slot_start, open_hours, closed_at, paused").eq("status", "scheduled").gte("slot_start", new Date(Date.now() - 24 * 3600_000).toISOString()).order("slot_start").limit(8),
    db.from("social_event_rsvps").select("status, social_events!inner(id, title, starts_at, status)").eq("user_id", userId).in("status", ["interested", "attending"]).gte("social_events.starts_at", now).eq("social_events.status", "active").limit(4),
    db.from("social_connections").select("id", { count: "exact", head: true }).eq("status", "accepted").or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
    db.from("social_connections").select("id", { count: "exact", head: true }).eq("status", "pending").eq("addressee_id", userId),
    db.from("becoming_goals").select("status").eq("user_id", userId),
  ]);
  const t = (topics ?? []).filter((x) => !x.closed_at && Date.parse(x.slot_start!) + x.open_hours * 3600_000 > Date.now()).slice(0, 4);
  const events = ((rsvps ?? []) as unknown as { status: string; social_events: { id: string; title: string; starts_at: string } }[]).map((r) => ({ ...r.social_events, rsvp: r.status }));
  const activeGoals = (goals ?? []).filter((g) => g.status === "active").length, achieved = (goals ?? []).filter((g) => g.status === "achieved").length;
  const soon = await comingSoonPaths();
  const news = whatsNew().map((f) => ownerStatus(f, soon)).filter((f) => f.status === "available").slice(0, 3);
  const Card = ({ title, href, children, cta }: { title: string; href: string; children: React.ReactNode; cta: string }) => (
    <div className="glass flex flex-col p-6"><p className="eyebrow">{title}</p><div className="mt-3 flex-1 text-sm">{children}</div><Link href={href} className="mt-4 text-sm text-gold underline">{cta}</Link></div>
  );
  return (
    <section aria-labelledby="your-membership" className="mt-14">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div><p className="eyebrow">{LEVEL_LABEL[level]}</p><h2 id="your-membership" className="display mt-2 text-4xl">{LEVEL_PROMISE[level]}</h2></div>
        <Link href="/what-we-offer" className="text-sm text-gold underline">Everything your membership includes →</Link>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card title="Conversations" href="/app/circle" cta="Open The Becoming Circle">
          {t.length ? <ul className="space-y-2">{t.map((x) => <li key={x.id}><Link href={`/app/circle/${x.id}`} className="font-semibold hover:underline">{x.title}</Link><span className="block text-xs text-muted">{Date.parse(x.slot_start!) <= Date.now() ? "Open now" : <>Begins <LocalTime iso={x.slot_start!} /></>}</span></li>)}</ul> : <p className="text-muted">New conversations appear every four hours.</p>}
        </Card>
        <Card title="My upcoming events" href="/app/connect/events" cta="The Connect Calendar">
          {events.length ? <ul className="space-y-2">{events.map((e) => <li key={e.id}><Link href={`/app/connect/events/${e.id}`} className="font-semibold hover:underline">{e.title}</Link><span className="block text-xs text-muted"><LocalTime iso={e.starts_at} /> · {e.rsvp === "attending" ? "Attending" : "Interested"}</span></li>)}</ul> : <p className="text-muted">You haven&rsquo;t saved any upcoming events yet.</p>}
        </Card>
        <Card title="Connections" href="/app/connect/people" cta="Find People Like Me">
          <p><span className="display text-3xl">{connections ?? 0}</span> <span className="text-muted">mutual connection{connections === 1 ? "" : "s"}</span></p>
          {(requests ?? 0) > 0 && <p className="mt-2"><Link href="/app/connect/people" className="text-gold underline">{requests} connection request{requests === 1 ? "" : "s"} waiting for you</Link></p>}
          <p className="mt-2"><Link href="/app/connect/messages" className="text-muted underline">Private messages</Link></p>
        </Card>
        <Card title="Journey" href="/app/journey" cta="Talk with Journey">
          <p className="text-muted">Plan your goals, prepare for a conversation or explore what&rsquo;s right for you. Journey is an AI companion, not a licensed professional.</p>
        </Card>
        <Card title="My goals" href="/app/sanctuary/becoming" cta="Who Am I Becoming?">
          {activeGoals + achieved ? <p><span className="display text-3xl">{activeGoals}</span> <span className="text-muted">active goal{activeGoals === 1 ? "" : "s"}</span>{achieved ? <span className="text-muted"> · {achieved} achieved</span> : null}</p> : <p className="text-muted">Set one-, five- and ten-year goals for the person you&rsquo;re becoming.</p>}
        </Card>
        <Card title="What's new" href="/what-we-offer" cta="See everything">
          <ul className="space-y-1">{news.map((f) => <li key={f.key}><span className="font-semibold">{f.name}</span></li>)}</ul>
        </Card>
      </div>
    </section>
  );
}
