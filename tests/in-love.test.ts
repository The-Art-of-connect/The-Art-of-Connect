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

import { REFLECTION_PROMPTS, isCouplesCircle, reflectionView } from "../src/lib/in-love.ts";
import { route } from "../src/lib/concierge.ts";
import { matchTerms } from "../src/lib/brand.ts";

test("private reflections: the viewer's own are private until shared; anything else came from the partner", () => {
  assert.equal(reflectionView({ user_id: "a", shared_at: null }, "a"), "mine-private");
  assert.equal(reflectionView({ user_id: "a", shared_at: "2026-12-01T00:00:00Z" }, "a"), "mine-shared");
  assert.equal(reflectionView({ user_id: "b", shared_at: "2026-12-01T00:00:00Z" }, "a"), "from-partner");
  assert.ok(REFLECTION_PROMPTS.length >= 5 && REFLECTION_PROMPTS.every((p) => p.endsWith("?")));
  assert.ok(COUPLES_TABS.some((t) => t.href === "/app/relationships/reflections"));
});

test("Couples Connection Circles: couples-only circles and Elite couples, never singles or open circles", () => {
  assert.ok(isCouplesCircle({ category: "couples", eligibility: "couples" }));
  assert.ok(isCouplesCircle({ category: "couples", eligibility: "elite" }));
  assert.ok(!isCouplesCircle({ category: "singles", eligibility: "singles" }));
  assert.ok(!isCouplesCircle({ category: "travel", eligibility: "all" }));
});

test("everyday language finds the Couples Connection Community and private reflections", () => {
  assert.equal(route("we'd love to meet other couples for a double date", "one")[0]?.href, "/app/relationships/community");
  assert.equal(route("I want to write a private reflection", "one")[0]?.href, "/app/relationships/reflections");
  assert.ok(matchTerms("couples community").some((t) => t.name === "Couples Connection Community"));
});
