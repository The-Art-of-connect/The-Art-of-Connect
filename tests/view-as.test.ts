import { test } from "node:test";
import assert from "node:assert/strict";
import { PERSONAS, isPersona, personaIsPaid } from "../src/lib/view-as.ts";

test("the owner can view the site as a free account and each paid membership", () => {
  assert.deepEqual(Object.keys(PERSONAS), ["free", "paid-individual", "paid-business", "paid-bundle", "executive-private", "elite-concierge"]);
  assert.ok(!isPersona("admin") && !isPersona(""));
});

test("membership access v2: the free persona has only The Art of Becoming; every paid persona includes it", () => {
  assert.deepEqual(PERSONAS.free.experiences, ["counseling"]);
  assert.equal(personaIsPaid("free"), false);
  for (const k of ["paid-individual", "paid-business", "paid-bundle", "executive-private", "elite-concierge"]) {
    assert.ok(personaIsPaid(k), k);
    assert.ok(PERSONAS[k].experiences.includes("counseling"), k);
  }
});
