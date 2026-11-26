import Link from "next/link";
import { journeyClosedReason } from "@/lib/journey-guide-access";
import { notFound } from "next/navigation";
import { getViewer, hasRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getJourneyStatus } from "@/lib/journey-server";
import { discoveryCategory, discoveryMode, OPENING } from "@/lib/journey-discovery";
import { endDiscovery, saveAnalysisNote, startDiscovery } from "@/app/actions/discovery";
import { ActionForm } from "@/components/admin/ActionForm";
import { DiscoveryChat } from "@/components/DiscoveryChat";

export const dynamic = "force-dynamic";
export const metadata = { title: "Discovery Session" };

export default async function DiscoverySession({ params }: { params: Promise<{ category: string }> }) {
  const c = discoveryCategory((await params).category);
  if (!c) notFound();
  const viewer = (await getViewer())!;
  const status = await getJourneyStatus();
  const ownerTest = status.access === "staff" && hasRole(viewer, ["owner"]);
  const paid = status.access === "standard" || status.access === "enhanced" || ownerTest;
  const supabase = (await createClient())!;
  const [{ data: session }, { data: analyses }] = await Promise.all([
    supabase.from("journey_discovery_sessions").select("id, conversation_id").eq("user_id", viewer.id).eq("category", c.key).eq("status", "active").maybeSingle(),
    supabase.from("discovery_analyses").select("id, content, member_notes, created_at").eq("user_id", viewer.id).eq("scope", `category:${c.key}`).order("created_at", { ascending: false }).limit(10),
  ]);
  const { data: msgs } = session?.conversation_id
    ? await supabase.from("journey_messages").select("role, content").eq("conversation_id", session.conversation_id).order("created_at", { ascending: true }).limit(200)
    : { data: [] };
  const history = (msgs ?? []).map((m) => ({ role: (m.role === "journey" ? "journey" : "member") as "journey" | "member", text: m.content }));
  const available = status.enabled && paid;
  const closedReason = await journeyClosedReason();
  const date = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <>
      <Link href="/app/journey/discover" className="text-sm font-semibold text-gold">← All discovery sessions</Link>
      <h1 className="display mt-4 text-4xl sm:text-5xl">{c.title}</h1>
      <p className="mt-2 max-w-2xl text-muted">{c.intro}</p>
      {paid && <Link href={`/app/journey/voice?discover=${c.key}`} className="btn btn-gold btn-sm mt-4">Prefer to talk? Start a live session</Link>}

      <div className="mt-8">
        {session ? (
          <DiscoveryChat sessionId={session.id} mode={discoveryMode(c.key)} opening={OPENING(c.title)} history={history}
            allowance={status.allowance} available={available} ownerTest={ownerTest}
            reason={!paid ? "Adaptive discovery with Journey is included with paid memberships." : closedReason}
            endForm={<ActionForm action={endDiscovery}><input type="hidden" name="id" value={session.id} /><button className="text-xs text-muted underline">End this session without a summary</button></ActionForm>} />
        ) : paid ? (
          <form action={startDiscovery} className="glass flex flex-wrap items-center justify-between gap-4 p-6">
            <input type="hidden" name="category" value={c.key} />
            <p className="text-sm text-muted">Begin a new private session. Opening a session never uses your allowance.</p>
            <button className="btn btn-gold">{analyses?.length ? "Begin a new session" : "Begin my discovery"}</button>
          </form>
        ) : (
          <div className="glass p-6 text-sm text-muted">Adaptive discovery with Journey is included with paid memberships. <Link href="/membership" className="text-burgundy">Explore memberships</Link></div>
        )}
      </div>

      {analyses?.length ? (
        <section className="mt-12">
          <p className="eyebrow">Your summaries</p>
          <h2 className="display mt-2 text-3xl">Saved privately, dated so you can see how you grow</h2>
          <div className="mt-6 space-y-5">
            {analyses.map((a, i) => (
              <details key={a.id} open={i === 0} className="glass overflow-hidden !p-0">
                <summary className="cursor-pointer px-6 py-4 font-semibold">{i === 0 ? "Latest" : "Earlier"} summary · {date(a.created_at)}</summary>
                <div className="border-t border-line px-6 py-5">
                  <p className="text-xs text-muted">Written by Journey from what you shared. Sentences beginning &ldquo;You shared&rdquo; are your own words; the rest is Journey&rsquo;s educational reflection.</p>
                  <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{a.content}</div>
                  <ActionForm action={saveAnalysisNote} className="mt-5 space-y-2">
                    <input type="hidden" name="id" value={a.id} />
                    <label className="text-xs font-semibold text-gold-deep" htmlFor={`n-${a.id}`}>Something not quite right? Correct it in your own words</label>
                    <textarea id={`n-${a.id}`} name="notes" defaultValue={a.member_notes ?? ""} rows={2} className="field" />
                    <button className="btn btn-ghost btn-sm">Save my correction</button>
                  </ActionForm>
                </div>
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
