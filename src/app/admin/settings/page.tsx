import { requireStaff } from "@/lib/auth";
import { date, rolesFor } from "@/lib/admin";
import { env } from "@/lib/env";
import { getLaunchSettings } from "@/lib/launch";
import { createClient } from "@/lib/supabase/server";
import { addToAllowlist, setLaunchSetting } from "@/app/actions/admin";
import { saveEligibility } from "@/app/actions/pricing";
import { ActionForm } from "@/components/admin/ActionForm";
import { Empty, PageHeader, Panel } from "@/components/admin/ui";

const LABELS: Record<string, string> = {
  registrations_open: "Public registrations",
  payments_live: "Live payments",
  business_live: "In Business experience",
  counseling_live: "In Life experience (incl. counselors & coaches)",
  relationships_live: "In Love experience",
  counselor_applications_open: "Professional applications",
  free_business_accounts_open: "Free Professional Society business accounts (founding members, no payment)",
  identity_verification_live: "Identity verification (Stripe Identity — per-verification charges)",
  maintenance_mode: "Maintenance mode",
};

export default async function SettingsPage() {
  await requireStaff(rolesFor("/admin/settings"));
  const settings = await getLaunchSettings();
  const sb = await createClient();
  const { data: ages } = sb ? await sb.from("platform_settings").select("key, value").in("key", ["minimum_member_age", "minimum_singles_age", "minimum_professional_age"]) : { data: [] };
  const age = (k: string, d: number) => Number((ages ?? []).find((a) => a.key === k)?.value ?? d);
  const supabase = await createClient();
  const { data: allowlist } = supabase ? await supabase.from("signup_allowlist").select("email, note, created_at").order("created_at", { ascending: false }) : { data: [] };

  return (
    <>
      <PageHeader eyebrow="Platform" title="Launch controls" />
      <div className={`mb-6 rounded-2xl border px-5 py-4 text-sm ${env.launchLocked ? "border-gold/30 bg-gold/5 text-gold" : "border-success/30 bg-success/5 text-success"}`}>
        {env.launchLocked ? (
          <>
            <strong>Master launch lock is ON.</strong> Nothing below can open to the public until LAUNCH_LOCK is set to
            “false” in Netlify’s environment variables. You can still prepare each switch here.
          </>
        ) : (
          <>Master launch lock is released. Each switch below now controls its feature directly.</>
        )}
      </div>
      <Panel title="Feature switches">
        <ul className="divide-y divide-line">
          {settings.map((s) => {
            const on = s.value === true;
            return (
              <li key={s.key} className="grid gap-4 px-5 py-5 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="font-semibold">{LABELS[s.key] ?? s.key}</p>
                  <p className="mt-1 text-sm text-muted">{s.description}</p>
                  <p className="mt-1 text-xs text-faint">Last changed {date(s.updated_at)}</p>
                </div>
                <ActionForm action={setLaunchSetting} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="key" value={s.key} />
                  <input type="hidden" name="enable" value={String(!on)} />
                  <span className={`chip ${on ? "chip-live" : "chip-locked"}`}>{on ? "On" : "Off"}</span>
                  {!on && s.key !== "maintenance_mode" && (
                    <input name="confirm" placeholder="Type AUTHORIZE" className="field !min-h-[38px] !w-40 !text-sm" autoComplete="off" />
                  )}
                  <button className={`btn btn-sm ${on ? "btn-ghost" : "btn-gold"}`}>{on ? "Turn off" : "Turn on"}</button>
                </ActionForm>
              </li>
            );
          })}
        </ul>
        {settings.length === 0 && <Empty>Connect Supabase and run the migration to manage launch switches.</Empty>}
      </Panel>

      <div className="mt-6">
        <Panel title="Eligibility — minimum ages">
          <ActionForm action={saveEligibility} className="grid gap-4 p-5 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-muted">Members (In Business, In Life, couples — both partners)</span>
              <input name="memberAge" type="number" min={18} max={99} defaultValue={age("minimum_member_age", 21)} className="field" />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-muted">The Personal Society singles</span>
              <input name="singlesAge" type="number" min={18} max={99} defaultValue={age("minimum_singles_age", 30)} className="field" />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-muted">Professional applicants</span>
              <input name="professionalAge" type="number" min={18} max={99} defaultValue={age("minimum_professional_age", 21)} className="field" />
            </label>
            <button className="btn btn-gold">Save ages</button>
          </ActionForm>
          <p className="px-5 pb-5 text-xs text-muted">Enforced by the database at registration using each person’s date of birth. Dates of birth are private to the member and are not visible in this portal.</p>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Early-access allowlist — staff and testers who may create accounts before launch">
          <ActionForm action={addToAllowlist} className="flex flex-col gap-2 border-b border-line p-5 sm:flex-row">
            <input name="email" type="email" required placeholder="email@domain.com" className="field" />
            <input name="note" placeholder="Note (e.g. founding member)" className="field" />
            <button className="btn btn-gold">Add</button>
          </ActionForm>
          <table className="data-table">
            <thead><tr><th>Email</th><th>Note</th><th>Added</th></tr></thead>
            <tbody>
              {(allowlist ?? []).map((a) => (
                <tr key={a.email}><td className="text-text">{a.email}</td><td>{a.note ?? "—"}</td><td>{date(a.created_at)}</td></tr>
              ))}
            </tbody>
          </table>
          {!allowlist?.length && <Empty>No invited emails yet.</Empty>}
        </Panel>
      </div>
    </>
  );
}
