import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FOUNDER_PRINCIPLES, LEARNING_OBJECTIVES, starterEntries } from "../src/lib/journey-training-seed.ts";
import { TRAINING_CATEGORY_KEYS, draftRequest, formatTraining, parseDrafts, selectTraining } from "../src/lib/journey-training.ts";

const migration = readFileSync(new URL("../supabase/migrations/20261220000001_journey_training.sql", import.meta.url), "utf8");

test("all 14 founder categories exist in code and in the database seed", () => {
  assert.equal(TRAINING_CATEGORY_KEYS.length, 14);
  for (const k of TRAINING_CATEGORY_KEYS) {
    assert.ok(migration.includes(`('${k}',`), `missing category ${k}`);
    assert.ok(FOUNDER_PRINCIPLES[k]?.length >= 3, `no principles for ${k}`);
    assert.ok(LEARNING_OBJECTIVES[k]?.length >= 3, `no objectives for ${k}`);
  }
});

test("every starter entry has all seven parts and quotes only genuine founder principles", () => {
  const entries = starterEntries();
  assert.equal(entries.length, 28);
  for (const e of entries) {
    for (const k of ["topic", "scenario", "approach", "example_response", "safety"] as const) assert.ok(e[k].length > 5, `${e.topic}: ${k}`);
    assert.ok(e.follow_ups.length >= 2 && e.founder_principles.length >= 1, e.topic);
    for (const p of e.founder_principles) assert.ok(FOUNDER_PRINCIPLES[e.category].includes(p), `${e.topic} quotes a non-founder principle`);
    assert.doesNotMatch(`${e.example_response} ${e.approach}`, /diagnos(e|is) you|you have (a|an) (disorder|condition)|guarantee/i);
  }
});

test("Journey only receives relevant approved entries, capped, as principles not scripts", () => {
  const entries = starterEntries();
  const picked = selectTraining(entries, "My sister keeps asking to borrow money and I feel guilty saying no", { max: 3 });
  assert.ok(picked.length > 0 && picked.length <= 3);
  assert.ok(picked.some((e) => e.category === "boundaries" || e.category === "financial-mindset"));
  assert.equal(selectTraining(entries, "hi").length, 0);
  const block = formatTraining(picked, [{ title: "Boundaries & Independence", decisions: ["Faith question. Founder's decision: honor the member's faith."] }]);
  assert.match(block, /Never copy an example word for word/);
  assert.match(block, /Founder decisions \(authoritative\)/);
  assert.ok(block.length <= 6000);
});

test("drafts from Journey are validated and invented 'founder' quotes are demoted to interpretation", () => {
  const principles = FOUNDER_PRINCIPLES.boundaries;
  const req = draftRequest({ key: "boundaries", title: "Boundaries", description: "", founder_decisions: [] }, principles, ["Saying no"], "");
  assert.match(req, /JSON array/);
  const reply = `Here you go: [{"topic":"Holiday boundaries","scenario":"A member dreads a family holiday.","founder_principles":["${principles[0]}","Always obey your elders."],"interpretation":"Plan ahead.","approach":"Explore.","example_response":"That sounds stressful. What feels hardest?","follow_ups":["What would help?"],"safety":"Refer if unsafe.","founder_question":null},{"topic":"x"}]`;
  const drafts = parseDrafts(reply, "boundaries", principles);
  assert.equal(drafts.length, 1);
  assert.deepEqual(drafts[0].founder_principles, [principles[0]]);
  assert.match(drafts[0].interpretation, /Always obey your elders/);
  assert.equal(parseDrafts("not json", "boundaries", principles).length, 0);
});
