import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { checkOpenAIConnection, isReasoningModel } from "@/lib/openai";
import { saveModel, setJourneyModel } from "@/app/actions/journey-admin";
import { ActionForm } from "@/components/admin/ActionForm";
import { ModelCompare } from "@/components/admin/ModelCompare";
import { NotConnected, PageHeader, Panel } from "@/components/admin/ui";

export const metadata = { title: "Journey Model Lab" };
export const dynamic = "force-dynamic";

const usd = (c: number) => `$${(c / 100).toFixed(c < 100 ? 4 : 2)}`;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export default async function ModelLab() {
  const viewer = await requireStaff(rolesFor("/admin/journey"));
  const owner = viewer.roles.includes("owner");
  const supabase = await createClient();
  if (!supabase) return <><PageHeader eyebrow="Journey" title="Model Lab" /><NotConnected /></>;
  const [{ data: s }, { data: models }, { data: versions }, { data: runs }, conn] = await Promise.all([
    supabase.from("journey_settings").select("default_model").maybeSingle(),
    supabase.from("journey_models").select("*").order("id"),
    supabase.from("journey_instruction_versions").select("version, status, note").order("version", { ascending: false }).limit(30),
    supabase.from("journey_test_runs").select("model, latency_ms, cost_cents, ratings, created_at").not("model", "is", null).order("created_at", { ascending: false }).limit(2000),
    checkOpenAIConnection(),
  ]);
  const current = s?.default_model ?? null;
  const approved = (models ?? []).filter((m) => m.enabled && m.input_cents_per_million != null && m.output_cents_per_million != null);
  const known = new Map((models ?? []).map((m) => [m.id, m]));
  // Show the main model names, not their dated snapshots (e.g. "gpt-5.4-mini" rather than "gpt-5.4-mini-2026-03-17").
  const catalog = conn.models.filter((id) => !/-\d{4}-\d{2}-\d{2}$/.test(id));
  const score = approved.map((m) => {
    const r = (runs ?? []).filter((x) => x.model === m.id);
    const rated = (k: string) => avg(r.map((x) => Number((x.ratings as Record<string, number>)?.[k])).filter((n) => n >= 1));
    return {
      id: m.id, tests: r.length,
      latency: avg(r.map((x) => Number(x.latency_ms)).filter((n) => n > 0)),
      cost: avg(r.map((x) => Number(x.cost_cents ?? 0))),
      quality: rated("quality"), comprehension: rated("comprehension"), emotion: rated("emotion"),
    };
  });
  const stars = (n: number | null) => (n == null ? "—" : `${n.toFixed(1)} ★`);

  return (
    <>
      <Link href="/admin/journey" className="text-sm text-gold">← Journey Intelligence Center</Link>
      <PageHeader eyebrow="Journey" title="Model Lab" />
      <p className="-mt-4 mb-6 max-w-3xl text-sm text-muted">
        Privately compare OpenAI models using the same master personality, then choose the one that best understands your members. Journey is never locked to one model — you can change it at any time.
        Journey currently uses <strong>{current ?? "no model yet"}</strong>.
      </p>

      <Panel title="Compare models privately">
        <ModelCompare models={approved.map((m) => m.id)} versions={(versions ?? []).map((v) => ({ version: v.version, status: v.status, note: v.note }))} current={current} />
      </Panel>

      <div className="mt-6">
        <Panel title="Scorecard — your private test results">
          <table className="data-table">
            <thead><tr><th>Model</th><th>Tests</th><th>Quality</th><th>Comprehension</th><th>Emotional awareness</th><th>Avg. speed</th><th>Avg. cost / reply</th><th></th></tr></thead>
            <tbody>
              {score.map((r) => (
                <tr key={r.id}>
                  <td className="text-text">{r.id}{r.id === current && <span className="ml-2 text-xs text-success">in use</span>}</td>
                  <td>{r.tests}</td><td>{stars(r.quality)}</td><td>{stars(r.comprehension)}</td><td>{stars(r.emotion)}</td>
                  <td>{r.latency == null ? "—" : `${(r.latency / 1000).toFixed(1)}s`}</td>
                  <td>{r.cost == null || !r.tests ? "—" : usd(r.cost)}</td>
                  <td>{owner && r.id !== current && <ActionForm action={setJourneyModel}><input type="hidden" name="id" value={r.id} /><button className="text-xs text-gold underline">Use for Journey</button></ActionForm>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!score.length && <p className="p-5 text-sm text-muted">Approve a model below to begin.</p>}
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title={`Models available to your OpenAI account${conn.reachable ? ` (${catalog.length})` : ""}`}>
          {!conn.reachable ? (
            <p className="p-5 text-sm text-danger">OpenAI connection unavailable{conn.error ? `: ${conn.error}` : ""}.</p>
          ) : (
            <>
              <p className="px-5 pt-4 text-xs text-muted">
                To approve a model, enter its current standard prices from openai.com/api/pricing (dollars per 1 million tokens). Journey records the cost of every reply from these rates and enforces your budgets with them.
                Models marked “thinks first” reason before replying — often deeper, sometimes slower; their thinking is billed as output.
              </p>
              <ul className="divide-y divide-line">
                {catalog.map((id) => {
                  const m = known.get(id);
                  const isApproved = Boolean(m?.enabled && m.input_cents_per_million != null);
                  const price = (c: unknown) => (c == null ? "" : String(Number(c) / 100));
                  return (
                    <li key={id} className="px-5 py-3">
                      <ActionForm action={saveModel} className="flex flex-wrap items-center gap-2 text-sm">
                        <input type="hidden" name="id" value={id} />
                        <span className="min-w-48 font-semibold">
                          {id}
                          {isReasoningModel(id) && <span className="ml-2 text-xs font-normal text-muted">thinks first</span>}
                          {isApproved && <span className="ml-2 text-xs text-success">approved</span>}
                        </span>
                        <label className="flex items-center gap-1 text-xs text-muted">In $<input name="input" defaultValue={price(m?.input_cents_per_million)} inputMode="decimal" className="field !min-h-0 !w-20 !py-1 text-sm" aria-label={`${id} input price per million tokens`} /></label>
                        <label className="flex items-center gap-1 text-xs text-muted">Out $<input name="output" defaultValue={price(m?.output_cents_per_million)} inputMode="decimal" className="field !min-h-0 !w-20 !py-1 text-sm" aria-label={`${id} output price per million tokens`} /></label>
                        <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="enabled" defaultChecked={m?.enabled ?? true} className="accent-[var(--champagne)]" /> Approved</label>
                        {owner && <button className="btn btn-ghost btn-sm">Save</button>}
                      </ActionForm>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Panel>
      </div>
    </>
  );
}
