import Link from "next/link";
import { requireStaff, hasRole } from "@/lib/auth";
import { rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { KINDS, KIND_LABEL, TOPIC_LABEL } from "@/lib/sanctuary";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { SanctuaryContentForm } from "@/components/admin/SanctuaryContentForm";
import { publishDrafts, setSanctuaryStatus } from "@/app/actions/sanctuary-admin";

export const metadata = { title: "My Daily Sanctuary · Curriculum Studio" };
export const dynamic = "force-dynamic";

const STATUS_CLASS: Record<string, string> = { draft: "chip-locked", approved: "chip", published: "chip-live", archived: "chip" };

/** Prepare, schedule, approve and publish Sanctuary content in advance (founder directive 17). */
export default async function SanctuaryStudio({ searchParams }: { searchParams: Promise<{ kind?: string; status?: string }> }) {
  const viewer = await requireStaff(rolesFor("/admin/curriculum"));
  const owner = hasRole(viewer, ["owner"]);
  const sp = await searchParams;
  const db = (await createClient())!;
  let q = db.from("sanctuary_content").select("id, kind, topic, title, body, status, publish_on, prepared_by, updated_at").order("kind").order("publish_on", { ascending: true, nullsFirst: true }).limit(500);
  if (sp.kind) q = q.eq("kind", sp.kind);
  if (sp.status) q = q.eq("status", sp.status);
  const [{ data }, { data: counts }] = await Promise.all([q, db.from("sanctuary_content").select("kind, status")]);
  const tally = (status: string) => (counts ?? []).filter((c) => c.status === status).length;
  const link = (k?: string, s?: string) => `/admin/curriculum/sanctuary?${new URLSearchParams({ ...(k ? { kind: k } : {}), ...(s ? { status: s } : {}) })}`;
  return (
    <>
      <PageHeader eyebrow="Curriculum Studio" title="My Daily Sanctuary" />
      <p className="-mt-4 mb-6 max-w-3xl text-sm text-muted">Daily practices, lessons, scenarios and weekly and monthly reflections for every account. Free members receive only what you publish; no AI is used. Schedule items for specific days or leave them in the daily rotation.</p>
      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        <span className="chip chip-locked">{tally("draft")} drafts</span><span className="chip">{tally("approved")} approved</span><span className="chip chip-live">{tally("published")} published</span>
        <Link href="/admin/curriculum" className="text-gold underline">All curricula</Link>
      </div>

      {owner && tally("draft") > 0 && (
        <Panel title="Approve and publish drafts">
          <ActionForm action={publishDrafts} className="flex flex-wrap items-end gap-3 p-5">
            <label className="text-sm">Which<select name="kind" className="field mt-1"><option value="all">All drafts</option>{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirm" className="h-4 w-4" />I have reviewed these drafts</label>
            <button className="btn btn-gold btn-sm">Approve and publish</button>
          </ActionForm>
          <p className="px-5 pb-5 text-xs text-muted">The starter library was prepared by Peace and is waiting for your review. Read and edit any item below before publishing.</p>
        </Panel>
      )}

      <div className="mt-6 flex flex-wrap gap-2 text-xs">
        <Link href={link(undefined, sp.status)} className={`chip ${!sp.kind ? "chip-live" : ""}`}>All types</Link>
        {KINDS.map(([k, l]) => <Link key={k} href={link(k, sp.status)} className={`chip ${sp.kind === k ? "chip-live" : ""}`}>{l}</Link>)}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {["", "draft", "approved", "published", "archived"].map((s) => <Link key={s} href={link(sp.kind, s || undefined)} className={`chip ${(sp.status ?? "") === s ? "chip-live" : ""}`}>{s || "Any status"}</Link>)}
      </div>

      <Panel title={`Content (${data?.length ?? 0})`}>
        <ul className="divide-y divide-line">
          {(data ?? []).map((c) => (
            <li key={c.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted">{KIND_LABEL[c.kind]}{c.topic ? ` · ${TOPIC_LABEL[c.topic]}` : ""}{c.publish_on ? ` · scheduled ${c.publish_on}` : " · daily rotation"}{c.prepared_by === "peace" ? " · prepared by Peace" : ""}</p>
                <p className="mt-1 font-semibold">{c.title ?? c.body.slice(0, 110)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`chip ${STATUS_CLASS[c.status]}`}>{c.status}</span>
                {owner && c.status !== "published" && (
                  <ActionForm action={setSanctuaryStatus}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value="published" /><button className="btn btn-gold btn-sm">Publish</button></ActionForm>
                )}
                {c.status === "published" && (
                  <ActionForm action={setSanctuaryStatus}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value="archived" /><button className="btn btn-ghost btn-sm">Archive</button></ActionForm>
                )}
                <Link href={`/admin/curriculum/sanctuary/${c.id}`} className="btn btn-ghost btn-sm">Edit</Link>
              </div>
            </li>
          ))}
          {!data?.length && <li className="px-5 py-6 text-sm text-muted">Nothing here yet.</li>}
        </ul>
      </Panel>

      <Panel title="Add content">
        <div className="p-5"><SanctuaryContentForm /></div>
      </Panel>
    </>
  );
}
