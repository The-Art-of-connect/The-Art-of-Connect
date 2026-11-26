import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanPrefs, OPENAI_VOICES, paceSpeed, styleInstructions } from "../src/lib/journey-customize.ts";
import { effectiveMode } from "../src/lib/journey.ts";

test("every presentation has OpenAI voices, and the voice always matches the presentation", () => {
  for (const pr of ["feminine", "masculine", "neutral"]) assert.ok(OPENAI_VOICES.some((v) => v.presentation === pr));
  assert.equal(cleanPrefs({ presentation: "masculine", voice: "marin" }).voice, "cedar");
  assert.equal(cleanPrefs({ presentation: "neutral" }).voice, "alloy");
  const bad = cleanPrefs({ voice: "celebrity", age: "12", language: "xx", personality: "rude", pace: "warp" });
  assert.deepEqual([bad.voice, bad.age, bad.language, bad.personality, bad.pace], ["marin", "none", "en", "balanced", "natural"]);
});

test("style never overrides Journey's philosophy, and never claims a demographic identity", () => {
  const t = styleInstructions(cleanPrefs({ presentation: "feminine", voice: "coral", age: "40-49", accent: "british", personality: "direct" }), true);
  assert.match(t, /philosophy, knowledge, accountability, emotional awareness and safety standards stay exactly the same/);
  assert.match(t, /Never claim to be a person or to belong to any racial, ethnic or demographic group/);
  assert.match(t, /Never state or imply a specific age/);
  assert.match(t, /British accent/);
  assert.doesNotMatch(styleInstructions(cleanPrefs({ accent: "british", language: "es" }), true), /British accent/);
  assert.equal(paceSpeed("slower"), 0.9);
});

test("every paid plan reaches lessons and live voice through an experience it includes", () => {
  const businessOnly = { kind: "member", status: "active", amountCents: 2900, experiences: ["business"], packageSlug: "professional-society" } as never;
  assert.equal(effectiveMode("life", "standard", businessOnly), "business");
  const loveOnly = { kind: "member", status: "active", amountCents: 2900, experiences: ["relationships"], packageSlug: "personal-society" } as never;
  assert.ok(effectiveMode("life", "standard", loveOnly) !== null);
  assert.equal(effectiveMode("life", "none", null), null);
});

test("avatars: orbs plus 15 fictional portraits, neutral labels, ids the database accepts", async () => {
  const { AVATARS } = await import("../src/lib/journey-customize.ts");
  assert.equal(AVATARS.filter((a) => a.image).length, 15);
  for (const a of AVATARS) {
    assert.match(a.id, /^[a-z-]{2,30}$/);
    if (a.image) assert.match(a.label, /^Journey portrait \d+$/);
  }
});
