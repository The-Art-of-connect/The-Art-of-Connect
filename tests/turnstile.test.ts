import { test } from "node:test";
import assert from "node:assert/strict";
import { allowedHostnames, siteverify, MAX_TOKEN_LENGTH } from "../src/lib/turnstile-core.ts";

const HOSTS = allowedHostnames("", "https://www.theartofconnect.com");
const fake = (body: unknown, status = 200) =>
  (async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })) as typeof fetch;
const good = { success: true, action: "sign_in", hostname: "www.theartofconnect.com", "error-codes": [] };

// ── Server-side rules (deterministic) ─────────────────────────────────
test("valid token for this form on our site is accepted", async () => {
  const r = await siteverify({ secret: "s", token: "t", expectedAction: "sign_in", allowedHostnames: HOSTS, fetchImpl: fake(good) });
  assert.equal(r.ok, true);
});

test("invalid token is refused", async () => {
  const r = await siteverify({ secret: "s", token: "t", fetchImpl: fake({ success: false, "error-codes": ["invalid-input-response"] }) });
  assert.deepEqual([r.ok, !r.ok && r.reason], [false, "invalid"]);
});

test("expired token is refused", async () => {
  const r = await siteverify({ secret: "s", token: "t", fetchImpl: fake({ success: false, "error-codes": ["timeout-or-duplicate"] }) });
  assert.deepEqual([r.ok, !r.ok && r.reason], [false, "expired_or_reused"]);
});

test("reused token is refused (second use of the same token)", async () => {
  const seen = new Set<string>();
  const cloudflare = (async (_u: unknown, init?: RequestInit) => {
    const token = new URLSearchParams(String(init?.body)).get("response")!;
    const dup = seen.has(token);
    seen.add(token);
    return new Response(JSON.stringify(dup ? { success: false, "error-codes": ["timeout-or-duplicate"] } : good));
  }) as typeof fetch;
  const first = await siteverify({ secret: "s", token: "once", expectedAction: "sign_in", allowedHostnames: HOSTS, fetchImpl: cloudflare });
  const second = await siteverify({ secret: "s", token: "once", expectedAction: "sign_in", allowedHostnames: HOSTS, fetchImpl: cloudflare });
  assert.equal(first.ok, true);
  assert.deepEqual([second.ok, !second.ok && second.reason], [false, "expired_or_reused"]);
});

test("missing and oversized tokens never reach Cloudflare", async () => {
  let calls = 0;
  const f = (async () => (calls++, new Response("{}"))) as typeof fetch;
  for (const token of [null, "", undefined]) assert.equal((await siteverify({ secret: "s", token, fetchImpl: f })).ok, false);
  const big = await siteverify({ secret: "s", token: "x".repeat(MAX_TOKEN_LENGTH + 1), fetchImpl: f });
  assert.deepEqual([big.ok, !big.ok && big.reason], [false, "malformed"]);
  assert.equal(calls, 0);
});

test("token solved for a different form is refused", async () => {
  const r = await siteverify({ secret: "s", token: "t", expectedAction: "sign_up", allowedHostnames: HOSTS, fetchImpl: fake(good) });
  assert.deepEqual([r.ok, !r.ok && r.reason], [false, "action_mismatch"]);
});

test("token solved on another website is refused", async () => {
  const r = await siteverify({ secret: "s", token: "t", expectedAction: "sign_in", allowedHostnames: HOSTS, fetchImpl: fake({ ...good, hostname: "evil.example" }) });
  assert.deepEqual([r.ok, !r.ok && r.reason], [false, "hostname_mismatch"]);
});

test("fails closed when Cloudflare is down or the secret is missing", async () => {
  const down = (async () => { throw new Error("network"); }) as typeof fetch;
  assert.equal((await siteverify({ secret: "s", token: "t", fetchImpl: down })).ok, false);
  assert.equal((await siteverify({ secret: "s", token: "t", fetchImpl: fake({}, 500) })).ok, false);
  const noSecret = await siteverify({ secret: "", token: "t", fetchImpl: fake(good) });
  assert.deepEqual([noSecret.ok, !noSecret.ok && noSecret.reason], [false, "not_configured"]);
});

test("sends the secret, token and visitor IP to Cloudflare", async () => {
  let sent: URLSearchParams | null = null;
  const f = (async (_u: unknown, init?: RequestInit) => ((sent = new URLSearchParams(String(init?.body))), new Response(JSON.stringify(good)))) as typeof fetch;
  await siteverify({ secret: "sec", token: "tok", remoteip: "203.0.113.7", fetchImpl: f });
  assert.deepEqual([sent!.get("secret"), sent!.get("response"), sent!.get("remoteip")], ["sec", "tok", "203.0.113.7"]);
});

test("allowed hostnames include our three domains", () => {
  for (const h of ["theartofconnect.com", "www.theartofconnect.com", "theartofconnect.netlify.app"]) assert.ok(HOSTS.includes(h));
});

// ── Against Cloudflare's real Siteverify API, using Cloudflare's official
//    test secrets (run with TURNSTILE_LIVE_TESTS=1; needs internet). ──────
const live = process.env.TURNSTILE_LIVE_TESTS === "1";
const DUMMY = "XXXX.DUMMY.TOKEN.XXXX";
test("Cloudflare (live): always-pass test secret → accepted", { skip: !live }, async () => {
  assert.equal((await siteverify({ secret: "1x0000000000000000000000000000000AA", token: DUMMY })).ok, true);
});
test("Cloudflare (live): always-fail test secret → invalid", { skip: !live }, async () => {
  const r = await siteverify({ secret: "2x0000000000000000000000000000000AA", token: DUMMY });
  assert.deepEqual([r.ok, !r.ok && r.reason], [false, "invalid"]);
});
test("Cloudflare (live): spent-token test secret → expired or reused", { skip: !live }, async () => {
  const r = await siteverify({ secret: "3x0000000000000000000000000000000AA", token: DUMMY });
  assert.deepEqual([r.ok, !r.ok && r.reason], [false, "expired_or_reused"]);
});
test("Cloudflare (live): test token from another site is refused by our hostname rule", { skip: !live }, async () => {
  // Cloudflare's test keys report hostname "example.com" — not ours.
  const r = await siteverify({ secret: "1x0000000000000000000000000000000AA", token: DUMMY, allowedHostnames: HOSTS });
  assert.deepEqual([r.ok, !r.ok && r.reason], [false, "hostname_mismatch"]);
});
