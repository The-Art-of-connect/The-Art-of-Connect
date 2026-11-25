import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { date, rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { PREVIEW_GROUPS } from "@/lib/preview-pages";
import { ActionForm } from "@/components/admin/ActionForm";
import { Empty, NotConnected, PageHeader, Panel } from "@/components/admin/ui";
import { resolveReview, setSectionStatus } from "@/app/actions/review";

export const metadata = { title: "Page reviews" };
const LABEL: Record<string, string> = { approve: "Approved", changes: "Needs changes", add_more: "Add more", coming_soon: "Coming soon" };

export default async function Reviews() {
  await requireStaff(rolesFor("/admin/reviews"));
  const supabase = await createClient();
  if (!supabase) return <><PageHeader eyebrow="Platform" title="Page reviews" /><NotConnected /></>;
  const [{ data: reviews }, { data: status }] = await Promise.all([
    supabase.from("page_reviews").select("id, path, decision, notes, resolved, created_at").order("created_at", { ascending: false }).limit(200),
    supabase.from("section_status").select("path, status"),
  ]);
  const st = new Map((status ?? []).map((s) => [s.path, s.status]));
  const open = (reviews ?? []).filter((r) => !r.resolved);
  return (
    <>
      <PageHeader eyebrow="Platform" title="Page reviews & Coming soon">
        <Link href="/inside-preview" className="btn btn-gold btn-sm">Open the preview</Link>
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Panel title={`Your review notes (${open.length} open)`}>
          {open.length ? (
            <ul className="divide-y divide-line">
              {open.map((r) => (
                <li key={r.id} className="px-5 py-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span><Link href={r.path} className="font-semibold text-gold-deep hover:underline">{r.path}</Link> <span className="chip ml-2">{LABEL[r.decision]}</span></span>
                    <ActionForm action={resolveReview}><input type="hidden" name="id" value={r.id} /><button className="text-xs underline">Done</button></ActionForm>
                  </div>
                  {r.notes && <p className="mt-2 whitespace-pre-wrap text-muted">{r.notes}</p>}
                  <p className="mt-1 text-xs text-faint">{date(r.created_at)}</p>
                </li>
              ))}
            </ul>
          ) : <Empty>No open notes. Use “Review this page” while previewing.</Empty>}
        </Panel>
        <Panel title="Open to members or Coming soon">
          <ul className="divide-y divide-line">
            {PREVIEW_GROUPS.flatMap((g) => g.pages).map(([path, title]) => {
              const soon = st.get(path) === "coming_soon";
              return (
                <li key={path} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span><Link href={path} className="font-semibold hover:underline">{title}</Link><span className="block text-xs text-faint">{path}</span></span>
                  <ActionForm action={setSectionStatus}>
                    <input type="hidden" name="path" value={path} /><input type="hidden" name="status" value={soon ? "live" : "coming_soon"} />
                    <button className={`btn btn-sm ${soon ? "btn-gold" : "btn-ghost"}`}>{soon ? "Coming soon · Open it" : "Open · Make Coming soon"}</button>
                  </ActionForm>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </>
  );
}
