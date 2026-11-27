import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { vaultConfig } from "@/lib/vault-aws";
import { PageHeader, Stat } from "@/components/admin/ui";
import { VaultSelfTest } from "@/components/admin/VaultSelfTest";

export const metadata = { title: "Document Vault security · Owner Portal" };
export const dynamic = "force-dynamic";

type Run = { id: string; started_at: string; status: string; results: { outcome: string }[] };

/** Document Vault security status and reporting (counts only: the owner never sees member documents here). */
export default async function VaultSecurity() {
  await requireStaff(["owner"]);
  const db = (await createClient())!;
  const b = db.schema("business");
  const [{ data: settings }, { data: versions }, { data: runs }] = await Promise.all([
    b.from("suite_settings").select("vault_storage").maybeSingle(),
    b.rpc("suite_metrics"),
    db.from("vault_security_runs").select("id, started_at, status, results").order("started_at", { ascending: false }).limit(5),
  ]);
  const m = (versions ?? {}) as { versions_awaiting_scan?: number; versions_infected?: number; documents?: number };
  const cfg = vaultConfig();
  const list = (runs ?? []) as Run[];
  return (
    <>
      <PageHeader eyebrow="CONNECT 360" title="Document Vault security" />
      <p className="-mt-4 mb-6 max-w-3xl text-sm text-muted">Testing storage on Amazon S3 with GuardDuty Malware Protection. Files open only after GuardDuty reports no threats. AWS enforces this, the database enforces it, and the application checks the live scan result before every download. Production document storage is not available.</p>
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Storage" value={settings?.vault_storage === "aws_testing" ? "Testing" : "Off"} hint="No production setting exists" />
        <Stat label="Documents" value={m.documents ?? 0} />
        <Stat label="Awaiting scan" value={m.versions_awaiting_scan ?? 0} />
        <Stat label="Threats found" value={m.versions_infected ?? 0} hint="Locked; never downloadable" />
      </div>

      <section className="glass mt-6 p-6">
        <p className="font-semibold">Configuration (presence only; values are never shown)</p>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {Object.entries(cfg.presence).map(([k, v]) => (
            <li key={k} className="flex justify-between gap-3"><code className="text-xs">{k}</code><span className={v === "configured" || (k === "region" || k === "bucket") && v !== "not_configured" ? "text-success" : "text-gold"}>{k === "region" || k === "bucket" ? v : v.replace(/_/g, " ")}</span></li>
          ))}
        </ul>
      </section>

      <div className="mt-6"><VaultSelfTest storage={settings?.vault_storage ?? "off"} /></div>

      {list.length > 0 && (
        <section className="glass mt-6 p-6">
          <p className="font-semibold">Recent self-tests</p>
          <ul className="mt-3 space-y-2 text-sm">
            {list.map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2">
                <span>{new Date(r.started_at).toLocaleString()}</span>
                <span className="text-muted">{r.results.filter((x) => x.outcome === "pass").length} passed · {r.results.filter((x) => x.outcome === "fail").length} failed · {r.results.filter((x) => x.outcome === "owner_action").length} owner action · {r.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
