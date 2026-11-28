import { test } from "node:test";
import assert from "node:assert/strict";
import { route } from "../src/lib/concierge.ts";

test("everyday language finds the right place", () => {
  assert.equal(route("I need a loan to open a second location", "executive")[0].id, "funding");
  assert.equal(route("How do I form an LLC in Georgia?", "free")[0].id, "start");
  assert.equal(route("help me with my résumé", "free")[0].id, "resume");
  assert.equal(route("I'm feeling overwhelmed and anxious", "free")[0].id, "wellness");
  assert.equal(route("I'd like to start dating again", "one")[0].id, "love");
});

test("results say whether the membership includes them, never hiding that a service exists", () => {
  const r = route("find funding for my business", "free");
  assert.equal(r[0].id, "funding");
  assert.equal(r[0].included, false);
  assert.equal(route("find funding for my business", "elite")[0].included, true);
});

test("nothing is suggested for empty or meaningless input", () => {
  assert.deepEqual(route("", "elite"), []);
  assert.deepEqual(route("zzzz", "elite"), []);
});
