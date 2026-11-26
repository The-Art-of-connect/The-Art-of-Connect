import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanGuideAnswers, guideDraftRequest, guideFromLesson, guideInstructions, guideRefForPath, pageContext, parseGuideDraft, type GuideModule } from "../src/lib/journey-guide.ts";
import { IDENTITY_SELF_LOVE } from "../src/lib/curricula/identity-self-love.ts";

const mod: GuideModule = {
  ref: "who-am-i/beyond-my-titles", title: "Beyond my titles", place: "The Art of Self", href: "/x", objectives: ["Meet yourself beyond your roles."],
  questions: [
    { key: "beyond_titles", prompt: "How would you describe yourself?", kind: "text" },
    { key: "core_values", prompt: "Choose values", kind: "multi", max: 2, options: [{ id: "Honesty", label: "Honesty" }, { id: "Peace", label: "Peace" }, { id: "Joy", label: "Joy" }] },
    { key: "pick", prompt: "Pick one", kind: "choice", options: [{ id: "a", label: "A" }, { id: "b", label: "B" }] },
    { key: "rank", prompt: "Order", kind: "rank", options: [{ id: "x", label: "X" }, { id: "y", label: "Y" }] },
  ],
};

test("instructions ask only the open questions and never claim to save", () => {
  const t = guideInstructions(mod, { beyond_titles: "Curious and kind" });
  assert.match(t, /Already answered[\s\S]*Curious and kind/);
  assert.ok(!t.split("Questions still to explore")[1].split("Already answered")[0].includes("How would you describe yourself?"));
  assert.match(t, /never save anything yourself/);
  assert.match(t, /never a diagnosis/);
});

test("contextual help follows the member's lead", () => {
  const t = guideInstructions(mod, {}, false, true);
  assert.match(t, /opened Journey from this page/);
  assert.match(t, /0 of 4 questions answered/);
});

test("drafts keep only known questions and valid options", () => {
  const reply = 'Here you go: {"answers": {"beyond_titles": "  I am curious ", "core_values": ["Peace", "Greed", "Joy", "Honesty"], "pick": "z", "rank": ["y", "x", "x"], "secret": "no"}}';
  assert.deepEqual(parseGuideDraft(mod, reply), { beyond_titles: "I am curious", core_values: ["Peace", "Joy"], rank: ["y", "x"] });
  assert.deepEqual(parseGuideDraft(mod, "not json"), {});
  assert.deepEqual(parseGuideDraft(mod, "{broken"), {});
});

test("empty answers are dropped so nothing is erased", () => {
  assert.deepEqual(cleanGuideAnswers(mod, { beyond_titles: "   ", pick: "" }), {});
});

test("draft request uses only the member's words and carries a transcript when spoken", () => {
  const r = guideDraftRequest(mod, "Member: I love quiet mornings.");
  assert.match(r, /ONLY what I actually said/);
  assert.match(r, /quiet mornings/);
  assert.match(r, /"core_values" \(an array of up to 2 option ids\)/);
});

test("curriculum lessons become guide modules with their stored keys", () => {
  const l = IDENTITY_SELF_LOVE.lessons[0];
  const g = guideFromLesson(IDENTITY_SELF_LOVE, l, "/x");
  assert.equal(g.ref, `identity-self-love/${l.slug}`);
  assert.equal(g.questions.length, l.questions.length + 1);
  assert.ok(g.questions[0].key.startsWith(IDENTITY_SELF_LOVE.keyPrefix));
  assert.equal(g.questions.at(-1)!.kind, "text");
});

test("pages map to their module or to a plain description", () => {
  assert.equal(guideRefForPath("/app/know-yourself/who-am-i/beyond-my-titles"), "who-am-i/beyond-my-titles");
  assert.equal(guideRefForPath("/emotional-intelligence/empathy"), "ei/empathy");
  assert.equal(guideRefForPath("/app/business"), null);
  assert.match(pageContext("/app/business/board")!, /Professional Society/);
  assert.match(pageContext("/app/know-yourself/boundaries")!, /Boundaries/);
  assert.equal(pageContext("/app?x=<script>"), null);
});
