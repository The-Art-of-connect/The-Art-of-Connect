import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMembership } from "@/lib/membership-server";
import { atLeast } from "@/lib/membership-level";
import { LuxHero, LuxSection } from "@/components/Lux";
import { MemberForm } from "@/components/MemberForm";
import { addWatch, removeWatch, setWatchPaused } from "@/app/actions/radar";
import { VERIFICATION_LABEL, WATCH_FREQUENCY, WATCH_KINDS, mentions, relatedFindings } from "@/lib/radar";

export const metadata = { title: "My Global Watchlist · My Intelligence Office" };
export const dynamic = "force-dynamic";

type WatchRow = { id: string; subject: string | null; subject_kind: string; objective: string; region: string | null; frequency: string; paused: boolean; created_at: string };
type FindingRow = { id: string; assignment_id: string; title: string; detail: string | null; verification: string };
type OppRow = { id: string; title: string; organization: string; summary: string; official_url: string };

const label = "mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-muted";

/**
 * My Global Watchlist (directive 25), inside My Intelligence Office: the companies, topics and people in public roles an Elite
 * member is following, each with the findings from their own research and the Opportunity Radar listings that mention it.
 */
export default async function Watchlist() {
  const viewer = (await getViewer())!;
  const membership = await getMembership(viewer);
  const level = membership?.level ?? "free";
  const elite = level === "elite";
  const live = !isInsidePreview(viewer) && !viewer.viewAs;
  const db = live && elite ? await createClient() : null;
  const [{ data: watch }, { data: findings }, { data: opps }] = db ? await Promise.all([
    db.from("intel_watchlist").select("id, subject, subject_kind, objective, region, frequency, paused, created_at").eq("user_id", viewer.id).order("created_at", { ascending: false }),
    db.from("intel_findings").select("id, assignment_id, title, detail, verification").order("created_at", { ascending: false }).limit(300),
    db.from("radar_opportunities").select("id, title, organization, summary, official_url").eq("status", "published").limit(300),
  ]) : [{ data: [] }, { data: [] }, { data: [] }];

  if (!elite) {
    return (
      <>
        <LuxHero eyebrow="My Intelligence Office" title="My Global Watchlist" />
        <p className="glass mt-8 p-6 text-sm text-muted">
          My Global Watchlist is part of Elite Concierge, which is by invitation and qualification.{" "}
          {atLeast(level, "executive")
            ? <>Your Executive Private membership includes <Link href="/app/connect360/intelligence" className="text-gold underline">My Intelligence Office</Link> and the <Link href="/app/connect360/radar" className="text-gold underline">Opportunity Radar</Link>, where you can follow opportunities that match your interests.</>
            : <><Link href="/membership" className="text-gold underline">Compare memberships</Link>.</>}
        </p>
      </>
    );
  }

  const list = (watch ?? []) as WatchRow[];
  const allFindings = (findings ?? []) as FindingRow[];
  const allOpps = (opps ?? []) as OppRow[];
  return (
    <>
      <LuxHero eyebrow="My Intelligence Office · Elite Concierge" title="My Global Watchlist" tagline="Keep the companies, topics and people that matter to you in view." />
      <p className="mx-auto mt-6 max-w-3xl text-center text-xs text-faint">
        Your watchlist is private to you. Each item shows what your own research has found about it and any Opportunity Radar listing that mentions it.
        Scheduled monitoring by our research partners begins only once the owner activates the Global Intelligence Division; until then, nothing is searched automatically and nothing is invented.
      </p>

      <LuxSection eyebrow="Watching" title={list.length ? `${list.length} on your watchlist` : "Nothing on your watchlist yet"}
        intro={list.length ? undefined : "Add a company or organization, a topic or industry, or a person in a public role. Start with one below."}>
        {list.length > 0 && (
          <ul className="space-y-4">
            {list.map((w) => {
              const related = relatedFindings(allFindings, w);
              const named = w.subject ? allOpps.filter((o) => mentions(`${o.title} ${o.organization} ${o.summary}`, w.subject!)) : [];
              return (
                <li key={w.id} className="glass p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="eyebrow">{WATCH_KINDS[w.subject_kind] ?? "Topic"}{w.region ? ` · ${w.region}` : ""}</p>
                      <h3 className="display mt-1 text-2xl">{w.subject ?? w.objective}</h3>
                      {w.subject && <p className="mt-1 text-sm text-muted">{w.objective}</p>}
                      <p className="mt-2 text-xs text-gold">{w.paused ? "Paused" : `Preferred review: ${(WATCH_FREQUENCY[w.frequency] ?? "Weekly").toLowerCase()}`}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <MemberForm action={setWatchPaused}><input type="hidden" name="id" value={w.id} /><input type="hidden" name="paused" value={w.paused ? "0" : "1"} /><button className="btn btn-ghost btn-sm">{w.paused ? "Resume" : "Pause"}</button></MemberForm>
                      <MemberForm action={removeWatch}><input type="hidden" name="id" value={w.id} /><button className="btn btn-ghost btn-sm" aria-label={`Remove ${w.subject ?? "this item"} from your watchlist`}>Remove</button></MemberForm>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">From your research</p>
                      {related.length ? (
                        <ul className="mt-2 space-y-2 text-sm">{related.slice(0, 5).map((f) => (
                          <li key={f.id}><Link href={`/app/connect360/intelligence/${f.assignment_id}`} className="text-gold underline">{f.title}</Link> <span className="text-xs text-faint">· {VERIFICATION_LABEL[f.verification] ?? f.verification}</span></li>
                        ))}</ul>
                      ) : <p className="mt-2 text-sm text-muted">No findings mention it yet. <Link href="/app/connect360/intelligence" className="text-gold underline">Ask Journey to research it</Link>.</p>}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">On the Opportunity Radar</p>
                      {named.length ? (
                        <ul className="mt-2 space-y-2 text-sm">{named.slice(0, 5).map((o) => (
                          <li key={o.id}><Link href="/app/connect360/radar" className="text-gold underline">{o.title}</Link> <span className="text-xs text-faint">· {o.organization}</span></li>
                        ))}</ul>
                      ) : <p className="mt-2 text-sm text-muted">No current listing mentions it.</p>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </LuxSection>

      <LuxSection eyebrow="Add" title="Watch something new" intro="Use the official name, so your research findings and Opportunity Radar listings can be matched to it.">
        <MemberForm action={addWatch} className="glass max-w-3xl space-y-3 p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm"><span className={label}>What is it?</span>
              <select name="subject_kind" className="field w-full" defaultValue="company">{Object.entries(WATCH_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label className="block text-sm"><span className={label}>Name</span>
              <input name="subject" required minLength={2} maxLength={160} className="field w-full" placeholder="e.g. Example Studios" /></label>
          </div>
          <label className="block text-sm"><span className={label}>What would you like to know?</span>
            <input name="objective" required minLength={5} maxLength={1000} className="field w-full" placeholder="e.g. Casting calls, board openings or new programs" /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm"><span className={label}>Region (optional)</span><input name="region" maxLength={120} className="field w-full" placeholder="e.g. Atlanta, Georgia" /></label>
            <label className="block text-sm"><span className={label}>Preferred review</span>
              <select name="frequency" className="field w-full" defaultValue="weekly">{Object.entries(WATCH_FREQUENCY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          </div>
          <p className="text-xs text-faint">People are watched only in their public roles. Please leave out private contact details.</p>
          <div className="flex"><button className="btn btn-gold btn-sm ml-auto">Add to my watchlist</button></div>
        </MemberForm>
      </LuxSection>
      <p className="mt-10 text-center text-sm"><Link href="/app/connect360/intelligence" className="text-gold underline">Back to My Intelligence Office</Link></p>
    </>
  );
}
