import { createHmac, timingSafeEqual } from "node:crypto";

/** Signature checks for CONNECT 360 provider webhooks (pure functions; no secrets are logged). */
// ─── Signature verification for incoming deliveries ──────────────────────────────────────
const safeEq = (a: string, b: string) => { const x = Buffer.from(a); const y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
const FRESH_SECONDS = 300;

/** Exa: `Exa-Signature: t=<unix>,v1=<hex HMAC-SHA256 of "t.body">`. */
export function verifyExaSignature(header: string | null, raw: string, secret: string, now = Date.now()) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.trim().split("=", 2) as [string, string]));
  const t = Number(parts.t);
  if (!Number.isFinite(t) || Math.abs(now / 1000 - t) > FRESH_SECONDS) return false;
  const expected = createHmac("sha256", secret).update(`${parts.t}.${raw}`).digest("hex");
  return header.split(",").some((p) => { const [k, v] = p.trim().split("=", 2); return k === "v1" && typeof v === "string" && safeEq(v, expected); });
}

/** Parallel (Standard Webhooks): HMAC-SHA256 over "id.timestamp.body", keyed with the base64-decoded whsec_ secret. */
export function verifyParallelSignature(h: { id: string | null; timestamp: string | null; signature: string | null }, raw: string, secret: string, now = Date.now()) {
  if (!h.id || !h.timestamp || !h.signature || !secret.startsWith("whsec_")) return false;
  const t = Number(h.timestamp);
  if (!Number.isFinite(t) || Math.abs(now / 1000 - t) > FRESH_SECONDS) return false;
  const expected = createHmac("sha256", Buffer.from(secret.slice(6), "base64")).update(`${h.id}.${h.timestamp}.${raw}`).digest("base64");
  return h.signature.split(" ").some((s) => { const [v, sig] = s.split(",", 2); return v === "v1" && typeof sig === "string" && safeEq(sig, expected); });
}
