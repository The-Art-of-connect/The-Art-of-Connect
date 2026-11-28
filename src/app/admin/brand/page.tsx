import { requireStaff } from "@/lib/auth";
import { BRAND_TERMS, PENDING_DECISIONS, RESOLVED_DECISIONS, type BrandTerm } from "@/lib/brand";
import { PageHeader, Panel } from "@/components/admin/ui";

export const metadata = { title: "Brand Terminology Registry" };

const KIND: Record<string, string> = {
  brand: "Brand", destination: "Destination", experience: "Experience", society: "Society", division: "Division", feature: "Feature",
  membership: "Membership", service: "Service", portal: "Owner Portal",
};

/** Founder directive 37: the single source of official names. Read-only here; names change only with founder approval. */
export default async function BrandRegistryPage() {
  await requireStaff(["owner", "admin", "executive"]);
  const terms = BRAND_TERMS as readonly BrandTerm[];
  return (
    <>
      <PageHeader eyebrow="Owner Portal" title="Brand Terminology Registry">
        <p className="max-w-2xl text-sm text-muted">One official name for every approved feature, used in navigation, headings, search, Home, membership benefits, upgrade pop-ups, Journey (text and voice), emails, the Owner Portal, Help and reports. Search understands the everyday words listed, and always answers with the official name. An automatic check blocks incorrect variants before any release.</p>
      </PageHeader>
      <div className="space-y-6">
        {PENDING_DECISIONS.length > 0 && (
          <Panel title={`Awaiting your decision (${PENDING_DECISIONS.length})`}>
            <ul className="divide-y divide-line text-sm">{PENDING_DECISIONS.map((d) => <li key={d} className="px-5 py-3">{d}</li>)}</ul>
          </Panel>
        )}
        <Panel title="Founder-approved naming decisions (final)">
          <ul className="divide-y divide-line text-sm">{RESOLVED_DECISIONS.map((d) => <li key={d.official} className="grid gap-1 px-5 py-3 sm:grid-cols-2"><span className="font-semibold">{d.official}</span><span className="text-muted">Discontinued: {d.discontinued}</span></li>)}</ul>
          <p className="border-t border-line px-5 py-3 text-xs text-muted">One feature. One official name. One consistent experience.</p>
        </Panel>
        <Panel title={`Official names (${terms.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-muted"><tr><th className="px-5 py-3">Official name</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Search also understands</th><th className="px-5 py-3">Never write</th></tr></thead>
              <tbody className="divide-y divide-line">
                {terms.map((t) => (
                  <tr key={t.key}>
                    <td className="px-5 py-3 font-semibold">{t.name}{t.note && <span className="block text-xs font-normal text-muted">{t.note}</span>}</td>
                    <td className="px-5 py-3 text-muted">{KIND[t.kind]}</td>
                    <td className="px-5 py-3 text-muted">{t.aliases?.join(", ") ?? "—"}</td>
                    <td className="px-5 py-3 text-muted">{t.avoid?.map((r) => r.source.replace(/\\b|\(\?<!.*?\)|\\/g, "").replace(/ \?/g, " ")).join(" · ") ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}
