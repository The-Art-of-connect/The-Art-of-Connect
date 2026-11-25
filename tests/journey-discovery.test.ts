import { test } from "node:test";
import assert from "node:assert/strict";
import { CATEGORY_ANALYSIS_HEADINGS, DISCOVERY_CATEGORIES, discoveryInstructions, discoveryMode } from "../src/lib/journey-discovery.ts";
import { TRAINING_CATEGORY_KEYS } from "../src/lib/journey-training.ts";

test("every founder category has a discovery session", () => {
  assert.deepEqual(DISCOVERY_CATEGORIES.map((c) => c.key).sort(), [...TRAINING_CATEGORY_KEYS].sort());
});

test("Journey asks one adaptive question at a time and never pads conversations", () => {
  const t = discoveryInstructions(DISCOVERY_CATEGORIES[0], ["Objective"], ["Principle"], false);
  assert.match(t, /ONE meaningful, personalized question at a time/);
  assert.match(t, /Never repeat a question/);
  assert.match(t, /Never ask unnecessary questions to extend the conversation/);
  assert.match(t, /skips a question, accept it warmly/);
  assert.match(t, /Never assume childhood trauma/);
  assert.doesNotMatch(t, /exactly these headings/);
});

test("the individual analysis uses the founder's headings and separates member words from interpretation", () => {
  const t = discoveryInstructions(DISCOVERY_CATEGORIES[2], [], [], true);
  for (const h of CATEGORY_ANALYSIS_HEADINGS) assert.ok(t.includes(h), h);
  assert.match(t, /You shared/);
  assert.match(t, /Never invent information/);
});

test("categories route to the right Journey experience", () => {
  assert.equal(discoveryMode("dating"), "love");
  assert.equal(discoveryMode("business-leadership"), "business");
  assert.equal(discoveryMode("financial-mindset"), "life");
});
