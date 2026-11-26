import Link from "next/link";
import { requireStaff, hasRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Panel, Stat } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { approveAllSources, setSourceStatus } from "@/app/actions/sources-admin";

export const metadata = { title: "Source library · Curriculum Studio" };
export const dynamic = "force-dynamic";

const TOPIC: Record<string, string> = {
  "business-structures": "Business structures", deductions: "Deductions", payroll: "Payroll", "retirement-plans": "Retirement plans",
  depreciation: "Depreciation", "financial-statements": "Financial statements", "cash-flow": "Cash flow", "business-credit": "Business credit",
  funding: "Funding", expansion: "Expansion", succession: "Succession", "self-employment-tax": "Self-employment tax", "estimated-tax": "Estimated tax", qbi: "QBI deduction",
};
type Fact = { fact: string; figure: string | null; where: string | null };
type Source = { id: string; key: string; title: string; issuer: string; document: string | null; url: string; jurisdiction: string; tax_year: number | null; revision: string | null; topics: string[]; summary: string; key_facts: Fact[]; eligibility: string | null; verified_on: string; review_by: string | null; status: string; prepared_by: string };

/**
 * Business & Tax Education Center source library (founder directive 22). Primary sources only, each labeled by tax year and
 * jurisdiction. Journey will teach only from sources the owner approves here, and will cite them.
 */
export default async function SourceLibrary() {
  const viewer = await requireStaff(["owner", "executive"]);
  const owner = hasRole(viewer, ["owner"]);
  const db = (await createClient())!;
  const { data } = await db.from("knowledge_sources").select("*").neq("status", "archived").order("issuer").order("tax_year", { ascending: false, nullsFirst: false }).order("title");
  const list = (data ?? []) as Source[];
  const drafts = list.filter((s) => s.status === "draft");
  const now = new Date();
  const filingYear = now.getFullYear() - (now.getMonth() < 3 ? 2 : 1);
  return (
    <>
      <PageHeader eyebrow="Curriculum Studio" title="Business & Tax source library" />
      <p className="-mt-4 mb-6 max-w-3xl text-sm text-muted">Primary authoritative sources only: IRS publications and forms, SBA guides and state revenue departments. Each is labeled by tax year and jurisdiction. Journey will teach only from sources you approve, will cite them, and will always say it is educational, not licensed tax, legal or financial advice. <Link href="/admin/curriculum" className="text-gold underline">All curricula</Link></p>
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Approved" value={list.filter((s) => s.status === "approved").length} />
        <Stat label="Awaiting your review" value={drafts.length} />
        <Stat label="Federal" value={list.filter((s) => s.jurisdiction === "US-federal").length} />
        <Stat label="State" value={list.filter((s) => s.jurisdiction !== "US-federal").length} hint="Added once you choose states" />
      </div>

      {owner && drafts.length > 0 && (
        <Panel title="Approve drafts">
          <ActionForm action={approveAllSources} className="flex flex-wrap items-center gap-3 p-5">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirm" className="h-4 w-4" />I have reviewed these sources and their key facts</label>
            <button className="btn btn-gold btn-sm">Approve all drafts</button>
            <span className="text-xs text-muted">Drafts were prepared by Peace from the official pages and checked on the date shown.</span>
          </ActionForm>
        </Panel>
      )}

      <div className="mt-6 space-y-4">
        {list.map((s) => {
          const older = s.tax_year !== null && s.tax_year < filingYear;
          return (
            <details key={s.id} className="glass overflow-hidden !p-0">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-4">
                <span>
                  <span className="font-semibold">{s.document ? `${s.document}: ` : ""}{s.title}</span>
                  <span className="block text-xs text-muted">{s.issuer} · {s.jurisdiction === "US-federal" ? "Federal" : s.jurisdiction.replace("US-", "")} · {s.tax_year ? `Tax year ${s.tax_year}` : "Not tax-year specific"}{s.revision ? ` · ${s.revision}` : ""} · checked {s.verified_on}</span>
                </span>
                <span className="flex items-center gap-2 text-xs">
                  {older && <span className="chip chip-locked">Check for a newer year</span>}
                  <span className={`chip ${s.status === "approved" ? "chip-live" : "chip-locked"}`}>{s.status === "approved" ? "Approved" : "Draft"}</span>
                </span>
              </summary>
              <div className="space-y-3 border-t border-line px-5 py-4 text-sm">
                <p>{s.summary}</p>
                {s.key_facts.length > 0 && (
                  <ul className="space-y-1.5">{s.key_facts.map((k, i) => <li key={i} className="flex gap-2"><span className="text-gold">✦</span><span>{k.fact}{k.figure ? <strong> ({k.figure})</strong> : null}{k.where ? <span className="text-xs text-muted"> · {k.where}</span> : null}</span></li>)}</ul>
                )}
                {s.eligibility && <p className="text-muted"><span className="font-semibold text-text">Eligibility and limits: </span>{s.eligibility}</p>}
                <p className="text-xs text-muted">Topics: {s.topics.map((t) => TOPIC[t] ?? t).join(", ")}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-gold underline">Open the official source ↗</a>
                  {owner && s.status !== "approved" && <ActionForm action={setSourceStatus}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="status" value="approved" /><button className="btn btn-gold btn-sm">Approve</button></ActionForm>}
                  <ActionForm action={setSourceStatus}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="status" value="archived" /><button className="text-xs text-muted underline">Archive</button></ActionForm>
                </div>
              </div>
            </details>
          );
        })}
        {!list.length && <p className="glass p-6 text-sm text-muted">The first draft sources are being prepared.</p>}
      </div>
    </>
  );
}
