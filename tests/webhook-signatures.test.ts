import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyExaSignature, verifyParallelSignature } from "../src/lib/webhook-signatures.ts";

const body = JSON.stringify({ id: "evt_fictional", type: "webset.idle", data: { id: "ws_fictional" } });

test("Exa: a correctly signed, fresh delivery is accepted", () => {
  const secret = "fictional_exa_secret_value";
  const t = Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  assert.equal(verifyExaSignature(`t=${t},v1=${sig}`, body, secret), true);
});

test("Exa: tampered body, wrong secret, stale timestamp and missing header are rejected", () => {
  const secret = "fictional_exa_secret_value";
  const t = Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  assert.equal(verifyExaSignature(`t=${t},v1=${sig}`, body + " ", secret), false);
  assert.equal(verifyExaSignature(`t=${t},v1=${sig}`, body, "other_secret_value"), false);
  const old = t - 3600;
  const oldSig = createHmac("sha256", secret).update(`${old}.${body}`).digest("hex");
  assert.equal(verifyExaSignature(`t=${old},v1=${oldSig}`, body, secret), false);
  assert.equal(verifyExaSignature(null, body, secret), false);
});

test("Parallel (Standard Webhooks): correct signature accepted; tampering and stale timestamps rejected", () => {
  const key = Buffer.from("fictional-parallel-signing-key-32b").toString("base64");
  const secret = `whsec_${key}`;
  const id = "msg_fictional";
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", Buffer.from(key, "base64")).update(`${id}.${ts}.${body}`).digest("base64");
  assert.equal(verifyParallelSignature({ id, timestamp: ts, signature: `v1,${sig}` }, body, secret), true);
  assert.equal(verifyParallelSignature({ id, timestamp: ts, signature: `v1,${sig}` }, body + "x", secret), false);
  assert.equal(verifyParallelSignature({ id: "msg_other", timestamp: ts, signature: `v1,${sig}` }, body, secret), false);
  const old = String(Number(ts) - 3600);
  assert.equal(verifyParallelSignature({ id, timestamp: old, signature: `v1,${sig}` }, body, secret), false);
  assert.equal(verifyParallelSignature({ id, timestamp: ts, signature: `v1,${sig}` }, body, "not-a-whsec"), false);
});
