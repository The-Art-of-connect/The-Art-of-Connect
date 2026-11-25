import { requireStaff } from "@/lib/auth";
import { date, rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { reviewApplication } from "@/app/actions/admin";
import { ActionForm } from "@/components/admin/ActionForm";
import { Empty, PageHeader, Panel } from "@/components/admin/ui";

const TYPE_LABEL: Record<string, string> = {
  licensed_clinical: "Licensed clinical",
  coach: "Coach",
  mentor: "Business mentor",
  other_nonclinical: "Other nonclinical",
};

export default async function CounselorsPage() {
  await requireStaff(rolesFor("/admin/counselors"));
  const supabase = await createClient();
  const c = supabase?.schema("counseling");
  const [{ data: apps }, { data: counselors }, { data: interest }] = c && supabase
    ? await Promise.all([
        c.from("applications").select("*").order("created_at", { ascending: false }).limit(100),
        c.from("counselors").select("user_id, professional_name, credentials, professional_type, is_verified, is_listed").order("created_at", { ascending: false }),
        supabase.from("professional_interest").select("*").order("created_at", { ascending: false }).limit(200),
      ])
    : [{ data: [] as any[] }, { data: [] as any[] }, { data: [] as any[] }];

  return (
    <>
      <PageHeader eyebrow="People" title="Professional applications" />
      <p className="mb-6 max-w-2xl text-sm text-muted">
        Review and approve counselors, coaches and mentors. Licensed clinicians are verified against their state license;
        nonclinical professionals are reviewed on training and experience. Client records, journals and private notes are
        confidential and never shown in the Owner Portal.
      </p>
      <Panel title="Applications">
        <div className="divide-y divide-line">
          {(apps ?? []).map((a) => (
            <div key={a.id} className="grid gap-4 p-5 lg:grid-cols-[1.2fr_1fr]">
              <div className="text-sm">
                <div className="flex items-center gap-3">
                  <p className="text-base font-semibold text-text">{a.legal_name}</p>
                  <span className={`chip ${a.professional_type === "licensed_clinical" ? "chip-live" : "chip-locked"}`}>{TYPE_LABEL[a.professional_type] ?? a.professional_type}</span>
                  <span className="chip">{a.status.replace("_", " ")}</span>
                </div>
                <p className="mt-2 text-muted">
                  {a.professional_type === "licensed_clinical"
                    ? `${a.license_type} · #${a.license_number} · ${a.license_state} · expires ${date(a.license_expires_on)}`
                    : a.certifications || "No certifications listed"}
                  {a.years_experience != null ? ` · ${a.years_experience} yrs` : ""}
                </p>
                <p className="mt-1 text-faint">{(a.specialties ?? []).join(", ") || "No specialties listed"} · {a.document_paths?.length ?? 0} document(s) · applied {date(a.created_at)}</p>
              </div>
              <ActionForm action={reviewApplication} className="space-y-2">
                <input type="hidden" name="id" value={a.id} />
                <fieldset className="grid gap-1.5 rounded-xl border border-line p-3 text-xs sm:grid-cols-2">
                  <legend className="px-1 font-semibold text-muted">Credential checklist</legend>
                  {([
                    ["identity_checked", "Identity confirmed", a.identity_checked],
                    ["license_verified", "License active with issuing board", a.license_verified],
                    ["disciplinary_check_clear", "No disciplinary actions", a.disciplinary_check_clear],
                    ["insurance_confirmed", "Liability insurance confirmed", a.insurance_confirmed],
                    ["references_checked", "References checked", a.references_checked],
                  ] as const).map(([name, label, on]) => (
                    <label key={name} className="flex items-center gap-2"><input type="checkbox" name={name} defaultChecked={Boolean(on)} className="accent-[var(--champagne)]" /> {label}</label>
                  ))}
                </fieldset>
                <input name="lookupUrl" defaultValue={a.license_lookup_url ?? ""} placeholder="License board lookup link (https://…)" className="field !min-h-[40px] text-sm" />
                <textarea name="notes" defaultValue={a.reviewer_notes ?? ""} placeholder="Verification notes (references, insurance, follow-ups…)" className="field !min-h-[70px] text-sm" />
                {a.professional_type === "licensed_clinical" && <p className="text-xs text-faint">Licensed clinicians need identity, license verification (with lookup link) and a clear disciplinary check before approval.</p>}
                <div className="flex flex-wrap gap-2">
                  <button name="decision" value="approved" className="btn btn-gold btn-sm">Approve</button>
                  <button name="decision" value="in_review" className="btn btn-ghost btn-sm">In review</button>
                  <button name="decision" value="more_info" className="btn btn-ghost btn-sm">Request info</button>
                  <button name="decision" value="rejected" className="btn btn-ghost btn-sm text-danger">Reject</button>
                </div>
              </ActionForm>
            </div>
          ))}
        </div>
        {!apps?.length && <Empty>No applications yet. Applications open when you enable them in Launch controls.</Empty>}
      </Panel>
      <div className="mt-6">
        <Panel title={`Pre-launch interest (${interest?.length ?? 0})`}>
          <table className="data-table">
            <thead><tr><th>Name</th><th>Type</th><th>Credentials</th><th>Specialties</th><th>Received</th></tr></thead>
            <tbody>
              {(interest ?? []).map((p: any) => (
                <tr key={p.id}>
                  <td><p className="text-text">{p.full_name}</p><p className="text-xs text-faint">{p.email}</p></td>
                  <td>{TYPE_LABEL[p.professional_type] ?? p.professional_type}</td>
                  <td>{[p.credentials, p.license_state].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="max-w-xs truncate">{p.specialties ?? "—"}</td>
                  <td>{date(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!interest?.length && <Empty>No professionals have expressed interest yet.</Empty>}
        </Panel>
      </div>
      <div className="mt-6">
        <Panel title="Approved professionals">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Type</th><th>Credentials</th><th>Verified</th><th>Listed</th></tr></thead>
            <tbody>
              {(counselors ?? []).map((x) => (
                <tr key={x.user_id}>
                  <td className="text-text">{x.professional_name}</td><td>{TYPE_LABEL[x.professional_type] ?? "—"}</td><td>{x.credentials ?? "—"}</td>
                  <td>{x.is_verified ? "Yes" : "No"}</td><td>{x.is_listed ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!counselors?.length && <Empty>No approved professionals yet.</Empty>}
        </Panel>
      </div>
    </>
  );
}
