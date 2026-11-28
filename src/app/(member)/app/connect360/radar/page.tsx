import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMembership } from "@/lib/membership-server";
import { atLeast } from "@/lib/membership-level";
import { LuxHero, LuxSection } from "@/components/Lux";
import { MemberForm } from "@/components/MemberForm";
import { createApplication, markRadarItem, saveRadarPrefs } from "@/app/actions/radar";
import { OPPORTUNITY_KINDS, RADAR_FINDING_KINDS, VERIFICATION_LABEL, deadlineLabel, matchOpportunities, type Opportunity, type RadarPrefs } from "@/lib/radar";

export const metadata = { title: "Opportunity Radar · CONNECT 360" };
export const dynamic = "force-dynamic";

type Opp = Opportunity & { official_url: string; verified_on: string };
type Finding = { id: string; assignment_id: string; kind: string; title: string; detail: string | null; verification: string; intel_sources: { url: string }[] };
type Mark = { source: string; item_id: string; state: string };

/** Hidden fields that start an Application Center entry from a real listing or finding. */
function StartApplication({ fields, label = "Start an application" }: { fields: Record<string, string | null>; label?: string }) {
  return (
    <MemberForm action={createApplication}>
      {Object.entries(fields).map(([k, v]) => v ? <input key={k} type="hidden" name={k} value={v} /> : null)}
      <button className="btn btn-gold btn-sm">{label}</button>
    </MemberForm>
  );
}
function MarkButton({ source, item, state, children }: { source: string; item: string; state: string; children: React.ReactNode }) {
  return (
    <MemberForm action={markRadarItem}>
      <input type="hidden" name="source" value={source} /><input type="hidden" name="item" value={item} /><input type="hidden" name="state" value={state} />
      <button className="btn btn-ghost btn-sm">{children}</button>
    </MemberForm>
  );
}

/**
 * Opportunity Radar (directives 32 and 33): opportunities the owner confirmed at their official source, matched to the member's
 * stated interests only after they turn matching on, plus the opportunities their own research found. Nothing is generated.
 */
export default async function Radar() {
  const viewer = (await getViewer())!;
  const membership = await getMembership(viewer);
  const premium = membership ? atLeast(membership.level, "executive") : false;
  const live = !isInsidePreview(viewer) && !viewer.viewAs;
  const db = live && premium ? await createClient() : null;
  if (!premium || !db) {
    return (
      <>
        <LuxHero eyebrow="CONNECT 360" title="Opportunity Radar" />
        <p className="glass mt-8 p-6 text-sm text-muted">
          {premium ? "Preview only: sign in with your own account to see your Opportunity Radar." : <>The Opportunity Radar is part of Executive Private and Elite Concierge. <Link href="/membership" className="text-gold underline">Compare memberships</Link>.</>}
        </p>
      </>
    );
  }
  const b = db.schema("business");
  const [{ data: prefsRow }, { data: opps }, { data: watch }, { data: findings }, { data: marks }, { data: industries }, { data: profile }, { count: fundingProjects }, { data: apps }] = await Promise.all([
    db.from("radar_preferences").select("opted_in, categories, industries, keywords").eq("user_id", viewer.id).maybeSingle(),
    db.from("radar_opportunities").select("id, title, organization, category, industries, region, summary, requirements, deadline, official_url, verified_on").eq("status", "published").order("deadline", { ascending: true, nullsFirst: false }).limit(300),
    db.from("intel_watchlist").select("subject, objective").eq("user_id", viewer.id),
    db.from("intel_findings").select("id, assignment_id, kind, title, detail, verification, intel_sources(url)").in("kind", RADAR_FINDING_KINDS).order("created_at", { ascending: false }).limit(100),
    db.from("radar_marks").select("source, item_id, state").eq("user_id", viewer.id),
    b.from("industries").select("slug, name").eq("is_active", true).order("sort_order"),
    b.from("profiles").select("industry").eq("user_id", viewer.id).maybeSingle(),
    b.from("funding_projects").select("id", { count: "exact", head: true }).eq("user_id", viewer.id),
    db.from("member_applications").select("id, opportunity_id, finding_id").eq("user_id", viewer.id),
  ]);
  const prefs = (prefsRow ?? null) as RadarPrefs | null;
  const allOpps = (opps ?? []) as Opp[];
  const markOf = new Map(((marks ?? []) as Mark[]).map((m) => [`${m.source}:${m.item_id}`, m.state]));
  const appFor = new Map<string, string>();
  for (const a of apps ?? []) { if (a.opportunity_id) appFor.set(`opportunity:${a.opportunity_id}`, a.id); if (a.finding_id) appFor.set(`finding:${a.finding_id}`, a.id); }
  const matches = matchOpportunities(allOpps, prefs, watch ?? [], { fundingProjects: fundingProjects ?? 0, industry: profile?.industry ?? null }).filter((m) => markOf.get(`opportunity:${m.item.id}`) !== "dismissed");
  const research = ((findings ?? []) as Finding[]);
  const visibleResearch = research.filter((f) => markOf.get(`finding:${f.id}`) !== "dismissed");
  const saved = { opps: allOpps.filter((o) => markOf.get(`opportunity:${o.id}`) === "saved"), findings: research.filter((f) => markOf.get(`finding:${f.id}`) === "saved") };
  const dismissed = { opps: allOpps.filter((o) => markOf.get(`opportunity:${o.id}`) === "dismissed"), findings: research.filter((f) => markOf.get(`finding:${f.id}`) === "dismissed") };
  const industryName = new Map((industries ?? []).map((i) => [i.slug, i.name]));

  const oppActions = (o: Opp) => {
    const key = `opportunity:${o.id}`, app = appFor.get(key), mark = markOf.get(key);
    return (
      <div className="mt-4 flex flex-wrap gap-2">
        {app ? <Link href={`/app/connect360/applications/${app}`} className="btn btn-gold btn-sm">Open your application</Link>
          : <StartApplication fields={{ title: o.title, organization: o.organization, kind: o.category, deadline: o.deadline, official_url: o.official_url, opportunity_id: o.id, checklist: o.requirements }} />}
        {mark === "saved" ? <MarkButton source="opportunity" item={o.id} state="clear">Unsave</MarkButton> : <MarkButton source="opportunity" item={o.id} state="saved">Save</MarkButton>}
        {mark !== "dismissed" && <MarkButton source="opportunity" item={o.id} state="dismissed">Dismiss</MarkButton>}
      </div>
    );
  };
  const oppCard = (o: Opp, reasons?: string[]) => (
    <li key={o.id} className="glass p-6">
      <p className="eyebrow">{OPPORTUNITY_KINDS[o.category] ?? o.category}{o.region ? ` · ${o.region}` : ""}</p>
      <h3 className="display mt-1 text-2xl">{o.title}</h3>
      <p className="text-sm text-muted">{o.organization}{o.deadline ? ` · ${deadlineLabel(o.deadline)}` : ""}</p>
      <p className="mt-3 text-sm">{o.summary}</p>
      {o.requirements && <details className="mt-3 text-sm"><summary className="cursor-pointer text-gold">Published requirements</summary><p className="mt-2 whitespace-pre-line text-muted">{o.requirements}</p></details>}
      {reasons && <p className="mt-3 text-xs text-gold">Why you&apos;re seeing this: {reasons.join(" · ")}</p>}
      <p className="mt-2 text-xs text-faint"><a href={o.official_url} target="_blank" rel="noreferrer" className="text-gold underline">Official source ↗</a> · confirmed by The Art of Connect on {o.verified_on}{o.industries.length ? ` · ${o.industries.map((i) => industryName.get(i) ?? i).join(", ")}` : ""}</p>
      {oppActions(o)}
    </li>
  );
  const findingCard = (f: Finding) => {
    const key = `finding:${f.id}`, app = appFor.get(key), mark = markOf.get(key), url = f.intel_sources?.[0]?.url ?? null;
    return (
      <li key={f.id} className="glass p-6">
        <p className="eyebrow">From your research · {VERIFICATION_LABEL[f.verification] ?? f.verification}</p>
        <h3 className="display mt-1 text-xl">{f.title}</h3>
        {f.detail && <p className="mt-2 line-clamp-4 text-sm text-muted">{f.detail}</p>}
        <p className="mt-2 text-xs"><Link href={`/app/connect360/intelligence/${f.assignment_id}`} className="text-gold underline">See it in your research</Link>{url && <> · <a href={url} target="_blank" rel="noreferrer" className="text-gold underline">Source ↗</a></>}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {app ? <Link href={`/app/connect360/applications/${app}`} className="btn btn-gold btn-sm">Open your application</Link>
            : <StartApplication fields={{ title: f.title.slice(0, 200), kind: f.kind === "funding_program" ? "funding" : "other", official_url: url?.startsWith("https://") ? url : null, finding_id: f.id }} />}
          {mark === "saved" ? <MarkButton source="finding" item={f.id} state="clear">Unsave</MarkButton> : <MarkButton source="finding" item={f.id} state="saved">Save</MarkButton>}
          {mark !== "dismissed" && <MarkButton source="finding" item={f.id} state="dismissed">Dismiss</MarkButton>}
        </div>
      </li>
    );
  };

  const prefsForm = (
    <MemberForm action={saveRadarPrefs} className="glass max-w-3xl space-y-4 p-6">
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="opted_in" defaultChecked={prefs?.opted_in ?? false} className="mt-1 h-4 w-4" />
        <span><span className="font-semibold">Match opportunities to my interests.</span> <span className="block text-xs text-muted">We use only what you choose here, your watchlist and your business industry. You can turn this off at any time.</span></span></label>
      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Kinds of opportunity</legend>
        <div className="grid gap-2 sm:grid-cols-2">{Object.entries(OPPORTUNITY_KINDS).map(([k, v]) => (
          <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" name="categories" value={k} defaultChecked={prefs?.categories.includes(k)} />{v}</label>
        ))}</div>
      </fieldset>
      {(industries ?? []).length > 0 && (
        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Industries</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{(industries ?? []).map((i) => (
            <label key={i.slug} className="flex items-center gap-2 text-sm"><input type="checkbox" name="industries" value={i.slug} defaultChecked={prefs?.industries.includes(i.slug)} />{i.name}</label>
          ))}</div>
        </fieldset>
      )}
      <label className="block text-sm"><span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">Keywords (optional)</span>
        <input name="keywords" maxLength={500} defaultValue={prefs?.keywords ?? ""} className="field w-full" placeholder="e.g. film, board seat, franchise" /></label>
      <div className="flex"><button className="btn btn-gold btn-sm ml-auto">Save my Opportunity Radar</button></div>
    </MemberForm>
  );

  return (
    <>
      <LuxHero eyebrow="CONNECT 360" title="Opportunity Radar" tagline="Legitimate opportunities, matched to what you're pursuing." />
      <p className="mx-auto mt-6 max-w-3xl text-center text-xs text-faint">
        Every listing is confirmed by The Art of Connect at its official source, and every research result comes from your own My Intelligence Office assignments. We never invent opportunities, never guarantee selection, and never apply on your behalf.
        Prepare and track your applications in the <Link href="/app/connect360/applications" className="text-gold underline">Application Center</Link>.
      </p>

      {!prefs?.opted_in ? (
        <LuxSection eyebrow="Your consent first" title="Turn on matching" intro="Choose what interests you. Nothing is matched to you until you turn matching on.">{prefsForm}</LuxSection>
      ) : (
        <LuxSection eyebrow="Matched to you" title={matches.length ? `${matches.length} ${matches.length === 1 ? "opportunity" : "opportunities"} for you` : "No matches right now"}>
          {matches.length ? <ul className="grid gap-4 lg:grid-cols-2">{matches.map((m) => oppCard(m.item as Opp, m.reasons))}</ul> : (
            <p className="glass p-6 text-sm text-muted">
              {allOpps.length
                ? "None of the current listings match your interests. Widen your interests below, or ask Journey to research what you're pursuing in My Intelligence Office."
                : "There are no open listings yet. Our team adds opportunities only after confirming them at the official source, so this list grows carefully."}{" "}
              <Link href="/app/connect360/intelligence" className="text-gold underline">Open My Intelligence Office</Link>.
            </p>
          )}
        </LuxSection>
      )}

      <LuxSection eyebrow="From My Intelligence Office" title="Opportunities your research found" intro="Opportunities and funding programs from your own research assignments, with how well each is verified.">
        {visibleResearch.length ? <ul className="grid gap-4 lg:grid-cols-2">{visibleResearch.map(findingCard)}</ul>
          : <p className="glass p-6 text-sm text-muted">None yet. When a research assignment finds an opportunity or funding program, it appears here. <Link href="/app/connect360/intelligence" className="text-gold underline">Start a research assignment</Link>.</p>}
      </LuxSection>

      {(saved.opps.length > 0 || saved.findings.length > 0) && (
        <LuxSection eyebrow="Saved" title="Saved for later">
          <ul className="grid gap-4 lg:grid-cols-2">{saved.opps.map((o) => oppCard(o))}{saved.findings.map(findingCard)}</ul>
        </LuxSection>
      )}

      {(dismissed.opps.length > 0 || dismissed.findings.length > 0) && (
        <details className="mt-10">
          <summary className="cursor-pointer text-sm text-gold">Dismissed ({dismissed.opps.length + dismissed.findings.length})</summary>
          <ul className="mt-4 space-y-2">
            {[...dismissed.opps.map((o) => ({ source: "opportunity", id: o.id, title: o.title })), ...dismissed.findings.map((f) => ({ source: "finding", id: f.id, title: f.title }))].map((d) => (
              <li key={d.id} className="glass flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"><span>{d.title}</span><MarkButton source={d.source} item={d.id} state="clear">Restore</MarkButton></li>
            ))}
          </ul>
        </details>
      )}

      {prefs?.opted_in && (
        <LuxSection eyebrow="Your interests" title="Matching preferences">{prefsForm}</LuxSection>
      )}
      <p className="mt-10 text-center text-sm text-muted">
        {membership?.level === "elite"
          ? <>Follow specific companies, topics and people in <Link href="/app/connect360/intelligence/watchlist" className="text-gold underline">My Global Watchlist</Link>.</>
          : <>Need something specific? <Link href="/app/connect360/intelligence" className="text-gold underline">Ask Journey to research it</Link>.</>}
      </p>
    </>
  );
}
