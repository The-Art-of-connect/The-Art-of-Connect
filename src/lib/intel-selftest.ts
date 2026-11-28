import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import { serverSecret } from "@/lib/env";
import { EXA_BASE, PARALLEL_BASE, providerConfig, verifyExa, verifyParallel } from "@/lib/intel-providers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Result } from "@/lib/vault-selftest";

/**
 * Owner-run self-test of the CONNECT 360 Intelligence Division against the real providers and our own deployed receivers.
 * Phase A (free): keys, webhook signature enforcement, spending-guard refusals, testing-only mode.
 * Phase B (about one cent, inside the approved testing budget): one fictional, public-information search per provider, each
 * authorized by the spending guard and recorded in the cost ledger. Results never contain keys, secrets or tokens.
 */
const r = (id: string, name: string, expected: string, outcome: Result["outcome"], detail: string): Result => ({ id, name, expected, outcome, detail });
const TOPIC = "U.S. Small Business Administration 7(a) loan program eligibility requirements";

async function post(url: string, body: string, headers: Record<string, string>) {
  try { return (await fetch(url, { method: "POST", body, headers: { "Content-Type": "application/json", ...headers }, redirect: "manual", cache: "no-store" })).status; } catch { return 0; }
}

/** Phase A: free checks. */
export async function phaseA(site: string): Promise<Result[]> {
  const out: Result[] = [];
  const cfg = providerConfig();
  const allSet = Object.values(cfg).every((v) => v === "configured");
  out.push(r("I01", "All four provider settings present and correctly formatted", "configured ×4", allSet ? "pass" : "fail", Object.entries(cfg).map(([k, v]) => `${k}: ${v}`).join("; ")));
  const [p, e] = await Promise.all([verifyParallel(), verifyExa()]);
  out.push(r("I02", "Parallel accepts the API key (free lookup)", "Key accepted", p.ok ? "pass" : "fail", `${p.detail}${p.status ? ` (HTTP ${p.status})` : ""}`));
  out.push(r("I03", "Exa accepts the API key (free webhook listing)", "Key accepted", e.ok ? "pass" : "fail", `${e.detail}${e.status ? ` (HTTP ${e.status})` : ""}`));
  const ourHook = e.hooks.find((h) => h.url.endsWith("/api/intel/webhooks/exa"));
  out.push(r("I04", "Exa webhook registered for this site", "Active webhook to /api/intel/webhooks/exa", ourHook ? (ourHook.status && ourHook.status !== "active" ? "fail" : "pass") : "fail",
    ourHook ? `Registered: ${ourHook.url} (${ourHook.status || "status not reported"}); events: ${ourHook.events.join(", ") || "not reported"}.` : "No Exa webhook points to this site."));

  // Webhook receivers: signed deliveries accepted once; unsigned, altered and stale deliveries refused.
  const exaUrl = `${site}/api/intel/webhooks/exa`, parUrl = `${site}/api/intel/webhooks/parallel`;
  const exaSecret = serverSecret("EXA_WEBHOOK_SECRET").trim(), parSecret = serverSecret("PARALLEL_WEBHOOK_SECRET").trim();
  const id = `selftest-${randomUUID()}`;
  const exaBody = JSON.stringify({ id, type: "selftest.ping", data: { id: "fictional" }, createdAt: new Date().toISOString() });
  const t = Math.floor(Date.now() / 1000);
  const exaSig = (ts: number, body: string) => `t=${ts},v1=${createHmac("sha256", exaSecret).update(`${ts}.${body}`).digest("hex")}`;
  const e1 = await post(exaUrl, exaBody, { "Exa-Signature": exaSig(t, exaBody) });
  const e2 = await post(exaUrl, exaBody, { "Exa-Signature": exaSig(t, exaBody) });
  const e3 = await post(exaUrl, exaBody, {});
  const e4 = await post(exaUrl, exaBody.replace("fictional", "altered"), { "Exa-Signature": exaSig(t, exaBody) });
  const e5 = await post(exaUrl, exaBody, { "Exa-Signature": exaSig(t - 3600, exaBody) });
  out.push(r("I05", "Exa receiver accepts a correctly signed delivery", "HTTP 200", e1 === 200 ? "pass" : "fail", `Returned HTTP ${e1}.`));
  out.push(r("I06", "Exa receiver refuses unsigned, altered and stale deliveries", "HTTP 401 ×3", [e3, e4, e5].every((s) => s === 401) ? "pass" : "fail", `Unsigned ${e3}, altered ${e4}, an hour old ${e5}.`));
  const parBody = JSON.stringify({ type: "selftest.ping", timestamp: new Date().toISOString(), data: { run_id: "fictional" } });
  const key = parSecret.startsWith("whsec_") ? Buffer.from(parSecret.slice(6), "base64") : Buffer.alloc(0);
  const parSig = (ts: number, body: string) => `v1,${createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64")}`;
  const p1 = await post(parUrl, parBody, { "webhook-id": id, "webhook-timestamp": String(t), "webhook-signature": parSig(t, parBody) });
  const p2 = await post(parUrl, parBody, { "webhook-id": id, "webhook-timestamp": String(t), "webhook-signature": parSig(t, parBody) });
  const p3 = await post(parUrl, parBody, { "webhook-id": id, "webhook-timestamp": String(t) });
  const p4 = await post(parUrl, parBody + " ", { "webhook-id": id, "webhook-timestamp": String(t), "webhook-signature": parSig(t, parBody) });
  out.push(r("I07", "Parallel receiver accepts a correctly signed delivery", "HTTP 200", p1 === 200 ? "pass" : "fail", `Returned HTTP ${p1}.`));
  out.push(r("I08", "Parallel receiver refuses unsigned and altered deliveries", "HTTP 401 ×2", [p3, p4].every((s) => s === 401) ? "pass" : "fail", `Unsigned ${p3}, altered ${p4}.`));
  const db = createAdminClient();
  if (db) {
    const { data } = await db.from("intel_webhook_deliveries").select("provider").eq("delivery_id", id);
    const counts = { exa: (data ?? []).filter((x) => x.provider === "exa").length, parallel: (data ?? []).filter((x) => x.provider === "parallel").length };
    out.push(r("I09", "Repeated deliveries are recorded only once", "One record per provider", counts.exa === 1 && counts.parallel === 1 && e2 === 200 && p2 === 200 ? "pass" : "fail", `Sent each twice; recorded Exa ${counts.exa}, Parallel ${counts.parallel}.`));
    await db.from("intel_webhook_deliveries").delete().eq("delivery_id", id);

    // Spending guard and testing-only mode.
    const { data: s } = await db.from("intel_settings").select("testing_only, company_monthly_limit_cents, company_daily_limit_cents").maybeSingle();
    out.push(r("I10", "Testing-only mode and approved limits in force", "Testing only; $25/month; $5/day", s?.testing_only && s.company_monthly_limit_cents <= 2500 && s.company_daily_limit_cents <= 500 ? "pass" : "fail",
      `Testing only: ${s?.testing_only ? "on" : "off"}; monthly $${((s?.company_monthly_limit_cents ?? 0) / 100).toFixed(2)}; daily $${((s?.company_daily_limit_cents ?? 0) / 100).toFixed(2)}.`));
  }
  return out;
}

/** Phase B: one fictional, public-information search per provider through the spending guard. */
export async function phaseB(ownerId: string): Promise<Result[]> {
  const out: Result[] = [];
  const db = createAdminClient();
  if (!db) return [r("I11", "Database available", "Available", "fail", "The database isn't available.")];
  const { data: a, error } = await db.from("intel_assignments").insert({ user_id: ownerId, title: "[Self-test] Public SBA program research", objective: `Fictional integration test: ${TOPIC}.`, category: "funding-resources", status: "queued" }).select("id").single();
  if (error || !a) return [r("I11", "Fictional test assignment created", "Created", "fail", "The test assignment couldn't be created.")];

  const big = await db.rpc("intel_can_spend", { p_assignment: a.id, p_estimate_cents: 10_000 });
  out.push(r("I11", "Spending guard refuses a request above the per-assignment limit", "refused", String(big.data).startsWith("refused:") ? "pass" : "fail", `Guard answered ${big.data}.`));

  const run = async (provider: "parallel" | "exa", call: () => Promise<{ status: number; urls: string[] }>) => {
    const guard = await db.rpc("intel_can_spend", { p_assignment: a.id, p_estimate_cents: 1 });
    if (guard.data !== "allowed") return r(provider === "parallel" ? "I12" : "I13", `${provider === "parallel" ? "Parallel" : "Exa"} live search (fictional, public topic)`, "Allowed by the guard, results with sources",
      String(guard.data).includes("division_off") ? "owner_action" : "fail", `Spending guard answered ${guard.data}. ${String(guard.data).includes("division_off") ? "Turn on testing mode, then run the self-test again." : ""}`.trim());
    const { data: job } = await db.from("intel_jobs").insert({ assignment_id: a.id, provider, capability: "search", status: "running", estimated_cents: 1, request: { topic: TOPIC, selftest: true } }).select("id").single();
    const res = await call().catch(() => ({ status: 0, urls: [] as string[] }));
    const ok = res.status === 200 && res.urls.length > 0;
    if (job) await db.from("intel_jobs").update({ status: ok ? "succeeded" : "failed", cost_cents: ok ? 1 : 0, attempts: 1, error: ok ? null : `HTTP ${res.status}` }).eq("id", job.id);
    const official = res.urls.some((u) => /(^|\.)sba\.gov\//.test(u.replace(/^https?:\/\//, "") + "/"));
    return r(provider === "parallel" ? "I12" : "I13", `${provider === "parallel" ? "Parallel" : "Exa"} live search (fictional, public topic)`, "HTTP 200 with cited sources", ok ? "pass" : "fail",
      ok ? `${res.urls.length} sources returned${official ? ", including official sba.gov pages" : ""}. Recorded in the cost ledger (about $0.01, rounded up).` : `Search failed (HTTP ${res.status}). Nothing was charged to the ledger.`);
  };

  out.push(await run("parallel", async () => {
    const res = await fetch(`${PARALLEL_BASE}/v1/search`, {
      method: "POST", headers: { "x-api-key": serverSecret("PARALLEL_API_KEY").trim(), "Content-Type": "application/json" },
      body: JSON.stringify({ objective: `Official information about ${TOPIC}.`, search_queries: [TOPIC], mode: "fast", advanced_settings: { max_results: 3 } }),
      signal: AbortSignal.timeout(20_000), cache: "no-store",
    });
    const j = (await res.json().catch(() => ({}))) as { results?: { url?: string }[] };
    return { status: res.status, urls: (j.results ?? []).map((x) => String(x.url ?? "")).filter(Boolean) };
  }));
  out.push(await run("exa", async () => {
    const res = await fetch(`${EXA_BASE}/search`, {
      method: "POST", headers: { "x-api-key": serverSecret("EXA_API_KEY").trim(), "Content-Type": "application/json" },
      body: JSON.stringify({ query: TOPIC, numResults: 3, type: "auto" }), signal: AbortSignal.timeout(20_000), cache: "no-store",
    });
    const j = (await res.json().catch(() => ({}))) as { results?: { url?: string }[] };
    return { status: res.status, urls: (j.results ?? []).map((x) => String(x.url ?? "")).filter(Boolean) };
  }));

  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
  const { data: jobs } = await db.from("intel_jobs").select("cost_cents, estimated_cents").gte("created_at", monthStart);
  const month = (jobs ?? []).reduce((n, x) => n + Math.max(Number(x.cost_cents), Number(x.estimated_cents)), 0);
  out.push(r("I14", "Spend recorded and within the approved budget", "Under $25 this month", month <= 2500 ? "pass" : "fail", `Recorded research spend this month: $${(month / 100).toFixed(2)}.`));
  await db.from("intel_assignments").update({ status: "complete", completed_at: new Date().toISOString() }).eq("id", a.id);
  return out;
}
