import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMembership } from "@/lib/membership-server";
import { atLeast } from "@/lib/membership-level";
import { APP_STATUS } from "@/lib/funding";
import { LuxHero, LuxSection } from "@/components/Lux";
import { MemberForm } from "@/components/MemberForm";
import { createApplication } from "@/app/actions/radar";
import { APPLICATION_STATUS, OPPORTUNITY_KINDS, deadlineLabel, normalizeChecklist, pipelineCounts } from "@/lib/radar";

export const metadata = { title: "Application Center · CONNECT 360" };
export const dynamic = "force-dynamic";

type App = { id: string; title: string; organization: string | null; kind: string; status: string; deadline: string | null; checklist: unknown; updated_at: string };
type FundingApp = { id: string; project_id: string; provider_name: string; product: string | null; status: string; updated_at: string };
const label = "mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-muted";
const OPEN = ["preparing", "submitted", "in_review"];

/**
 * Application Center (directive 33): the member's applications in one place, with a status pipeline, deadlines, a text-only
 * documents checklist, notes and an approved résumé. Funding applications stay in the Capital & Funding Intelligence Center
 * (with their lender-evidence rules) and are listed here so nothing is tracked twice.
 */
export default async function Applications() {
  const viewer = (await getViewer())!;
  const membership = await getMembership(viewer);
  const premium = membership ? atLeast(membership.level, "executive") : false;
  const live = !isInsidePreview(viewer) && !viewer.viewAs;
  const db = live ? await createClient() : null;
  // Applications stay readable after a membership change (history is never erased); starting new ones needs Executive or Elite.
  const [{ data: apps }, { data: funding }] = db ? await Promise.all([
    db.from("member_applications").select("id, title, organization, kind, status, deadline, checklist, updated_at").eq("user_id", viewer.id).order("updated_at", { ascending: false }),
    db.schema("business").from("funding_applications").select("id, project_id, provider_name, product, status, updated_at").eq("user_id", viewer.id).order("updated_at", { ascending: false }),
  ]) : [{ data: [] }, { data: [] }];
  const list = (apps ?? []) as App[];
  const fundingList = (funding ?? []) as FundingApp[];
  if (!premium && !list.length) {
    return (
      <>
        <LuxHero eyebrow="CONNECT 360" title="Application Center" />
        <p className="glass mt-8 p-6 text-sm text-muted">The Application Center is part of Executive Private and Elite Concierge. <Link href="/membership" className="text-gold underline">Compare memberships</Link>. Your résumés are always in <Link href="/app/career" className="text-gold underline">My Professional Readiness</Link>.</p>
      </>
    );
  }
  const sorted = [...list].sort((a, b) => {
    const ao = OPEN.includes(a.status) ? 0 : 1, bo = OPEN.includes(b.status) ? 0 : 1;
    return ao - bo || (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999") || b.updated_at.localeCompare(a.updated_at);
  });
  const counts = pipelineCounts(list.map((a) => a.status));
  return (
    <>
      <LuxHero eyebrow="CONNECT 360" title="Application Center" tagline="Every application, deadline and document, in one calm place." />
      <p className="mx-auto mt-6 max-w-3xl text-center text-xs text-faint">
        Private to you. You submit each application yourself through the organization&apos;s official process; The Art of Connect never applies on your behalf.
        Documents aren&apos;t stored here: your checklist simply tracks what each application needs. We&apos;ll remind you in the Message Center a week before a deadline.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3" aria-label="Application pipeline">
        {counts.map((c) => (
          <div key={c.key} className="glass p-5 text-center">
            <p className="eyebrow">{c.label}</p>
            <p className="display mt-1 text-4xl">{c.count}</p>
          </div>
        ))}
      </div>

      <LuxSection eyebrow="Your applications" title={sorted.length ? "In progress and decided" : "No applications yet"}
        intro={sorted.length ? undefined : "Start one below, or from a listing on your Opportunity Radar so its details and requirements come with it."}>
        {sorted.length > 0 && (
          <ul className="grid gap-4 md:grid-cols-2">
            {sorted.map((a) => {
              const items = normalizeChecklist(a.checklist), done = items.filter((i) => i.done).length;
              const due = OPEN.includes(a.status) ? deadlineLabel(a.deadline) : null;
              return (
                <li key={a.id}><Link href={`/app/connect360/applications/${a.id}`} className="glass glass-edge block h-full p-6 transition hover:-translate-y-0.5">
                  <p className="eyebrow">{OPPORTUNITY_KINDS[a.kind] ?? "Other"} · {APPLICATION_STATUS[a.status]}</p>
                  <p className="display mt-2 text-2xl">{a.title}</p>
                  {a.organization && <p className="text-sm text-muted">{a.organization}</p>}
                  <p className="mt-3 text-xs text-gold">{[due, items.length ? `${done} of ${items.length} documents ready` : null].filter(Boolean).join(" · ") || `Updated ${new Date(a.updated_at).toLocaleDateString("en-US", { dateStyle: "medium" })}`}</p>
                </Link></li>
              );
            })}
          </ul>
        )}
      </LuxSection>

      {fundingList.length > 0 && (
        <LuxSection eyebrow="Capital & Funding Intelligence Center" title="Your funding applications" intro="Tracked with your funding projects, where lender approvals require the lender's own letter.">
          <ul className="grid gap-3 md:grid-cols-2">{fundingList.map((f) => (
            <li key={f.id}><Link href={`/app/connect360/funding/${f.project_id}`} className="glass glass-edge block p-5 transition hover:-translate-y-0.5">
              <p className="font-semibold">{f.provider_name}{f.product ? ` · ${f.product}` : ""}</p>
              <p className="mt-1 text-xs text-gold">{APP_STATUS[f.status] ?? f.status}</p>
            </Link></li>
          ))}</ul>
        </LuxSection>
      )}

      {premium ? (
        <LuxSection eyebrow="Begin" title="Start an application" intro="Add what you know now; you can fill in the rest later. Funding applications belong with a funding project in the Capital & Funding Intelligence Center.">
          <MemberForm action={createApplication} className="glass max-w-3xl space-y-3 p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm"><span className={label}>Opportunity</span><input name="title" required minLength={3} maxLength={200} className="field w-full" placeholder="e.g. Board seat, regional arts council" /></label>
              <label className="block text-sm"><span className={label}>Organization</span><input name="organization" maxLength={200} className="field w-full" placeholder="Who is offering it" /></label>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm"><span className={label}>Kind</span><select name="kind" className="field w-full" defaultValue="employment">{Object.entries(OPPORTUNITY_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
              <label className="block text-sm"><span className={label}>Deadline</span><input type="date" name="deadline" className="field w-full" /></label>
              <label className="block text-sm"><span className={label}>Official link</span><input type="url" name="official_url" maxLength={1000} pattern="https://.*" className="field w-full" placeholder="https://" /></label>
            </div>
            <label className="block text-sm"><span className={label}>Required documents and steps (one per line)</span>
              <textarea name="checklist" rows={4} maxLength={12000} className="field w-full" placeholder={"Résumé\nCover letter\nHeadshot\nTwo references"} /></label>
            <div className="flex"><button className="btn btn-gold btn-sm ml-auto">Start application</button></div>
          </MemberForm>
        </LuxSection>
      ) : (
        <p className="glass mt-10 p-6 text-sm text-muted">Your saved applications remain yours. Starting a new one is part of Executive Private and Elite Concierge. <Link href="/membership" className="text-gold underline">Compare memberships</Link>.</p>
      )}
      <p className="mt-10 text-center text-sm text-muted">Looking for something to apply for? Open your <Link href="/app/connect360/radar" className="text-gold underline">Opportunity Radar</Link>.</p>
    </>
  );
}
