import { test } from "node:test";
import assert from "node:assert/strict";
import { EI_AREAS, EI_KEYS } from "../src/lib/emotional-intelligence.ts";
import { QUESTION_KEYS } from "../src/lib/who-am-i.ts";

test("five learning areas, each complete", () => {
  assert.equal(EI_AREAS.length, 5);
  for (const a of EI_AREAS) {
    assert.ok(a.intro.length && a.topics.length && a.examples.length >= 4 && a.reflections.length && a.practice.steps.length, a.slug);
    assert.equal(a.scenario.options.filter((o) => o.aligned).length, 1, `${a.slug} has exactly one aligned response`);
  }
});

test("reflection keys are unique, valid for the database, and never collide with Who Am I?", () => {
  assert.equal(new Set(EI_KEYS).size, EI_KEYS.length);
  for (const k of EI_KEYS) { assert.match(k, /^[a-z0-9_]{2,60}$/); assert.ok(!QUESTION_KEYS.includes(k)); }
});

test("the twelve learning areas are all covered", () => {
  const text = JSON.stringify(EI_AREAS).toLowerCase();
  for (const t of ["self-awareness", "regulation", "motivation", "empathy", "relationship", "maturity", "availability", "trigger", "conflict", "accountab", "boundar", "resilience"]) assert.ok(text.includes(t), t);
});
