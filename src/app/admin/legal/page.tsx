import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_LABEL, STATUS_LABEL, STATUS_TONE, type LegalStatus } from "@/lib/legal";
import { Empty, PageHeader, Panel, Stat } from "@/components/admin/ui";

export const dynamic = "force-dynamic";


const REQUIRED_AT: Record<string, string> = { registration: "Registration", checkout: "Checkout", couples: "Couples", professional: "Professionals" };

export default async function LegalCenterPage() {
  await requireStaff(rolesFor("/admin/legal"));
  const supabase = (await createClient())!;
  const [{ data: docs }, { data: versions }, { count: acceptances }, { data: items }] = await Promise.all([
    supabase.from("legal_documents").select("slug, title, category, required_at, sort_order").order("sort_order"),
    supabase.from("legal_document_versions").select("document_slug, version_label, status, legal_approved_at, scheduled_for, updated_at, created_at").order("created_at", { ascending: false }),
    supabase.from("legal_acceptances").select("id", { count: "exact", head: true }),
    supabase.from("legal_compliance_items").select("kind, status"),
  ]);

  const byDoc = new Map<string, NonNullable<typeof versions>>();
  for (const v of versions ?? []) byDoc.set(v.document_slug, [...(byDoc.get(v.document_slug) ?? []), v]);
  const latest = (slug: string) => byDoc.get(slug)?.[0];
  const inEffect = (slug: string) =>
    (byDoc.get(slug) ?? []).find((v) => v.status === "published" || (v.status === "scheduled" && v.scheduled_for && new Date(v.scheduled_for) <= new Date()));

  const total = docs?.length ?? 0;
  const attorneyApproved = (docs ?? []).filter((d) => (byDoc.get(d.slug) ?? []).some((v) => v.legal_approved_at)).length;
  const published = (docs ?? []).filter((d) => inEffect(d.slug)).length;
  const openDecisions = (items ?? []).filter((i) => i.kind === "decision" && i.status !== "resolved" && i.status !== "not_applicable").length;
  const openRequirements = (items ?? []).filter((i) => i.kind === "requirement" && i.status !== "resolved" && i.status !== "not_applicable").length;
  const categories = [...new Set((docs ?? []).map((d) => d.category))];

  return (
    <>
      <PageHeader eyebrow="Platform" title="Legal & Policy Center">
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/legal/compliance" className="nav-pill text-sm">Compliance checklist</Link>
          <Link href="/admin/legal/acceptances" className="nav-pill text-sm">Acceptance records</Link>
          <Link href="/admin/legal/audit" className="nav-pill text-sm">Audit trail</Link>
        </div>
      </PageHeader>
      <p className="mb-8 max-w-3xl text-sm text-muted">
        Every document moves through Draft → Pending Owner Review → Pending Legal Review → Approved → Scheduled or Published → Archived.
        Only you can approve and publish, and publication requires a recorded attorney approval. Drafts are never shown to the public.
      </p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Required documents" value={total} />
        <Stat label="Attorney approved" value={attorneyApproved} accent="var(--gold-bright)" hint={`${total - attorneyApproved} awaiting legal review`} />
        <Stat label="Published policies" value={published} accent="var(--success)" />
        <Stat label="Member acceptances" value={acceptances ?? 0} />
      </div>

      <Link href="/admin/legal/compliance" className="mt-4 block rounded-2xl border border-champagne/50 bg-champagne/10 p-5 text-sm transition-colors hover:bg-champagne/15">
        <span className="font-semibold">Outstanding: {openDecisions} owner decisions · {openRequirements} compliance requirements</span>
        <span className="block text-muted">Refund, cancellation, couples billing, retention, verification and other items marked in the drafts. Nothing is assumed until you decide. →</span>
      </Link>

      <div className="mt-6 space-y-6">
        {categories.map((cat) => (
          <Panel key={cat} title={CATEGORY_LABEL[cat] ?? cat}>
            <ul className="divide-y divide-line">
              {(docs ?? []).filter((d) => d.category === cat).map((d) => {
                const v = latest(d.slug);
                const live = inEffect(d.slug);
                return (
                  <li key={d.slug}>
                    <Link href={`/admin/legal/${d.slug}`} className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-ink-3 sm:flex-row sm:items-center sm:justify-between">
                      <span>
                        <span className="font-semibold text-text">{d.title}</span>
                        <span className="block text-xs text-muted">
                          {v ? `Latest ${v.version_label}` : "No versions"}
                          {live ? ` · In effect: ${live.version_label}` : " · Not in effect"}
                          {d.required_at?.length ? ` · Accepted at ${d.required_at.map((r: string) => REQUIRED_AT[r] ?? r).join(", ")}` : " · Informational"}
                        </span>
                      </span>
                      {v && <span className={`chip shrink-0 normal-case tracking-normal ${STATUS_TONE[v.status as LegalStatus]}`}>{STATUS_LABEL[v.status as LegalStatus]}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>
        ))}
        {!total && <Empty>The Legal & Policy Center appears once the database update is applied.</Empty>}
      </div>
    </>
  );
}
