import { test } from "node:test";
import assert from "node:assert/strict";
import { COUPLES_SEASONS, FREQUENCIES, reportNarrative, seasonIdeas } from "../src/lib/growth.ts";

test("the five reporting choices from the founder's design", () => {
  assert.deepEqual(FREQUENCIES.map((f) => f.key), ["monthly", "quarterly", "semiannual", "annual", "on_demand"]);
});

test("reports describe only real records: nothing is invented and quiet periods are not judged", () => {
  const empty = reportNarrative({}, {}, null);
  assert.equal(empty.activity.length + empty.reported.length, 0);
  assert.match(empty.summary, /quieter period/);
  const r = reportNarrative({ sanctuary_entries: 3, goals_achieved: 1 }, { milestones: [{ title: "Launched my studio", kind: "business_launch", on: "2026-11-01" }], relationship_changes: [{ status: "engaged", since: null }] }, "2026-01-15");
  assert.deepEqual(r.activity, ["You returned to My Daily Sanctuary 3 times.", "You have achieved 1 personal goal so far."]);
  assert.deepEqual(r.reported, ["You recorded a milestone: Launched my studio.", "Your relationship status became engaged."]);
  for (const line of [...r.activity, ...r.reported, r.summary]) assert.doesNotMatch(line, /score|diagnos|%|\d+\/10/i);
});

test("couples ideas evolve by season and don't repeat day to day", () => {
  for (const stage of Object.keys(COUPLES_SEASONS)) {
    const a = seasonIdeas(stage, new Date("2026-12-01T12:00:00Z")), b = seasonIdeas(stage, new Date("2026-12-02T12:00:00Z"));
    assert.notDeepEqual(a.map((x) => x.title), b.map((x) => x.title));
  }
  assert.notDeepEqual(seasonIdeas("engaged").map((x) => x.title), seasonIdeas("married").map((x) => x.title));
});
