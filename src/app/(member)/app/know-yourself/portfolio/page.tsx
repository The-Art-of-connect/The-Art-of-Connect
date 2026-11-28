import Link from "next/link";
import { sanctuarySettings } from "@/lib/sanctuary-server";
import { scenarioInsights, type ScenarioOption } from "@/lib/sanctuary";
import { getViewer, hasRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getJourneyStatus } from "@/lib/journey-server";
import { DISCOVERY_CATEGORIES } from "@/lib/journey-discovery";
import { assemblePortfolio, categoryStatuses, type CategoryStatus } from "@/lib/portfolio";
import { loadPortfolioInput } from "@/lib/portfolio-server";
import { createPortfolioWithJourney, savePortfolioSnapshot, toggleSkipCategory } from "@/app/actions/portfolio";
import { saveAnalysisNote } from "@/app/actions/discovery";
import { ActionForm } from "@/components/admin/ActionForm";
import { CopySection, PrintButton } from "@/components/PortfolioTools";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Personal Discovery Portfolio" };

const ICON: Record<string, string> = {
  identity: "M12 3a6 6 0 0 0-6 6v3m12 0V9a6 6 0 0 0-9-5.2M9 9a3 3 0 0 1 6 0v4a8 8 0 0 1-2 5.3M12 12v2a10 10 0 0 1-3 7M6 15a14 14 0 0 0 1 4",
  emotional: "M12 20s-7-4.3-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.7-7 10-7 10Z",
  patterns: "M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0 0 6v1a3 3 0 0 0 6 0V4.5A3 3 0 0 0 9 4Zm6 0a3 3 0 0 1 3 3v1a3 3 0 0 1 0 6v1a3 3 0 0 1-6 0",
  values: "M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Zm-3 9 2 2 4-4",
  relationships: "M12 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm14 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM12 8v4m0 0-5 4m5-4 5 4",
  growth: "M12 21v-9m0 0c0-3 2-5 6-5 0 3-2 5-6 5Zm0 0c0-2.5-1.7-4-5-4 0 2.5 1.7 4 5 4Z",
  action: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm3.5-12.5-2 5-5 2 2-5 5-2Z",
  manifestations: "M4 19h16M7 16a5 5 0 0 1 10 0M12 4v3M5 8l2 2m12-2-2 2",
};
const STATUS: Record<CategoryStatus, { label: string; cls: string }> = {
  completed: { label: "Completed", cls: "border-gold bg-gold/20 text-gold-bright" },
  in_progress: { label: "In progress", cls: "border-gold/40 text-ivory/85" },
  skipped: { label: "Skipped", cls: "border-line-strong text-faint" },
  not_started: { label: "Not started", cls: "border-line text-faint" },
};

export default async function Portfolio() {
  const viewer = (await getViewer())!;
  const supabase = (await createClient())!;
  const [input, status, { data: versions }] = await Promise.all([
    loadPortfolioInput(supabase, viewer.id),
    getJourneyStatus().catch(() => null),
    supabase.from("discovery_analyses").select("id, source, content, member_notes, created_at").eq("user_id", viewer.id).eq("scope", "portfolio").order("created_at", { ascending: false }).limit(20),
  ]);
  const statuses = categoryStatuses(input);
  const sections = assemblePortfolio(input);
  const total = DISCOVERY_CATEGORIES.length;
  const done = Object.values(statuses).filter((s) => s === "completed").length;
  const paid = status?.access === "standard" || status?.access === "enhanced" || (status?.access === "staff" && hasRole(viewer, ["owner"]));
  const credits = status?.allowance ? status.allowance.remaining + status.allowance.purchasedRemaining : null;
  const journeyVersion = (versions ?? []).find((v) => v.source === "journey");
  const date = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const hasAny = sections.some((s) => s.lines.length);
  // My Daily Sanctuary insights appear here only with the member's consent (founder directive 17).
  const [settings, { data: scen }] = await Promise.all([
    sanctuarySettings(viewer.id),
    supabase.from("sanctuary_scenario_answers").select("choice, sanctuary_content(title, options)").eq("user_id", viewer.id),
  ]);
  const insights = settings.share_with_portfolio
    ? scenarioInsights(((scen ?? []) as unknown as { choice: string; sanctuary_content: { title: string | null; options: ScenarioOption[] | null } | null }[])
        .filter((a) => a.sanctuary_content).map((a) => ({ choice: a.choice, content: a.sanctuary_content! })))
    : [];

  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/app/know-yourself" className="text-sm font-semibold text-gold">← The Art of Knowing Yourself</Link>
        <div className="flex flex-wrap gap-2"><PrintButton /></div>
      </div>

      <article className="theme-dark print-light mx-auto max-w-3xl overflow-hidden rounded-[28px] bg-ink px-6 py-10 text-ivory shadow-2xl sm:px-12">
        <p className="text-center text-xs tracking-[0.3em] uppercase text-gold">The Art of Knowing Yourself</p>
        <h1 className="display mt-3 text-center text-4xl text-gold-bright sm:text-5xl">My Personal Discovery Portfolio</h1>
        <p className="mt-3 text-center italic text-ivory/80">Understanding the person behind the answers.</p>
        <div className="mx-auto mt-6 h-px w-full bg-gold/40" />
        <div className="mt-6 flex items-center gap-5">
          <p className="display shrink-0 text-5xl text-gold-bright">{done} of {total}</p>
          <div className="flex-1">
            <p className="text-sm text-ivory/85">Discovery categories completed</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-champagne to-gold-bright" style={{ width: `${Math.round((done / total) * 100)}%` }} /></div>
          </div>
        </div>
        <p className="mt-3 text-xs text-ivory/60">{done < total ? "A preliminary portfolio: it grows as you explore more. Skipped and incomplete categories are simply that, never a mark against you." : "Every category explored. Revisit any time; you keep growing."}</p>
        <div className="mx-auto mt-6 h-px w-full bg-gold/40" />

        {!hasAny && <p className="mt-8 text-center text-ivory/80">Your portfolio will take shape as you explore. Begin with <Link href="/app/know-yourself/identity-self-love" className="text-gold-bright underline">Identity &amp; Self-Love</Link> or <Link href="/app/know-yourself" className="text-gold-bright underline">Who Am I?</Link>.</p>}

        {sections.map((s) => (
          <section key={s.key} className="mt-8 flex gap-4">
            <svg viewBox="0 0 24 24" className="mt-1 h-7 w-7 shrink-0 text-gold" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICON[s.key]} /></svg>
            <div className="flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="display text-2xl text-gold-bright">{s.title}</h2>
                {s.lines.length > 0 && <CopySection text={`${s.title}\n${s.lines.map((l) => l.text).join("\n")}`} />}
              </div>
              <p className="text-sm text-ivory/70">{s.subtitle}</p>
              {s.lines.length ? (
                <ul className="mt-3 space-y-2">
                  {s.lines.map((l, i) => (
                    <li key={i} className="text-sm leading-relaxed text-ivory/90">
                      <span className={`mr-2 inline-block rounded-full border px-2 py-0.5 text-[0.6rem] uppercase tracking-wide ${l.kind === "shared" ? "border-gold/60 text-gold" : "border-line-strong text-ivory/60"}`}>{l.kind === "shared" ? "You shared" : "Reflection"}</span>{l.text}
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-2 text-sm italic text-ivory/50">Not yet explored.</p>}
            </div>
          </section>
        ))}
        <div className="mx-auto mt-10 h-px w-full bg-gold/40" />
        <p className="display mt-6 text-center text-2xl text-gold-bright">Discover. Understand. Become.</p>
        <p className="mt-4 text-center text-xs text-ivory/60">Private to you. Educational and reflective, never a clinical diagnosis or a permanent label. Never shared with matches, partners, business connections or providers, and never used for matchmaking.</p>
      </article>

      <section className="no-print mx-auto mt-10 max-w-4xl">
        <p className="eyebrow">Your discovery categories</p>
        <div className="theme-dark mt-4 grid gap-2 rounded-[24px] bg-ink p-5 sm:grid-cols-2">
          {DISCOVERY_CATEGORIES.map((c) => {
            const st = statuses[c.key];
            return (
              <div key={c.key} className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
                <div>
                  <p className="text-sm text-ivory">{c.title}</p>
                  <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[0.62rem] ${STATUS[st].cls}`}>{STATUS[st].label}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {paid && <Link href={`/app/journey/discover/${c.key}`} className="text-xs text-gold underline-offset-2 hover:underline">{st === "completed" ? "Retake" : st === "in_progress" ? "Resume" : "Explore"}</Link>}
                  {st !== "completed" && (
                    <ActionForm action={toggleSkipCategory}>
                      <input type="hidden" name="category" value={c.key} /><input type="hidden" name="skip" value={st === "skipped" ? "no" : "yes"} />
                      <button className="text-xs text-ivory/60 underline-offset-2 hover:underline">{st === "skipped" ? "Undo skip" : "Skip"}</button>
                    </ActionForm>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="no-print mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-2">
        <div className="glass p-6">
          <p className="eyebrow">Self-guided</p>
          <p className="display mt-2 text-2xl">Save today&rsquo;s portfolio</p>
          <p className="mt-2 text-sm text-muted">Keep a dated version so you can compare how you see yourself over time. No AI, no allowance.</p>
          <ActionForm action={savePortfolioSnapshot} className="mt-4"><button className="btn btn-gold btn-sm" disabled={!hasAny}>Save a dated version</button></ActionForm>
        </div>
        <div className="theme-dark relative overflow-hidden rounded-[24px] bg-ink p-6 text-ivory">
          <p className="eyebrow">With Journey</p>
          <p className="display mt-2 text-2xl text-gold-bright">A personalized portfolio</p>
          {paid ? (
            status?.enabled ? (
              <ActionForm action={createPortfolioWithJourney} className="mt-3 space-y-3">
                <p className="text-sm text-muted">Journey connects themes across your discoveries, in its own words and yours. {credits != null ? <>Included in your membership: {credits >= 9999 ? <>unlimited with your Elite Concierge membership.</> : <>this uses <strong className="text-gold-bright">1</strong> of your {credits} remaining monthly messages.</>}</> : "Owner test: uses your private test budget."} It&rsquo;s written only when you ask, then saved; opening this page never uses your allowance.</p>
                <label className="flex items-start gap-2 text-xs text-ivory/85"><input type="checkbox" name="consent" value="yes" required className="mt-0.5" />I&rsquo;m happy for Journey to read my discoveries to write this. It stays private to me.</label>
                <button className="btn btn-gold btn-sm" disabled={!hasAny && !Object.keys(input.journeySummaries).length}>{journeyVersion ? "Refresh with Journey" : "Create with Journey"}</button>
              </ActionForm>
            ) : <p className="mt-2 text-sm text-muted">Journey is resting right now. Your self-guided portfolio is always here.</p>
          ) : (
            <><p className="mt-2 text-sm text-muted">Journey-written portfolios are included with paid memberships.</p><Link href="/membership" className="btn btn-gold btn-sm mt-4">Explore memberships</Link></>
          )}
        </div>
      </section>

      {versions?.length ? (
        <section className="mx-auto mt-12 max-w-4xl">
          <p className="eyebrow no-print">Your dated versions</p>
          <h2 className="display no-print mt-2 text-3xl">Compare earlier discoveries with how you see yourself now</h2>
          <div className="mt-6 space-y-4">
            {versions.map((v, i) => (
              <details key={v.id} open={i === 0 && v.source === "journey"} className="glass overflow-hidden !p-0">
                <summary className="cursor-pointer px-6 py-4 font-semibold">{date(v.created_at)} · {v.source === "journey" ? "Written with Journey" : "Self-guided version"}</summary>
                <div className="border-t border-line px-6 py-5">
                  {v.source === "journey" && <p className="text-xs text-muted">Sentences beginning &ldquo;You shared&rdquo; reflect your own words; the rest is Journey&rsquo;s educational reflection.</p>}
                  <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{v.content}</div>
                  {v.member_notes && <p className="mt-4 rounded-xl bg-champagne/15 p-3 text-sm"><span className="font-semibold">Your correction: </span>{v.member_notes}</p>}
                  <ActionForm action={saveAnalysisNote} className="no-print mt-4 space-y-2">
                    <input type="hidden" name="id" value={v.id} />
                    <label htmlFor={`pn-${v.id}`} className="text-xs font-semibold text-gold-deep">Correct anything in your own words</label>
                    <textarea id={`pn-${v.id}`} name="notes" defaultValue={v.member_notes ?? ""} rows={2} className="field" />
                    <button className="btn btn-ghost btn-sm">Save my correction</button>
                  </ActionForm>
                </div>
              </details>
            ))}
          </div>
        </section>
      ) : null}
      <section className="no-print mx-auto mt-10 max-w-3xl">
        <p className="eyebrow">From My Daily Sanctuary</p>
        {settings.share_with_portfolio ? (
          insights.length ? (
            <ul className="mt-4 space-y-3">{insights.map((x, i) => <li key={i} className="glass p-5"><p className="text-xs text-gold-deep">{x.title}</p><p className="mt-1 text-sm">{x.insight}</p></li>)}</ul>
          ) : <p className="mt-3 text-sm text-muted">Answer scenarios in <Link href="/app/sanctuary/discover" className="text-gold underline">Self-discovery</Link> to add insights here.</p>
        ) : (
          <p className="mt-3 text-sm text-muted">Your Sanctuary answers stay out of your portfolio until you choose to include them in <Link href="/app/sanctuary/settings" className="text-gold underline">Reminders &amp; privacy</Link>.</p>
        )}
        <p className="mt-3 text-xs text-faint">Educational reflections, not clinical assessments or definitive judgments.</p>
      </section>
    </>
  );
}
