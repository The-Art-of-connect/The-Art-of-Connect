import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { EvalRunner } from "@/components/admin/EvalRunner";
import { NotConnected, PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Journey evaluations" };

export default async function Evaluations() {
  await requireStaff(rolesFor("/admin/journey"));
  const supabase = await createClient();
  if (!supabase) return <><PageHeader eyebrow="Journey" title="Evaluation scenarios" /><NotConnected /></>;
  const [{ data: scenarios }, { data: runs }] = await Promise.all([
    supabase.from("journey_eval_scenarios").select("*").order("sort_order"),
    supabase.from("journey_eval_runs").select("scenario_id, rating, instruction_version, created_at").order("created_at", { ascending: false }),
  ]);
  return (
    <>
      <PageHeader eyebrow="Journey" title="Evaluation scenarios"><Link href="/admin/journey" className="btn btn-ghost btn-sm">← Intelligence Center</Link></PageHeader>
      <p className="-mt-4 mb-8 max-w-3xl text-sm text-muted">Fictional scenarios to check Journey&rsquo;s quality and safety before launch and after every instruction change. Runs use your owner testing budget, never member allowances.</p>
      <div className="space-y-4">
        {(scenarios ?? []).map((s) => {
          const last = (runs ?? []).find((r) => r.scenario_id === s.id);
          return (
            <article key={s.id} className="glass p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{s.category} <span className="chip ml-2">{s.mode}</span>{s.safety && <span className="chip chip-danger ml-2">Safety</span>}</p>
                <p className="text-xs text-faint">{last ? `Last rating: ${last.rating}/5 (instructions v${last.instruction_version ?? "—"})` : "Not run yet"}</p>
              </div>
              <p className="mt-2 text-sm">&ldquo;{s.prompt}&rdquo;</p>
              <p className="mt-2 text-xs text-muted"><strong>A good reply:</strong> {s.expectations}</p>
              <EvalRunner id={s.id} mode={s.mode} prompt={s.prompt} />
            </article>
          );
        })}
      </div>
    </>
  );
}
