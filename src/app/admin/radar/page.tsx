import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Empty, PageHeader, Panel, Stat } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { createOpportunity, setOpportunityStatus } from "@/app/actions/radar-admin";
import { OPPORTUNITY_KINDS } from "@/lib/radar";

export const metadata = { title: "Opportunity Radar · Owner Portal" };
export const dynamic = "force-dynamic";

type Opp = { id: string; title: string; organization: string; category: string; deadline: string | null; official_url: string; verified_on: string; status: string; created_at: string };
const label = "mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-muted";
const STATUS: Record<string, string> = { draft: "Draft", published: "Published", closed: "Closed" };

/**
 * Opportunity Radar listings (directive 32). The owner enters each opportunity from its official source; members see only
 * published listings, matched to them only after they turn matching on. Nothing here is generated automatically.
 */
export default async function RadarAdmin() {
  await requireStaff(["owner"]);
  const db = (await createClient())!;
  const [{ data }, { data: industries }] = await Promise.all([
    db.from("radar_opportunities").select("id, title, organization, category, deadline, official_url, verified_on, status, created_at").order("created_at", { ascending: false }).limit(200),
    db.schema("business").from("industries").select("slug, name").eq("is_active", true).order("sort_order"),
  ]);
  const list = (data ?? []) as Opp[];
  const count = (s: string) => list.filter((o) => o.status === s).length;
  return (
    <>
      <PageHeader eyebrow="CONNECT 360" title="Opportunity Radar" />
      <p className="-mt-4 mb-6 max-w-3xl text-sm text-muted">Add only opportunities you have confirmed at the organization&apos;s official source. Members who turn on matching see published listings that fit their interests, with a link to the source and the date you checked it. Members can&apos;t add or change listings.</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Published" value={count("published")} />
        <Stat label="Drafts" value={count("draft")} />
        <Stat label="Closed" value={count("closed")} />
      </div>

      <div className="mt-6">
        <Panel title="Add an opportunity">
          <ActionForm action={createOpportunity} className="space-y-3 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm"><span className={label}>Title</span><input name="title" required minLength={3} maxLength={200} className="field w-full" /></label>
              <label className="block text-sm"><span className={label}>Organization</span><input name="organization" required minLength={2} maxLength={200} className="field w-full" /></label>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <label className="block text-sm"><span className={label}>Category</span><select name="category" className="field w-full">{Object.entries(OPPORTUNITY_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
              <label className="block text-sm"><span className={label}>Region</span><input name="region" maxLength={120} className="field w-full" placeholder="Optional" /></label>
              <label className="block text-sm"><span className={label}>Deadline</span><input type="date" name="deadline" className="field w-full" /></label>
              <label className="block text-sm"><span className={label}>Source checked on</span><input type="date" name="verified_on" className="field w-full" /></label>
            </div>
            <label className="block text-sm"><span className={label}>Official source (https://)</span><input type="url" name="official_url" required pattern="https://.*" maxLength={1000} className="field w-full" /></label>
            <label className="block text-sm"><span className={label}>Summary</span><textarea name="summary" required minLength={10} maxLength={2000} rows={3} className="field w-full" /></label>
            <label className="block text-sm"><span className={label}>Published requirements (one per line; members can turn these into their checklist)</span><textarea name="requirements" maxLength={4000} rows={4} className="field w-full" /></label>
            {(industries ?? []).length > 0 && (
              <fieldset>
                <legend className={label}>Industries (optional)</legend>
                <div className="grid gap-2 sm:grid-cols-3">{(industries ?? []).map((i) => <label key={i.slug} className="flex items-center gap-2 text-sm"><input type="checkbox" name="industries" value={i.slug} />{i.name}</label>)}</div>
              </fieldset>
            )}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirm" className="h-4 w-4" />I confirmed this opportunity at its official source</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="publish" className="h-4 w-4" />Publish now (otherwise saved as a draft)</label>
            <button className="btn btn-gold btn-sm">Save listing</button>
          </ActionForm>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Listings">
          {list.length === 0 ? <Empty>No listings yet. Members see an honest empty Opportunity Radar until you add one.</Empty> : (
            <ul className="divide-y divide-line">{list.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm">
                <span>
                  <span className="font-semibold">{o.title}</span> · {o.organization}
                  <span className="block text-xs text-muted">{OPPORTUNITY_KINDS[o.category]} · {STATUS[o.status]}{o.deadline ? ` · deadline ${o.deadline}` : ""} · checked {o.verified_on} · <a href={o.official_url} target="_blank" rel="noreferrer" className="text-gold underline">source ↗</a></span>
                </span>
                <span className="flex gap-2">
                  {(["published", "draft", "closed"] as const).filter((s) => s !== o.status).map((s) => (
                    <ActionForm key={s} action={setOpportunityStatus}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="status" value={s} /><button className="btn btn-ghost btn-sm">{s === "published" ? "Publish" : s === "draft" ? "Move to draft" : "Close"}</button></ActionForm>
                  ))}
                </span>
              </li>
            ))}</ul>
          )}
        </Panel>
      </div>
    </>
  );
}
