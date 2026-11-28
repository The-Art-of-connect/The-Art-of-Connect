"use server";
import { headers } from "next/headers";
import { requireStaff } from "@/lib/auth";
import { env } from "@/lib/env";
import { createExaWebhook, deleteExaWebhook, providerConfig, verifyExa, verifyParallel, type Check, type ExaHook } from "@/lib/intel-providers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Owner-only provider administration (founder directive 26). Owner role and two-factor sign-in are required (requireStaff).
 * No research is run and nothing is billed; secret values are never returned, except the Exa signing secret, which is shown
 * once to the owner at creation and never stored, logged or retrievable again.
 */
async function audit(action: string, details: Record<string, unknown>) {
  const db = createAdminClient();
  const viewer = await requireStaff(["owner"]);
  if (db) await db.from("audit_log").insert({ actor_id: viewer.id, action, target_table: "intel_providers", target_id: null, details });
}

/** The address Exa will deliver to: the production site, over HTTPS. */
async function webhookUrl() {
  const site = env.siteUrl.startsWith("https://") ? env.siteUrl : `https://${(await headers()).get("host") ?? ""}`;
  return `${site.replace(/\/+$/, "")}/api/intel/webhooks/exa`;
}

export type VerifyResult = { config: ReturnType<typeof providerConfig>; parallel: Check; exa: Check & { hooks: ExaHook[] }; webhookUrl: string; checkedAt: string };

export async function verifyConnections(): Promise<VerifyResult> {
  await requireStaff(["owner"]);
  const [parallel, exa] = await Promise.all([verifyParallel(), verifyExa()]);
  const result = { config: providerConfig(), parallel, exa, webhookUrl: await webhookUrl(), checkedAt: new Date().toISOString() };
  await audit("intel.verify_connections", { parallel: parallel.ok, exa: exa.ok, parallel_status: parallel.status, exa_status: exa.status });
  return result;
}

export type RegisterResult = { ok: true; id: string; secret: string; url: string } | { ok: false; message: string };

/** Registers (or, with replace, recreates) our Exa webhook. Returns the signing secret once. */
export async function registerExaWebhook(confirm: boolean, replace: boolean): Promise<RegisterResult> {
  await requireStaff(["owner"]);
  if (!confirm) return { ok: false, message: "Please confirm you're ready to copy the secret into Netlify right away." };
  const url = await webhookUrl();
  if (!/^https:\/\/[^/]+\/api\/intel\/webhooks\/exa$/.test(url)) return { ok: false, message: "The site address isn't a valid HTTPS address." };
  const current = await verifyExa();
  if (!current.ok) return { ok: false, message: current.detail };
  const existing = current.hooks.filter((h) => h.url === url);
  if (existing.length && !replace) return { ok: false, message: "A webhook for this site is already registered. Its secret can't be shown again; choose Replace to create a new one." };
  for (const h of existing) await deleteExaWebhook(h.id);
  const r = await createExaWebhook(url);
  await audit("intel.exa_webhook_registered", { ok: r.ok, replaced: existing.length, url });
  return r.ok ? { ok: true, id: r.id, secret: r.secret, url } : { ok: false, message: r.detail };
}

// ─── Testing mode and the integration self-test ────────────────────────────────────────────
import type { Result } from "@/lib/vault-selftest";

/** Turns the division and both providers on or off for testing. Testing-only mode and the approved limits always stay in force. */
export async function setIntelTesting(on: boolean): Promise<{ ok: boolean; message: string }> {
  const viewer = await requireStaff(["owner"]);
  const db = createAdminClient();
  if (!db) return { ok: false, message: "The database isn't available." };
  const { error } = await db.from("intel_settings").update({ enabled: on, parallel_enabled: on, exa_enabled: on, testing_only: true, updated_by: viewer.id, updated_at: new Date().toISOString() }).eq("id", true);
  if (error) return { ok: false, message: "That couldn't be saved." };
  await db.from("audit_log").insert({ actor_id: viewer.id, action: "intel.testing_mode", target_table: "intel_settings", target_id: null, details: { on } });
  return { ok: true, message: on ? "Testing mode is on: research runs only for the owner, staff and test accounts, within $25 a month and $5 a day." : "Research is off." };
}

export type IntelRun = { id: string; results: Result[]; finished: boolean; status: string };

export async function runIntelSelfTest(phase: "A" | "B", runId?: string): Promise<IntelRun | { error: string }> {
  const viewer = await requireStaff(["owner"]);
  const db = createAdminClient();
  if (!db) return { error: "The database isn't available." };
  const { phaseA, phaseB } = await import("@/lib/intel-selftest");
  if (phase === "A") {
    const site = (await webhookUrl()).replace(/\/api\/intel\/webhooks\/exa$/, "");
    const results = await phaseA(site);
    const { data } = await db.from("intel_security_runs").insert({ started_by: viewer.id, results }).select("id").single();
    return { id: data!.id, results, finished: false, status: "running" };
  }
  const { data: run } = await db.from("intel_security_runs").select("id, results").eq("id", runId ?? "").maybeSingle();
  if (!run) return { error: "Unknown run." };
  const all = [...(run.results as Result[]), ...(await phaseB(viewer.id))];
  const status = all.some((x) => x.outcome === "fail") ? "failed" : "complete";
  await db.from("intel_security_runs").update({ results: all, status, finished_at: new Date().toISOString() }).eq("id", run.id);
  await db.from("audit_log").insert({ actor_id: viewer.id, action: "intel.selftest", target_table: "intel_security_runs", target_id: run.id, details: { passed: all.filter((x) => x.outcome === "pass").length, total: all.length } });
  return { id: run.id, results: all, finished: true, status };
}
