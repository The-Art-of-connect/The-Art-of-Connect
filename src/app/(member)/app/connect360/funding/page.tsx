import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMembership } from "@/lib/membership-server";
import { atLeast } from "@/lib/membership-level";
import { FUNDING_NOTICE, PROJECT_KINDS, STAGES } from "@/lib/funding";
import { LuxHero, LuxSection } from "@/components/Lux";
import { MemberForm } from "@/components/MemberForm";
import { createFundingProject } from "@/app/actions/funding";

export const metadata = { title: "Capital & Funding Intelligence Center · CONNECT 360" };
export const dynamic = "force-dynamic";

/** Capital & Funding Intelligence Center home (directive 29): the member's private funding projects and approved resources. */
export default async function Funding() {
  const viewer = (await getViewer())!;
  const membership = await getMembership(viewer);
  const premium = membership ? atLeast(membership.level, "executive") : false;
  const live = !isInsidePreview(viewer) && !viewer.viewAs;
  const db = await createClient();
  const b = db?.schema("business");
  const [{ data: projects }, { data: resources }] = live && b && premium ? await Promise.all([
    b.from("funding_projects").select("id, title, kind, stage, updated_at").eq("user_id", viewer.id).order("updated_at", { ascending: false }),
    b.from("funding_resources").select("id, name, kind, official_url, summary, verified_on").eq("status", "approved").order("name"),
  ]) : [{ data: [] }, { data: [] }];
  if (!premium) {
    return (
      <>
        <LuxHero eyebrow="CONNECT 360" title="Capital & Funding Intelligence Center" />
        <p className="glass mt-8 p-6 text-sm text-muted">The Capital & Funding Intelligence Center is part of Executive Private and Elite Concierge. <Link href="/membership" className="text-gold underline">Compare memberships</Link>. Free guidance on starting a business is in the <Link href="/app/launch" className="text-gold underline">Business Launch Center</Link>.</p>
      </>
    );
  }
  return (
    <>
      <LuxHero eyebrow="CONNECT 360" title="Capital & Funding Intelligence Center" tagline="Become funding-ready, with clarity and confidence." />
      <p className="mx-auto mt-6 max-w-4xl text-center text-xs text-faint">{FUNDING_NOTICE}</p>
      {(projects ?? []).length > 0 && (
        <LuxSection eyebrow="Private to you" title="Your funding projects">
          <ul className="grid gap-4 md:grid-cols-2">
            {(projects ?? []).map((p) => (
              <li key={p.id}><Link href={`/app/connect360/funding/${p.id}`} className="glass glass-edge block p-6 transition hover:-translate-y-0.5">
                <p className="eyebrow">{PROJECT_KINDS[p.kind]} · {STAGES[p.stage]}</p>
                <p className="display mt-2 text-2xl">{p.title}</p>
                <p className="mt-1 text-xs text-muted">Updated {new Date(p.updated_at).toLocaleDateString()}</p>
              </Link></li>
            ))}
          </ul>
        </LuxSection>
      )}
      <LuxSection eyebrow="Begin" title="Start a funding project" intro="A confidential assessment, then your capital strategy, scenarios, readiness checklist and application tracking.">
        <MemberForm action={createFundingProject} className="glass grid max-w-2xl gap-3 p-6 sm:grid-cols-[1fr_14rem_auto]">
          <input name="title" required minLength={3} maxLength={160} className="field" placeholder="e.g. Second location build-out" />
          <select name="kind" className="field" defaultValue="expansion">{Object.entries(PROJECT_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <button className="btn btn-gold btn-sm">Create</button>
          <p className="text-xs text-faint sm:col-span-3">Executive Private includes two active funding projects; Elite Concierge includes ten.</p>
        </MemberForm>
      </LuxSection>
      <LuxSection eyebrow="Official sources" title="Funding resources" intro="Programs and providers reviewed by The Art of Connect, each linked to its official source and dated.">
        {(resources ?? []).length ? (
          <ul className="grid gap-4 md:grid-cols-2">{(resources ?? []).map((r) => <li key={r.id} className="glass p-6"><p className="display text-xl">{r.name}</p><p className="mt-2 text-sm text-muted">{r.summary}</p><p className="mt-3 text-xs"><a href={r.official_url} target="_blank" rel="noreferrer" className="text-gold underline">Official source ↗</a> · checked {r.verified_on}</p></li>)}</ul>
        ) : <p className="glass p-6 text-sm text-muted">Our reviewed funding resources are being prepared. Meanwhile, the U.S. Small Business Administration&apos;s official guide is a good start: <a href="https://www.sba.gov/funding-programs/loans" target="_blank" rel="noreferrer" className="text-gold underline">sba.gov/funding-programs/loans ↗</a></p>}
      </LuxSection>
    </>
  );
}
