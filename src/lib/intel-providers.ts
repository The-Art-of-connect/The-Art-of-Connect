import "server-only";
import { randomUUID } from "node:crypto";
import { serverSecret } from "@/lib/env";

/**
 * Connections to the CONNECT 360 research providers (founder directive 26). Keys are read on the server only and are never
 * returned, logged or shown. Verification uses free, read-only requests: no research is run and nothing is billed.
 */
export const PARALLEL_BASE = "https://api.parallel.ai";
export const EXA_BASE = "https://api.exa.ai";
// Websets events only: Exa Monitors register their own webhook (and secret) per monitor.
export const EXA_EVENTS = ["webset.search.completed", "webset.item.created", "webset.item.enriched", "webset.idle"] as const;

export type KeyStatus = "configured" | "not_configured" | "unexpected_format";
export function providerConfig() {
  const pk = serverSecret("PARALLEL_API_KEY").trim();
  const pw = serverSecret("PARALLEL_WEBHOOK_SECRET").trim();
  const ek = serverSecret("EXA_API_KEY").trim();
  const ew = serverSecret("EXA_WEBHOOK_SECRET").trim();
  const st = (v: string, ok: boolean): KeyStatus => (!v ? "not_configured" : ok ? "configured" : "unexpected_format");
  return {
    parallelKey: st(pk, pk.length >= 20 && !/\s/.test(pk)),
    parallelWebhookSecret: st(pw, /^whsec_[A-Za-z0-9+/=]{16,}$/.test(pw)),
    exaKey: st(ek, ek.length >= 20 && !/\s/.test(ek)),
    exaWebhookSecret: st(ew, ew.length >= 16 && !/\s/.test(ew)),
  };
}

export type Check = { ok: boolean; status: number | null; detail: string };

/** Parallel: asks for a task run that cannot exist. A valid key gets "not found"; an invalid key gets "unauthorized". Free. */
export async function verifyParallel(): Promise<Check> {
  const key = serverSecret("PARALLEL_API_KEY").trim();
  if (!key) return { ok: false, status: null, detail: "PARALLEL_API_KEY is not set." };
  try {
    const res = await fetch(`${PARALLEL_BASE}/v1/tasks/runs/trun_${randomUUID().replace(/-/g, "")}`, {
      headers: { "x-api-key": key }, signal: AbortSignal.timeout(15_000), cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) return { ok: false, status: res.status, detail: "Parallel rejected the key." };
    if ([400, 404, 422].includes(res.status)) return { ok: true, status: res.status, detail: "Parallel accepted the key (test lookup of a non-existent run, nothing billed)." };
    return { ok: res.ok, status: res.status, detail: `Unexpected response from Parallel (${res.status}).` };
  } catch {
    return { ok: false, status: null, detail: "Parallel could not be reached." };
  }
}

export type ExaHook = { id: string; url: string; status: string; events: string[] };
async function exa(path: string, init: RequestInit = {}) {
  const key = serverSecret("EXA_API_KEY").trim();
  if (!key) return { res: null as Response | null, json: null as unknown };
  const res = await fetch(`${EXA_BASE}${path}`, {
    ...init, headers: { "x-api-key": key, "Content-Type": "application/json", ...(init.headers ?? {}) }, signal: AbortSignal.timeout(15_000), cache: "no-store",
  });
  return { res, json: await res.json().catch(() => null) };
}

/** Exa: lists our webhooks (free, read-only). Webhook secrets are never included in a listing. */
export async function verifyExa(): Promise<Check & { hooks: ExaHook[] }> {
  try {
    const { res, json } = await exa("/websets/v0/webhooks?limit=25");
    if (!res) return { ok: false, status: null, detail: "EXA_API_KEY is not set.", hooks: [] };
    if (res.status === 401 || res.status === 403) return { ok: false, status: res.status, detail: "Exa rejected the key.", hooks: [] };
    if (!res.ok) return { ok: false, status: res.status, detail: `Unexpected response from Exa (${res.status}).`, hooks: [] };
    const data = ((json as { data?: unknown[] } | null)?.data ?? []) as Record<string, unknown>[];
    const hooks = data.map((h) => ({ id: String(h.id ?? ""), url: String(h.url ?? ""), status: String(h.status ?? ""), events: Array.isArray(h.events) ? h.events.map(String) : [] }));
    return { ok: true, status: res.status, detail: "Exa accepted the key (webhook listing, nothing billed).", hooks };
  } catch {
    return { ok: false, status: null, detail: "Exa could not be reached.", hooks: [] };
  }
}

/** Registers our Exa webhook. The signing secret is returned once, to the caller only; it is never stored or logged here. */
export async function createExaWebhook(url: string): Promise<{ ok: true; id: string; secret: string } | { ok: false; detail: string }> {
  try {
    const { res, json } = await exa("/websets/v0/webhooks", { method: "POST", body: JSON.stringify({ url, events: EXA_EVENTS, metadata: { app: "the-art-of-connect" } }) });
    if (!res) return { ok: false, detail: "EXA_API_KEY is not set." };
    const j = (json ?? {}) as { id?: string; secret?: string; message?: string; error?: string };
    if (!res.ok || !j.id || !j.secret) return { ok: false, detail: `Exa did not create the webhook (${res.status}${j.message || j.error ? `: ${String(j.message ?? j.error).slice(0, 200)}` : ""}).` };
    return { ok: true, id: j.id, secret: j.secret };
  } catch {
    return { ok: false, detail: "Exa could not be reached." };
  }
}

export async function deleteExaWebhook(id: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{4,100}$/.test(id)) return false;
  try { const { res } = await exa(`/websets/v0/webhooks/${id}`, { method: "DELETE" }); return Boolean(res?.ok); } catch { return false; }
}

export { verifyExaSignature, verifyParallelSignature } from "./webhook-signatures.ts";
