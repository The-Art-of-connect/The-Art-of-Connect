import { test } from "node:test";
import assert from "node:assert/strict";
import { composePersonality, parsePersonality } from "../src/lib/journey-personality.ts";

test("sections round-trip through a saved version", () => {
  const v = { personality: "Graceful and grounded.", style: "Short, warm sentences.", growth: "", manifestations: "Morning intentions.", emotional: "Listen first.", safety: "Recommend 988 in a crisis." };
  const back = parsePersonality(composePersonality(v));
  assert.deepEqual(back, v);
});

test("free-form older versions land in the personality section", () => {
  assert.equal(parsePersonality("Be kind.").personality, "Be kind.");
});
