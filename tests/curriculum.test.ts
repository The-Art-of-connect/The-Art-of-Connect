import { test } from "node:test";
import assert from "node:assert/strict";
import { IDENTITY_SELF_LOVE as ISL } from "../src/lib/curricula/identity-self-love.ts";
import { EMOTIONAL_INTELLIGENCE as EI } from "../src/lib/curricula/emotional-intelligence.ts";
import { assembleAnalysis, choiceKey, curriculumKeys, journeyAnalysisRequest, parseSections, reflectionKey, type Curriculum } from "../src/lib/curricula/core.ts";

const ALL: Curriculum[] = [ISL, EI];
const text = (blocks: { paras: string[] }[] | null) => JSON.stringify(blocks);

test("founding curricula contain every lesson and question from the briefs", () => {
  assert.deepEqual(ISL.lessons.map((l) => l.questions.length), [6, 7, 6, 5, 6, 6]);
  assert.deepEqual(EI.lessons.map((l) => l.questions.length), [7, 7, 6, 6, 7, 8]);
  assert.equal(ISL.lessons[5].principles?.length, 6);
  assert.equal(EI.foundations?.length, 5);
  assert.equal(EI.scenarios?.length, 8);
  assert.deepEqual(EI.analysis.map((a) => a.title), ["Your Emotional Understanding", "Your Recognized Strengths", "Understanding Your Emotional Patterns", "Your Personal Growth", "Opportunities for Further Development", "Moving Forward"]);
});

test("every answer has a guided explanation and an interpretation that fits a heading", () => {
  for (const c of ALL) for (const l of c.lessons) for (const q of l.questions) {
    assert.ok(q.choices.length >= 3, q.key);
    for (const ch of q.choices) {
      assert.ok(ch.guidance.length > 20 && ch.reading.text.length > 10, `${q.key}.${ch.key}`);
      assert.ok(c.analysis.some((a) => a.key === ch.reading.kind), `${c.section} has no heading for ${ch.reading.kind}`);
    }
  }
});

test("stored keys are unique, valid and never shared between curricula", () => {
  const all = ALL.flatMap(curriculumKeys);
  assert.equal(new Set(all).size, all.length);
  for (const k of all) assert.match(k, /^[a-z0-9_]{2,60}$/);
});

test("analysis is assembled from the member's answers, with no scores", () => {
  assert.equal(assembleAnalysis(ISL, {}), null);
  const a = assembleAnalysis(ISL, {
    [choiceKey(ISL, "l1_alone_self")]: { answer: null, choices: ["same"] },
    [choiceKey(ISL, "l2_guilt")]: { answer: null, choices: ["often"] },
    [reflectionKey(ISL, "when-nobody-is-around")]: { answer: "Reading by the window.", choices: null },
  })!;
  assert.deepEqual(a.map((b) => b.title), ISL.analysis.map((s) => s.title));
  assert.match(text(a), /Much the same person I am with others/);
  assert.match(text(a), /Reading by the window/);
  assert.match(a[1].paras.join(" "), /consistent sense of self/);
  assert.match(a[2].paras.join(" "), /Guilt/);
  assert.match(a[3].paras.join(" "), /give one gift to yourself/);
  assert.doesNotMatch(text(a), /\d+%|score|grade|diagnos/i);
});

test("EI analysis never assumes growth the member hasn't described", () => {
  const a = assembleAnalysis(EI, { [choiceKey(EI, "l1_regret")]: { answer: null, choices: ["often"] } })!;
  assert.equal(a[3].title, "Your Personal Growth");
  assert.deepEqual(a[3].paras, [EI.analysis[3].empty]);
  const b = assembleAnalysis(EI, { [choiceKey(EI, "l6_changes")]: { answer: null, choices: ["many"] } })!;
  assert.match(b[3].paras[0], /real, meaningful changes/);
});

test("analysis ignores choices that don't exist", () => {
  assert.equal(assembleAnalysis(EI, { [choiceKey(EI, "l1_regret")]: { answer: null, choices: ["hacked"] } }), null);
});

test("Journey request fits the limit and Journey's reply maps back to the curriculum's headings", () => {
  const req = journeyAnalysisRequest(EI, { [choiceKey(EI, "l1_regret")]: { answer: null, choices: ["often"] } }, 3900)!;
  assert.ok(req.length <= 3900 && req.includes("Understanding Your Emotional Patterns"));
  const reply = EI.analysis.map((s, i) => `## ${s.title}\nParagraph ${i}`).join("\n");
  const blocks = parseSections(reply, EI.analysis.map((s) => s.title))!;
  assert.deepEqual(blocks.map((b) => b.paras[0]), ["Paragraph 0", "Paragraph 1", "Paragraph 2", "Paragraph 3", "Paragraph 4", "Paragraph 5"]);
  assert.equal(parseSections("just text", EI.analysis.map((s) => s.title)), null);
});
