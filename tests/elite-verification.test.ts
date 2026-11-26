import { test } from "node:test";
import assert from "node:assert/strict";
import { compareNames, VERIFICATION_METHODS, ELITE_QUALIFICATIONS } from "../src/lib/elite.ts";

test("bank holder names are compared with the Stripe Identity verified name", () => {
  const v = { first: "Jenny", last: "Rosen" };
  assert.equal(compareNames(v, ["JENNY ROSEN"]), "match");
  assert.equal(compareNames(v, ["Rosen, Jenny A."]), "match");
  assert.equal(compareNames({ first: "José", last: "Núñez" }, ["Jose Nunez"]), "match");
  assert.equal(compareNames(v, ["Mark Rosen"]), "partial");
  assert.equal(compareNames(v, ["Someone Else"]), "no_match");
  assert.equal(compareNames(null, ["Jenny Rosen"]), "unavailable");
  assert.equal(compareNames(v, []), "unavailable");
});

test("every qualification states how it is verified, and Stripe data is never treated as income or net worth", () => {
  for (const q of ELITE_QUALIFICATIONS) assert.ok(VERIFICATION_METHODS[q.id], q.id);
  assert.match(VERIFICATION_METHODS.personal_income.never, /never treated as verified income/);
  assert.match(VERIFICATION_METHODS.net_worth.never, /never treated as net worth/);
  assert.match(VERIFICATION_METHODS.personal_income.documents, /verified by the owner/);
});
