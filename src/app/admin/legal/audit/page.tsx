import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { Empty, PageHeader, Panel } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const TABLES: Record<string, string> = {
  legal_documents: "Document",
  legal_document_versions: "Document version",
  legal_compliance_items: "Compliance item",
  legal_acceptances: "Member acceptance",
};
const HIDE = new Set(["id", "created_by", "owner_approved_by", "published_by", "decided_by", "user_id", "version_id", "ip_hash", "user_agent"]);
const when = (iso: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(iso));
const show = (v: unknown) => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object" && v && "sha256" in (v as Record<string, unknown>)) {
    const b = v as { sha256: string; characters: number };
    return `text ${String(b.sha256).slice(0, 12)}… (${b.characters} characters)`;
  }
  if (Array.isArray(v)) return v.join(", ") || "none";
  if (typeof v === "object") return JSON.stringify(v);
  const s = String(v);
  return s.length > 160 ? `${s.slice(0, 160)}…` : s;
};

/** Legal and compliance audit trail, recorded by the database; it cannot be edited or deleted. */
export default async function LegalAuditPage() {
  await requireStaff(rolesFor("/admin/legal"));
  const supabase = (await createClient())!;
  const { data: rows } = await supabase.from("legal_audit_log").select("*").order("occurred_at", { ascending: false }).limit(300);

  return (
    <>
      <Link href="/admin/legal" className="text-sm text-gold hover:text-gold-bright">← Legal & Policy Center</Link>
      <PageHeader eyebrow="Legal & Policy Center" title="Legal audit trail" />
      <p className="mb-6 max-w-3xl text-sm text-muted">
        Every change to documents, versions, approvals, publication, the compliance checklist and every acceptance — who, what changed,
        the previous and new values, and when. Long document text is recorded by its fingerprint. Entries cannot be edited or deleted.
      </p>
      <Panel title="Most recent 300 entries">
        {rows?.length ? (
          <ul className="divide-y divide-line">
            {rows.map((r) => {
              const fields = (r.changed_fields as string[]).filter((f) => !HIDE.has(f));
              return (
                <li key={r.id} className="px-5 py-4 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold">{TABLES[r.table_name] ?? r.table_name} <span className="text-xs font-normal text-gold">{r.operation === "INSERT" ? "Created" : r.operation === "DELETE" ? "Removed" : "Changed"}</span></p>
                    <p className="text-xs text-muted">{when(r.occurred_at)}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted">By {r.source === "system" ? "System" : `${r.actor_email ?? "member"}${r.actor_roles ? ` (${r.actor_roles})` : ""}`}</p>
                  {fields.length > 0 && r.operation !== "INSERT" && (
                    <table className="mt-2 w-full text-xs">
                      <tbody>
                        {fields.map((f) => (
                          <tr key={f} className="align-top">
                            <td className="w-40 py-0.5 pr-3 text-muted">{f.replaceAll("_", " ")}</td>
                            <td className="py-0.5 pr-3">{show((r.previous_values as Record<string, unknown>)?.[f])}</td>
                            <td className="py-0.5">→ {show((r.new_values as Record<string, unknown>)?.[f])}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {r.operation === "INSERT" && <p className="mt-1 text-xs text-muted">{show((r.new_values as Record<string, unknown>)?.title ?? (r.new_values as Record<string, unknown>)?.document_slug ?? r.record_key)}</p>}
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty>No entries yet.</Empty>
        )}
      </Panel>
    </>
  );
}
