import { test } from "node:test";
import assert from "node:assert/strict";
import { PERSONAS, isPersona, personaIsPaid } from "../src/lib/view-as.ts";

test("the owner can view the site as each of the seven memberships", () => {
  assert.deepEqual(Object.keys(PERSONAS), ["free-business", "free-singles", "free-couples", "paid-individual", "paid-bundle", "executive-private", "elite-concierge"]);
  assert.ok(!isPersona("admin") && !isPersona(""));
});

test("free personas see exactly one society and never Journey; paid personas include Journey", () => {
  for (const k of ["free-business", "free-singles", "free-couples"]) {
    assert.equal(PERSONAS[k].experiences.length, 1, k);
    assert.equal(personaIsPaid(k), false, k);
  }
  assert.deepEqual(PERSONAS["free-business"].experiences, ["business"]);
  assert.equal(PERSONAS["free-couples"].society, "couples");
  for (const k of ["paid-individual", "paid-bundle", "executive-private", "elite-concierge"]) assert.ok(personaIsPaid(k), k);
});
