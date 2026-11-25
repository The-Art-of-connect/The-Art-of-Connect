import { test } from "node:test";
import assert from "node:assert/strict";
import { MODULES, PILLARS, QUESTION_KEYS, VALUES, LESSONS } from "../src/lib/who-am-i.ts";

test("no question is ever asked twice across the program", () => {
  assert.equal(new Set(QUESTION_KEYS).size, QUESTION_KEYS.length);
  const prompts = MODULES.flatMap((m) => m.questions.map((q) => q.prompt.toLowerCase()));
  assert.equal(new Set(prompts).size, prompts.length);
});

test("question keys match what the database accepts", () => {
  for (const k of QUESTION_KEYS) assert.match(k, /^[a-z0-9_]{2,60}$/);
});

test("every module and lesson belongs to one of the six pillars", () => {
  const keys = new Set(PILLARS.map((p) => p.key));
  for (const m of MODULES) assert.ok(keys.has(m.pillar), m.slug);
  for (const l of LESSONS) assert.ok(keys.has(l.pillar), l.title);
  assert.equal(PILLARS.length, 6);
});

test("the values assessment allows at most five of the listed values", () => {
  const q = MODULES.flatMap((m) => m.questions).find((x) => x.type === "values")!;
  assert.ok((q.max ?? 5) <= 5 && q.options!.every((o) => VALUES.includes(o)));
});

test("module slugs are unique and URL-safe", () => {
  const slugs = MODULES.map((m) => m.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const s of slugs) assert.match(s, /^[a-z0-9-]+$/);
});
