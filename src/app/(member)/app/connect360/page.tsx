import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMembership } from "@/lib/membership-server";
import { atLeast } from "@/lib/membership-level";
import { LuxHero, LuxSection } from "@/components/Lux";

export const metadata = { title: "CONNECT 360" };
export const dynamic = "force-dynamic";

type Card = { href: string | null; eyebrow: string; title: string; body: string; status?: string };

/** CONNECT 360 home for Executive Private and Elite Concierge members (founder directives 24–34). */
export default async function Connect360() {
  const viewer = (await getViewer())!;
  const membership = await getMembership(viewer);
  const premium = membership ? atLeast(membership.level, "executive") : false;
  const live = !isInsidePreview(viewer) && !viewer.viewAs;
  const db = await createClient();
  const b = db?.schema("business");
  const [{ data: rooms }, { data: ready }, { data: requests }, { data: apps }] = live && b && db ? await Promise.all([
    b.from("room_participants").select("room_id, status").eq("user_id", viewer.id).in("status", ["invited", "active"]),
    db.rpc("professional_ready", { p: viewer.id }),
    b.from("conversations").select("id").neq("kind", "connection").eq("recipient_id", viewer.id).in("status", ["requested", "more_info"]),
    db.from("member_applications").select("status, deadline").eq("user_id", viewer.id).in("status", ["preparing", "submitted", "in_review"]),
  ]) : [{ data: [] }, { data: false }, { data: [] }, { data: [] }];
  const openApps = apps ?? [];
  const soon = openApps.filter((a) => a.status === "preparing" && a.deadline && a.deadline >= new Date().toISOString().slice(0, 10) && a.deadline <= new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)).length;
  const invited = (rooms ?? []).filter((r) => r.status === "invited").length;
  const active = (rooms ?? []).filter((r) => r.status === "active").length;

  const cards: Card[] = [
    { href: "/app/connect360/rooms", eyebrow: "Private workspaces", title: "Business Deal Rooms", body: "Confidential project spaces with your collaborators and each party's own attorney, accountant and advisors: plan, discuss, share documents and track progress.", status: `${active} active${invited ? ` · ${invited} invitation${invited > 1 ? "s" : ""}` : ""}` },
    { href: "/app/connect360/collaborate", eyebrow: "Professional collaboration", title: "Find collaborators", body: "Share what you're open to, and discover business owners who welcome operational partnerships, acquisitions, expansion, board and leadership conversations.", status: requests?.length ? `${requests.length} request${requests.length > 1 ? "s" : ""} waiting` : undefined },
    { href: "/app/business/inbox", eyebrow: "Separate from social messages", title: "Business Collaboration Inbox", body: "Purpose-specific requests you can accept to discuss, decline, or ask about first. Accepting a discussion is never an agreement." },
    { href: "/app/career", eyebrow: "Professional readiness", title: "My Professional Readiness", body: "An approved résumé is needed before introductions are made on your behalf. Everything else stays open while you prepare it.", status: ready ? "Résumé approved" : "Résumé needed for introductions" },
    { href: "/app/connect360/proposals", eyebrow: "Present your vision", title: "Strategic Proposal Builder", body: "Guided, versioned proposals that label every section as fact, research, assumption, estimate or proposal. Clearly nonbinding, and shared only when you authorize them." },
    { href: "/app/connect360/funding", eyebrow: "Become funding-ready", title: "Capital & Funding Intelligence Center", body: "Funding assessments, capital scenarios with estimated payments, readiness checklists, application tracking and lender message drafts. Declared, verified, approved and committed funds always kept separate." },
    { href: "/app/connect360/intelligence", eyebrow: "Journey, your Director of Intelligence", title: "My Intelligence Office", body: "Research assignments planned by Journey and carried out by our research partners: cited findings labeled by how well they're verified, and a report. Private to you." },
    { href: "/app/connect360/radar", eyebrow: "Discover", title: "Opportunity Radar", body: "Opportunities confirmed at their official source, matched to your interests once you turn matching on, alongside what your own research found. Save, dismiss or start an application." },
    { href: "/app/connect360/applications", eyebrow: "Prepare and track", title: "Application Center", body: "Every application in one place: a status pipeline, deadlines with reminders, a documents checklist, private notes and your approved résumé.", status: openApps.length ? `${openApps.length} open${soon ? ` · ${soon} due within a week` : ""}` : undefined },
    ...(membership?.level === "elite" ? [{ href: "/app/connect360/intelligence/watchlist", eyebrow: "Elite Concierge", title: "My Global Watchlist", body: "Follow companies, topics and people in public roles, with what your research and the Opportunity Radar show about each." }] : []),
  ];

  return (
    <>
      <LuxHero eyebrow="Global Intelligence Division" title="CONNECT 360" tagline="Discover. Prepare. Collaborate. Advance." />
      {!premium && (
        <p className="glass mt-8 p-6 text-sm text-muted">CONNECT 360 is part of Executive Private and Elite Concierge. <Link href="/membership" className="text-gold underline">Compare memberships</Link>. If you&apos;ve been invited to a Business Deal Room as a professional advisor, open the private link you were sent.</p>
      )}
      <LuxSection eyebrow="Your office" title="Everything in one place">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((c) => {
            const inner = (
              <>
                <p className="eyebrow">{c.eyebrow}</p>
                <h2 className="display mt-2 text-2xl">{c.title}</h2>
                <p className="mt-2 flex-1 text-sm text-muted">{c.body}</p>
                {c.status && <p className="mt-4 text-xs text-gold">{c.status}</p>}
                {!c.href && <span className="chip chip-locked mt-4 w-fit">In development</span>}
              </>
            );
            return c.href && premium
              ? <Link key={c.title} href={c.href} className="glass glass-edge flex flex-col p-6 transition hover:-translate-y-0.5">{inner}</Link>
              : <div key={c.title} className="glass flex flex-col p-6 opacity-90">{inner}</div>;
          })}
        </div>
      </LuxSection>
      <p className="mt-10 text-center text-xs text-faint">The Art of Connect provides networking, education and organization tools. It is not a lender, broker, securities exchange or law firm, and nothing here is a binding agreement.</p>
    </>
  );
}
