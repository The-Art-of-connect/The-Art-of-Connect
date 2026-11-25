import Link from "next/link";
import { hasRole, requireStaff } from "@/lib/auth";
import { rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { updateComplianceItem } from "@/app/actions/legal";
import { ActionForm } from "@/components/admin/ActionForm";
import { Empty, PageHeader, Panel } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { open: "Open", in_progress: "In progress", resolved: "Resolved", not_applicable: "Not applicable" };
const TONE: Record<string, string> = { open: "text-danger", in_progress: "text-gold", resolved: "text-success", not_applicable: "text-faint" };

export default async function CompliancePage() {
  const viewer = await requireStaff(rolesFor("/admin/legal"));
  const isOwner = hasRole(viewer, ["owner"]);
  const supabase = (await createClient())!;
  const { data: items } = await supabase.from("legal_compliance_items").select("*").order("sort_order");
  const groups = [
    { kind: "decision", title: "Owner decisions", blurb: "Business and legal choices that the drafts deliberately leave open. Nothing is assumed until you record a decision here; then update the affected documents." },
    { kind: "requirement", title: "Compliance requirements for attorney review", blurb: "Laws and obligations to confirm with qualified counsel before launch. Marking an item resolved records that it was reviewed — it is not a certification of compliance." },
  ];

  return (
    <>
      <Link href="/admin/legal" className="text-sm text-gold hover:text-gold-bright">← Legal & Policy Center</Link>
      <PageHeader eyebrow="Legal & Policy Center" title="Compliance checklist" />
      {!items?.length && <Empty>The checklist appears once the database update is applied.</Empty>}
      <div className="space-y-8">
        {groups.map((g) => {
          const list = (items ?? []).filter((i) => i.kind === g.kind);
          if (!list.length) return null;
          const open = list.filter((i) => i.status === "open" || i.status === "in_progress").length;
          return (
            <Panel key={g.kind} title={`${g.title} — ${open} outstanding`}>
              <p className="border-b border-line px-5 py-3 text-sm text-muted">{g.blurb}</p>
              <ul className="divide-y divide-line">
                {list.map((i) => (
                  <li key={i.key} className="px-5 py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold">{i.title}</p>
                      <span className={`text-xs font-semibold ${TONE[i.status]}`}>{STATUS[i.status]}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted">{i.area}{i.related_documents?.length ? ` · ${i.related_documents.join(", ")}` : ""}</p>
                    {i.description && i.kind === "requirement" && <p className="mt-2 text-sm text-muted">{i.description}</p>}
                    <ActionForm action={updateComplianceItem} className="mt-3 grid gap-3 md:grid-cols-[10rem_1fr_1fr_auto] md:items-end">
                      <input type="hidden" name="key" value={i.key} />
                      <select name="status" defaultValue={i.status} className="field" aria-label="Status">
                        {Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                      </select>
                      <textarea name="decision" defaultValue={i.owner_decision ?? ""} readOnly={!isOwner} placeholder={isOwner ? (i.kind === "decision" ? "Your decision" : "Outcome of attorney review") : "Owner decision"} className="field !min-h-[44px]" aria-label="Decision" />
                      <textarea name="notes" defaultValue={i.notes ?? ""} placeholder="Notes" className="field !min-h-[44px]" aria-label="Notes" />
                      <button className="btn btn-ghost btn-sm">Save</button>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
