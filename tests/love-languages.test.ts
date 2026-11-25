import { test } from "node:test";
import assert from "node:assert/strict";
import { DISCOVERY_PAIRS, LANGUAGE_KEYS, completeRank, pairInsights, rankFromChoices } from "../src/lib/love-languages.ts";

test("the discovery pairs each language with every other exactly once", () => {
  const pairs = new Set(DISCOVERY_PAIRS.map((p) => [p.a.lang, p.b.lang].sort().join("-")));
  assert.equal(pairs.size, 10);
  for (const k of LANGUAGE_KEYS) assert.equal(DISCOVERY_PAIRS.filter((p) => p.a.lang === k || p.b.lang === k).length, 4);
});

test("ranking follows choices and always includes all five", () => {
  assert.deepEqual(rankFromChoices(["time", "time", "words", "time"]).slice(0, 2), ["time", "words"]);
  assert.equal(rankFromChoices([]).length, 5);
  assert.deepEqual(completeRank(["gifts", "bogus", "gifts"]), ["gifts", "touch", "words", "time", "service"]);
});

test("partner insights are gentle observations, never a score", () => {
  const out = pairInsights({ receive: ["time"], express: ["service"] }, { receive: ["words"], express: ["gifts"] });
  assert.ok(out.length >= 1);
  for (const line of out) assert.doesNotMatch(line, /\d+%|score|incompatible/i);
});
