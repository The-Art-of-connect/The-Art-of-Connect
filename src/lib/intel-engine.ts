import "server-only";
import { serverSecret } from "@/lib/env";
import { EXA_BASE, PARALLEL_BASE } from "@/lib/intel-providers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Plan } from "@/lib/intel-plan";

/**
 * CONNECT 360 research engine (founder directives 24–26). Journey plans; Exa discovers; Parallel investigates (asynchronously,
 * reporting back by signed webhook); findings are cross-verified and labeled. Every provider call first passes intel_can_spend
 * and is recorded in the intel_jobs cost ledger. Only the public research objective is ever sent: never member identities,
 * documents, financial records or contact details.
 */
type Db = NonNullable<ReturnType<typeof createAdminClient>>;
const PROCESSOR = { standard: { name: "base", cents: 1 }, deep: { name: "core", cents: 3 } } as const;
const AUTHORITATIVE = /(\.gov|\.mil|\.edu)(\/|$)|(^|\.)(sec\.gov|sba\.gov|irs\.gov|uscourts\.gov)(\/|$)/i;
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };

async function guard(db: Db, assignment: string, cents: number) {
  const { data } = await db.rpc("intel_can_spend", { p_assignment: assignment, p_estimate_cents: cents });
  return String(data ?? "refused:unknown");
}
async function event(db: Db, assignment: string, actor: string, action: string, detail: string) {
  await db.from("intel_events").insert({ assignment_id: assignment, actor, action, detail: detail.slice(0, 4000) });
}

/** Stage 1: discovery (Exa, synchronous) and investigation (Parallel Task API, asynchronous with webhook). */
export async function startResearch(assignmentId: string, plan: Plan, depth: "standard" | "deep", site: string): Promise<{ ok: boolean; message: string }> {
  const db = createAdminClient();
  if (!db) return { ok: false, message: "Research isn't available right now." };
  const { data: a } = await db.from("intel_assignments").select("id, stage, status").eq("id", assignmentId).maybeSingle();
  if (!a) return { ok: false, message: "Unknown assignment." };
  const first = await guard(db, assignmentId, 1);
  if (first !== "allowed") return { ok: false, message: refusal(first) };
  await db.from("intel_assignments").update({ status: "researching", stage: a.stage + 1, requirements: { plan } }).eq("id", assignmentId);
  await event(db, assignmentId, "journey", "plan", `Plan: ${plan.summary}. Discovery: ${plan.discovery.join("; ")}. Investigation: ${plan.investigation}`);

  // Discovery with Exa.
  for (const q of plan.discovery) {
    if ((await guard(db, assignmentId, 1)) !== "allowed") break;
    const { data: job } = await db.from("intel_jobs").insert({ assignment_id: assignmentId, stage: a.stage + 1, provider: "exa", capability: "search", status: "running", estimated_cents: 1, request: { query: q } }).select("id").single();
    try {
      const res = await fetch(`${EXA_BASE}/search`, {
        method: "POST", headers: { "x-api-key": serverSecret("EXA_API_KEY").trim(), "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, numResults: depth === "deep" ? 8 : 5, type: "auto", contents: { highlights: { numSentences: 2 } } }),
        signal: AbortSignal.timeout(20_000), cache: "no-store",
      });
      const j = (await res.json().catch(() => ({}))) as { results?: { url?: string; title?: string; publishedDate?: string; highlights?: string[] }[] };
      for (const r of (j.results ?? []).slice(0, 8)) {
        if (!r.url) continue;
        const { data: f } = await db.from("intel_findings").insert({
          assignment_id: assignmentId, job_id: job?.id, kind: "resource", title: (r.title || host(r.url) || "Result").slice(0, 300),
          detail: (r.highlights ?? []).join(" ").slice(0, 2000) || null, verification: "suggestion", data: { query: q, provider: "exa" },
        }).select("id").single();
        if (f) await db.from("intel_sources").insert({ finding_id: f.id, url: r.url.slice(0, 2000), title: r.title?.slice(0, 500) ?? null, publisher: host(r.url), published_on: r.publishedDate?.slice(0, 10) || null, authoritative: AUTHORITATIVE.test(host(r.url) + "/"), provider: "exa" });
      }
      if (job) await db.from("intel_jobs").update({ status: res.ok ? "succeeded" : "failed", cost_cents: res.ok ? 1 : 0, attempts: 1, error: res.ok ? null : `HTTP ${res.status}` }).eq("id", job.id);
    } catch {
      if (job) await db.from("intel_jobs").update({ status: "failed", attempts: 1, error: "unreachable" }).eq("id", job.id);
    }
  }

  // Investigation with Parallel (asynchronous; completion arrives by signed webhook).
  const proc = PROCESSOR[depth];
  const g = await guard(db, assignmentId, proc.cents);
  if (g === "allowed") {
    const properties = Object.fromEntries(plan.fields.map((f) => [f.name, { type: "string", description: f.description }]));
    const { data: job } = await db.from("intel_jobs").insert({ assignment_id: assignmentId, stage: a.stage + 1, provider: "parallel", capability: `task:${proc.name}`, status: "queued", estimated_cents: proc.cents, request: { investigation: plan.investigation, fields: plan.fields.map((f) => f.name) } }).select("id").single();
    try {
      const res = await fetch(`${PARALLEL_BASE}/v1/tasks/runs`, {
        method: "POST", headers: { "x-api-key": serverSecret("PARALLEL_API_KEY").trim(), "Content-Type": "application/json" },
        body: JSON.stringify({
          input: plan.investigation, processor: proc.name,
          task_spec: { output_schema: { type: "json", json_schema: { type: "object", properties, required: Object.keys(properties), additionalProperties: false } } },
          webhook: { url: `${site}/api/intel/webhooks/parallel`, event_types: ["task_run.status"] },
        }),
        signal: AbortSignal.timeout(20_000), cache: "no-store",
      });
      const j = (await res.json().catch(() => ({}))) as { run_id?: string; error?: { message?: string } };
      if (job) await db.from("intel_jobs").update(res.ok && j.run_id ? { status: "running", external_id: j.run_id, attempts: 1 } : { status: "failed", attempts: 1, error: `HTTP ${res.status}${j.error?.message ? `: ${j.error.message.slice(0, 300)}` : ""}` }).eq("id", job.id);
      await event(db, assignmentId, "parallel", res.ok ? "investigation_started" : "investigation_failed", res.ok ? "Investigation underway; results arrive automatically." : "The investigation couldn't start.");
    } catch {
      if (job) await db.from("intel_jobs").update({ status: "failed", attempts: 1, error: "unreachable" }).eq("id", job.id);
    }
  } else {
    await event(db, assignmentId, "system", "investigation_skipped", refusal(g));
  }
  await finishIfDone(db, assignmentId);
  return { ok: true, message: "Research is underway. Discovery results are in; the investigation will arrive shortly." };
}

/** Called by the signed Parallel webhook (or a manual refresh): fetch the result, store cited findings, cross-verify. */
export async function completeParallelRun(runId: string): Promise<void> {
  const db = createAdminClient();
  if (!db || !/^[A-Za-z0-9_-]{4,120}$/.test(runId)) return;
  const { data: job } = await db.from("intel_jobs").select("id, assignment_id, estimated_cents, status").eq("provider", "parallel").eq("external_id", runId).maybeSingle();
  if (!job || job.status === "succeeded") return;
  const res = await fetch(`${PARALLEL_BASE}/v1/tasks/runs/${runId}/result?timeout=10`, { headers: { "x-api-key": serverSecret("PARALLEL_API_KEY").trim() }, signal: AbortSignal.timeout(20_000), cache: "no-store" }).catch(() => null);
  if (!res || res.status === 408) return; // still running
  if (!res.ok) { await db.from("intel_jobs").update({ status: "failed", error: `HTTP ${res.status}` }).eq("id", job.id); await finishIfDone(db, job.assignment_id); return; }
  const j = (await res.json().catch(() => ({}))) as { output?: { content?: Record<string, unknown>; basis?: { field?: string; citations?: { url?: string; title?: string; excerpts?: string[] }[]; reasoning?: string; confidence?: string }[] } };
  const content = j.output?.content ?? {};
  const exaHosts = new Set(((await db.from("intel_sources").select("url, intel_findings!inner(assignment_id)").eq("intel_findings.assignment_id", job.assignment_id).eq("provider", "exa")).data ?? []).map((s) => host(String(s.url))));
  for (const [field, value] of Object.entries(content)) {
    const basis = (j.output?.basis ?? []).find((b) => b.field === field);
    const cites = (basis?.citations ?? []).filter((c) => c.url);
    const official = cites.some((c) => AUTHORITATIVE.test(host(c.url!) + "/"));
    const shared = cites.some((c) => exaHosts.has(host(c.url!)));
    const verification = !cites.length ? "unverified" : basis?.confidence === "high" && (official || shared) ? "corroborated" : basis?.confidence === "low" ? "unverified" : official ? "corroborated" : "unverified";
    const { data: f } = await db.from("intel_findings").insert({
      assignment_id: job.assignment_id, job_id: job.id, kind: "requirement", title: field.replace(/_/g, " ").replace(/^\w/, (x) => x.toUpperCase()).slice(0, 300),
      detail: String(value ?? "").slice(0, 8000), verification, data: { provider: "parallel", confidence: basis?.confidence ?? null, reasoning: basis?.reasoning?.slice(0, 1000) ?? null },
    }).select("id").single();
    if (f) for (const c of cites.slice(0, 8)) await db.from("intel_sources").insert({ finding_id: f.id, url: c.url!.slice(0, 2000), title: c.title?.slice(0, 500) ?? null, publisher: host(c.url!), authoritative: AUTHORITATIVE.test(host(c.url!) + "/"), provider: "parallel" });
  }
  // Exa discoveries whose site Parallel also cited become corroborated.
  const parHosts = new Set((j.output?.basis ?? []).flatMap((b) => (b.citations ?? []).map((c) => host(String(c.url ?? "")))).filter(Boolean));
  const { data: exaFindings } = await db.from("intel_findings").select("id, intel_sources(url)").eq("assignment_id", job.assignment_id).eq("verification", "suggestion");
  for (const f of exaFindings ?? []) if ((f.intel_sources as { url: string }[]).some((s) => parHosts.has(host(s.url)))) await db.from("intel_findings").update({ verification: "corroborated" }).eq("id", f.id);
  await db.from("intel_jobs").update({ status: "succeeded", cost_cents: job.estimated_cents }).eq("id", job.id);
  await event(db, job.assignment_id, "parallel", "investigation_complete", `${Object.keys(content).length} cited answers received.`);
  await finishIfDone(db, job.assignment_id);
}

/** When no provider work is outstanding: total cost, build the report and mark the assignment complete. */
async function finishIfDone(db: Db, assignmentId: string) {
  const { data: jobs } = await db.from("intel_jobs").select("status, cost_cents").eq("assignment_id", assignmentId);
  if ((jobs ?? []).some((x) => x.status === "running" || x.status === "queued")) return;
  const cost = (jobs ?? []).reduce((n, x) => n + Number(x.cost_cents), 0);
  const { data: findings } = await db.from("intel_findings").select("verification").eq("assignment_id", assignmentId);
  const tally = (findings ?? []).reduce<Record<string, number>>((m, f) => ({ ...m, [f.verification]: (m[f.verification] ?? 0) + 1 }), {});
  const { data: last } = await db.from("intel_reports").select("version").eq("assignment_id", assignmentId).order("version", { ascending: false }).limit(1).maybeSingle();
  await db.from("intel_reports").insert({ assignment_id: assignmentId, version: (last?.version ?? 0) + 1, summary: `${findings?.length ?? 0} findings: ${Object.entries(tally).map(([k, n]) => `${n} ${k.replace(/_/g, " ")}`).join(", ") || "none"}.`, body: { tally, cost_cents: cost } });
  await db.from("intel_assignments").update({ status: "complete", cost_cents: cost, completed_at: new Date().toISOString() }).eq("id", assignmentId);
  await event(db, assignmentId, "system", "complete", "Research complete. Your report is ready.");
}

export function refusal(code: string) {
  const m: Record<string, string> = {
    "refused:division_off": "Research isn't switched on yet.", "refused:emergency_stop": "Research is paused by the owner.",
    "refused:testing_only": "Research is in testing and opens to members after the owner's approval.", "refused:not_entitled": "Research is part of Executive Private and Elite Concierge.",
    "refused:company_daily": "Today's research capacity has been reached. Please try again tomorrow.", "refused:company_monthly": "This month's research capacity has been reached.",
    "refused:member_monthly": "You've reached this month's research allowance.", "refused:assignment_limit": "This assignment has reached its research limit.",
    "refused:max_stages": "This assignment has reached its number of research stages.", "refused:not_active": "This assignment isn't active.",
  };
  return m[code] ?? "Research couldn't start right now.";
}
