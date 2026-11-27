import { requireStaff, hasRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Stat } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { approveJurisdiction } from "@/app/actions/business-launch";
import { money, type EntityFacts } from "@/lib/business-launch";

export const metadata = { title: "Business Launch Center · Owner review" };
export const dynamic = "force-dynamic";

type J = { code: string; name: string; status: string; verified_on: string | null; llc: EntityFacts; corporation: EntityFacts; nonprofit: EntityFacts; filing_office_url: string | null; sources: { url: string; title?: string }[]; uncertain: string[] };

/** Owner review of each state's draft entry: figures reach members only after approval. */
export default async function LaunchCenterAdmin() {
  const viewer = await requireStaff(["owner", "executive"]);
  const owner = hasRole(viewer, ["owner"]);
  const db = (await createClient())!;
  const { data } = await db.from("formation_jurisdictions").select("code, name, status, verified_on, llc, corporation, nonprofit, filing_office_url, sources, uncertain").order("name");
  const list = (data ?? []) as J[];
  const { data: summary } = await db.rpc("formation_summary");
  const s = (summary ?? {}) as { businesses?: number };
  return (
    <>
      <PageHeader eyebrow="Business Launch Center" title="State entries for review" />
      <p className="-mt-4 mb-6 max-w-3xl text-sm text-muted">Peace prepared these from official state pages found through searches limited to official domains. The session&apos;s network couldn&apos;t open the pages directly, so please confirm each figure on the official page before approving. Members always see the official links; fees appear only after you approve a state.</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Approved" value={list.filter((x) => x.status === "approved").length} />
        <Stat label="Awaiting review" value={list.filter((x) => x.status !== "approved").length} />
        <Stat label="Businesses members track" value={s.businesses ?? 0} />
      </div>
      <div className="mt-6 space-y-3">
        {list.map((j) => (
          <details key={j.code} className="glass overflow-hidden !p-0">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-4">
              <span><span className="font-semibold">{j.name}</span> <span className="text-xs text-muted">LLC {money(j.llc.filing_fee_usd) ?? "—"} · Corporation {money(j.corporation.filing_fee_usd) ?? "—"} · Nonprofit {money(j.nonprofit.filing_fee_usd) ?? "—"}</span></span>
              <span className={`chip ${j.status === "approved" ? "chip-live" : "chip-locked"}`}>{j.status === "approved" ? "Approved" : `Draft · ${j.uncertain.length} to confirm`}</span>
            </summary>
            <div className="space-y-3 border-t border-line px-5 py-4 text-sm">
              {(["llc", "corporation", "nonprofit"] as const).map((k) => (
                <p key={k}><span className="font-semibold capitalize">{k}: </span>{j[k].document ?? "—"}, {money(j[k].filing_fee_usd) ?? "fee not confirmed"}{j[k].annual_report?.name ? `; ${j[k].annual_report?.name} ${money(j[k].annual_report?.fee_usd) ?? ""} ${j[k].annual_report?.frequency ?? ""}` : ""}{j[k].fee_notes ? ` (${j[k].fee_notes})` : ""}</p>
              ))}
              {j.uncertain.length > 0 && <div><p className="font-semibold">To confirm</p><ul className="mt-1 list-disc pl-5 text-muted">{j.uncertain.map((u) => <li key={u}>{u}</li>)}</ul></div>}
              <p className="text-xs">{j.sources.slice(0, 6).map((x) => <a key={x.url} href={x.url} target="_blank" rel="noreferrer" className="mr-3 text-gold underline">{x.title?.slice(0, 50) || "Official source"} ↗</a>)}</p>
              {owner && (
                <ActionForm action={approveJurisdiction} className="flex flex-wrap items-center gap-3">
                  <input type="hidden" name="code" value={j.code} />
                  {j.status === "approved"
                    ? <><input type="hidden" name="status" value="draft" /><button className="text-xs text-muted underline">Return to draft</button></>
                    : <><label className="flex items-center gap-2"><input type="checkbox" name="confirm" />I confirmed these figures on the official pages</label><button className="btn btn-gold btn-sm">Approve {j.code}</button></>}
                </ActionForm>
              )}
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
