import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { INTERESTS } from "@/lib/social";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { savePreview, setPreviewStatus } from "@/app/actions/sanctuary-admin";

export const metadata = { title: "Inside Connect previews" };
export const dynamic = "force-dynamic";

/** What's Happening Inside Connect (founder directive 18): curate previews of genuine activity for free members. */
export default async function ConnectPreviewsAdmin() {
  await requireStaff(["owner", "executive"]);
  const db = (await createClient())!;
  const { data } = await db.from("connect_previews").select("id, kind, title, summary, source_type, source_id, starts_at, status, show_until, created_at").order("created_at", { ascending: false }).limit(200);
  return (
    <>
      <PageHeader eyebrow="Community & Social" title="What’s Happening Inside Connect" />
      <p className="-mt-4 mb-6 max-w-3xl text-sm text-muted">Free members see only previews you approve. Each must describe a real event, circle, post or webinar (or an official Art of Connect item), without member names, photographs, private conversations or invented numbers. Circle sizes are added automatically only from 10 members up. <Link href="/app/discover" className="text-gold underline">See the member view →</Link></p>
      <Panel title="Previews">
        <ul className="divide-y divide-line">
          {(data ?? []).map((p) => (
            <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
              <div className="min-w-0 flex-1"><p className="text-xs text-muted">{p.kind} · source: {p.source_type}{p.source_id ? ` ${p.source_id.slice(0, 8)}` : ""}{p.show_until ? ` · until ${p.show_until}` : ""}</p>
                <p className="font-semibold">{p.title}</p><p className="text-sm text-muted">{p.summary}</p></div>
              <div className="flex items-center gap-2"><span className={`chip ${p.status === "approved" ? "chip-live" : "chip-locked"}`}>{p.status}</span>
                {p.status !== "approved" && <ActionForm action={setPreviewStatus}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value="approved" /><button className="btn btn-gold btn-sm">Approve</button></ActionForm>}
                {p.status !== "archived" && <ActionForm action={setPreviewStatus}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value="archived" /><button className="btn btn-ghost btn-sm">Archive</button></ActionForm>}
              </div>
            </li>
          ))}
          {!data?.length && <li className="px-5 py-6 text-sm text-muted">No previews yet. As genuine activity appears in Connect, describe it here for free members.</li>}
        </ul>
      </Panel>
      <Panel title="New preview">
        <ActionForm action={savePreview} className="grid gap-3 p-5 sm:grid-cols-2">
          <label className="text-sm">Type<select name="kind" className="field mt-1 w-full">{["event", "discussion", "circle", "webinar", "business-topic", "travel", "singles", "couples", "friendship", "elite"].map((k) => <option key={k}>{k}</option>)}</select></label>
          <label className="text-sm">Source<select name="source_type" className="field mt-1 w-full"><option value="event">Member event</option><option value="circle">Circle</option><option value="post">Post or discussion</option><option value="webinar">Webinar</option><option value="official">Official Art of Connect item</option></select></label>
          <label className="text-sm sm:col-span-2">Source ID (not needed for official items)<input name="source_id" className="field mt-1 w-full font-mono" placeholder="00000000-0000-0000-0000-000000000000" /></label>
          <label className="text-sm sm:col-span-2">Title<input name="title" required maxLength={140} className="field mt-1 w-full" placeholder="e.g. Founders’ breakfast in Atlanta" /></label>
          <label className="text-sm sm:col-span-2">Summary (no names or private details)<textarea name="summary" required rows={3} maxLength={600} className="field mt-1 w-full" /></label>
          <label className="text-sm">Date and time (optional)<input type="datetime-local" name="starts_at" className="field mt-1 w-full" /></label>
          <label className="text-sm">Show until (optional)<input type="date" name="show_until" className="field mt-1 w-full" /></label>
          <fieldset className="sm:col-span-2"><legend className="text-sm">Related interests (for personalization)</legend>
            <div className="mt-2 flex flex-wrap gap-2">{INTERESTS.map(([k, l]) => <label key={k} className="flex items-center gap-1 text-xs"><input type="checkbox" name="interests" value={k} />{l}</label>)}</div></fieldset>
          <div><button className="btn btn-gold">Save as draft</button></div>
        </ActionForm>
      </Panel>
    </>
  );
}
