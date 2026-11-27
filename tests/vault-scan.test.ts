import { test } from "node:test";
import assert from "node:assert/strict";
import { openable, scanState, vaultKey } from "../src/lib/vault-scan.ts";

test("only NO_THREATS_FOUND is openable; every other GuardDuty result stays locked", () => {
  assert.equal(scanState("NO_THREATS_FOUND"), "clean");
  assert.equal(scanState("THREATS_FOUND"), "infected");
  for (const t of ["UNSUPPORTED", "ACCESS_DENIED", "FAILED", "something-new"]) assert.equal(scanState(t), "error");
  for (const t of [undefined, null, ""]) assert.equal(scanState(t), "pending");
  assert.deepEqual(["pending", "clean", "infected", "error", "missing"].filter((s) => openable(s as never)), ["clean"]);
});

test("object keys always live under vault/ and reject traversal", () => {
  assert.equal(vaultKey("r/abc/def/v1-aa"), "vault/r/abc/def/v1-aa");
  for (const bad of ["../etc/passwd", "/root", "r/../../x", "a b", ""]) assert.throws(() => vaultKey(bad));
});
