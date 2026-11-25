import { test } from "node:test";
import assert from "node:assert/strict";
import { IDENTITY_SELF_LOVE as C, assembleAnalysis, choiceKey, curriculumKeys, lessonReflectionKey } from "../src/lib/curricula/identity-self-love.ts";

test("founding curriculum has six lessons with every question from the brief", () => {
  assert.equal(C.lessons.length, 6);
  assert.deepEqual(C.lessons.map((l) => l.questions.length), [6, 7, 6, 5, 6, 6]);
  assert.equal(C.lessons[5].principles?.length, 6);
});

test("every answer has a guided explanation and an interpretation", () => {
  for (const l of C.lessons) for (const q of l.questions) {
    assert.ok(q.choices.length >= 3, q.key);
    for (const ch of q.choices) assert.ok(ch.guidance.length > 20 && ch.reading.text.length > 10, `${q.key}.${ch.key}`);
  }
});

test("stored keys are unique and valid", () => {
  const keys = curriculumKeys(C);
  assert.equal(new Set(keys).size, keys.length);
  for (const k of keys) assert.match(k, /^[a-z0-9_]{2,60}$/);
});

test("analysis is assembled from the member's answers, with no scores", () => {
  assert.equal(assembleAnalysis(C, {}), null);
  const a = assembleAnalysis(C, {
    [choiceKey("l1_alone_self")]: { answer: null, choices: ["same"] },
    [choiceKey("l2_guilt")]: { answer: null, choices: ["often"] },
    [lessonReflectionKey("when-nobody-is-around")]: { answer: "Reading by the window.", choices: null },
  })!;
  assert.match(a.discovered.join(" "), /Much the same person I am with others/);
  assert.match(a.discovered.join(" "), /Reading by the window/);
  assert.ok(a.qualities.some((t) => /consistent sense of self/.test(t)));
  assert.ok(a.growth.some((t) => /Guilt/.test(t)));
  assert.ok(a.forward.some((t) => /give one gift to yourself/.test(t)));
  assert.doesNotMatch(JSON.stringify(a), /\d+%|score|grade|pass|fail|diagnos/i);
});

test("analysis ignores choices that don't exist", () => {
  assert.equal(assembleAnalysis(C, { [choiceKey("l1_alone_self")]: { answer: null, choices: ["hacked"] } }), null);
});
