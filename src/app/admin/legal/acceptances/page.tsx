import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { Empty, PageHeader, Panel } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const when = (iso: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(iso));

/** Electronic acceptance evidence. Records are permanent and cannot be edited. */
export default async function AcceptancesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff(rolesFor("/admin/legal"));
  const q = ((await searchParams).q ?? "").trim().toLowerCase().slice(0, 254);
  const supabase = (await createClient())!;
  let query = supabase.from("legal_acceptances").select("id, accepted_email, document_slug, version_label, body_sha256, context, method, statement, ip_hash, accepted_at").order("accepted_at", { ascending: false }).limit(200);
  if (q) query = query.ilike("accepted_email", `%${q.replace(/[%_]/g, "")}%`);
  const { data: rows } = await query;

  return (
    <>
      <Link href="/admin/legal" className="text-sm text-gold hover:text-gold-bright">← Legal & Policy Center</Link>
      <PageHeader eyebrow="Legal & Policy Center" title="Acceptance records" />
      <p className="mb-6 max-w-3xl text-sm text-muted">
        Each record shows who accepted, the exact version and its text fingerprint, when, where (registration, checkout, couples,
        professional application or re-acceptance), and the wording they agreed to. Records cannot be changed or deleted.
      </p>
      <form method="get" className="mb-6 flex max-w-md gap-2">
        <input name="q" defaultValue={q} type="search" placeholder="Search by member email" className="field" aria-label="Search by member email" />
        <button className="btn btn-ghost shrink-0">Search</button>
      </form>
      <Panel title={`${rows?.length ?? 0} record${rows?.length === 1 ? "" : "s"}${q ? ` matching “${q}”` : " (most recent 200)"}`}>
        {rows?.length ? (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[900px]">
              <thead><tr><th>Member</th><th>Document</th><th>Version</th><th>Where</th><th>Accepted</th><th>Evidence</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td>{r.accepted_email ?? "Deleted account"}</td>
                    <td><Link href={`/admin/legal/${r.document_slug}`} className="text-gold underline">{r.document_slug}</Link></td>
                    <td>{r.version_label}</td>
                    <td className="capitalize">{r.context.replaceAll("_", " ")}</td>
                    <td className="whitespace-nowrap">{when(r.accepted_at)}</td>
                    <td className="text-xs text-muted">
                      {r.method} · “{r.statement}”<br />text {r.body_sha256.slice(0, 12)}…{r.ip_hash ? ` · source ${r.ip_hash.slice(0, 8)}…` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No acceptance records yet. Members can accept only documents that are published.</Empty>
        )}
      </Panel>
    </>
  );
}
