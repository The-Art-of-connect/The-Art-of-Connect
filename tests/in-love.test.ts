import { test } from "node:test";
import assert from "node:assert/strict";
import { COUPLES_TABS, DAILY_QUESTIONS, SINGLES_TABS, questionFor } from "../src/lib/in-love.ts";

test("both partners see the same question all day, and it changes daily", () => {
  const morning = new Date("2026-12-01T08:00:00Z"), evening = new Date("2026-12-01T20:00:00Z"), next = new Date("2026-12-02T08:00:00Z");
  assert.equal(questionFor(morning).q, questionFor(evening).q);
  assert.notEqual(questionFor(morning).q, questionFor(next).q);
  assert.ok(DAILY_QUESTIONS.length >= 7);
});

test("contextual navigation stays inside In Love and is short", () => {
  assert.ok(SINGLES_TABS.length <= 4 && COUPLES_TABS.length <= 4);
  for (const t of [...SINGLES_TABS, ...COUPLES_TABS]) assert.match(t.href, /^\/app\/(relationships|connect\/messages)/);
});
