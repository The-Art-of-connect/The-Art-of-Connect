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
