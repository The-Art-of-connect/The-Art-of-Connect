import { test } from "node:test";
import assert from "node:assert/strict";
import { AVATARS, cleanPrefs, JOURNEY_VOICES, LANGUAGES, OPENAI_VOICES, paceSpeed, styleInstructions, voicesFor } from "../src/lib/journey-customize.ts";
import { effectiveMode } from "../src/lib/journey.ts";

test("masculine and feminine voices for every model, and the voice always matches the presentation", () => {
  for (const pr of ["feminine", "masculine"] as const) {
    assert.ok(voicesFor({ live: false, presentation: pr }).length >= 4);
    assert.ok(voicesFor({ live: true, presentation: pr }).length > voicesFor({ live: false, presentation: pr }).length);
  }
  assert.ok(voicesFor({ live: false }).every((v) => !v.liveOnly));
  assert.equal(cleanPrefs({ presentation: "masculine", voice: "marin" }).voice, "cedar");
  assert.equal(cleanPrefs({ presentation: "feminine", voice: "halo" }).voice, "halo");
  const bad = cleanPrefs({ presentation: "neutral", voice: "celebrity", age: "12", language: "xx", personality: "rude", pace: "warp" });
  assert.deepEqual([bad.presentation, bad.voice, bad.age, bad.language, bad.personality, bad.pace], ["feminine", "marin", "none", "auto", "balanced", "natural"]);
  assert.equal(OPENAI_VOICES.length, 9);
});

test("voices are described by language and regional style only, with database-safe ids", () => {
  for (const v of JOURNEY_VOICES) {
    assert.match(v.id, /^[a-z]{2,20}$/);
    assert.ok(LANGUAGES.some((l) => l.id === v.language));
    assert.doesNotMatch(`${v.character} ${v.region}`, /black|white|asian|latin|hispanic|race|ethnic/i);
  }
  for (const l of ["en", "es", "fr", "pt", "zh", "ja", "ko", "ar", "hi", "de"]) assert.ok(LANGUAGES.some((x) => x.id === l), l);
});

test("style never overrides Journey's philosophy, follows the member's language, and never claims a demographic identity", () => {
  const t = styleInstructions(cleanPrefs({ presentation: "feminine", voice: "coral", age: "40-49", personality: "direct", language: "es", pace: "slower" }), true);
  assert.match(t, /philosophy, knowledge, accountability, emotional awareness and safety standards stay exactly the same in every language/);
  assert.match(t, /Converse in Spanish by default/);
  assert.match(t, /follow them naturally/);
  assert.match(t, /Never claim to be a person or to belong to any racial, ethnic or demographic group/);
  assert.match(t, /Never state or imply a specific age/);
  assert.match(t, /slower, unhurried pace/);
  assert.match(styleInstructions(cleanPrefs({ language: "auto" }), false), /Reply in the language the member uses/);
  assert.equal(paceSpeed("slower"), 0.9);
});

test("every paid plan reaches lessons and live voice through an experience it includes", () => {
  const businessOnly = { kind: "member", status: "active", amountCents: 2900, experiences: ["business"], packageSlug: "professional-society" } as never;
  assert.equal(effectiveMode("life", "standard", businessOnly), "business");
  const loveOnly = { kind: "member", status: "active", amountCents: 2900, experiences: ["relationships"], packageSlug: "personal-society" } as never;
  assert.ok(effectiveMode("life", "standard", loveOnly) !== null);
  assert.equal(effectiveMode("life", "none", null), null);
});

test("avatars: orbs plus 15 fictional portraits with neutral labels and an apparent age range", () => {
  assert.equal(AVATARS.filter((a) => a.image).length, 15);
  for (const a of AVATARS) {
    assert.match(a.id, /^[a-z-]{2,30}$/);
    if (a.image) { assert.match(a.label, /^Journey portrait \d+$/); assert.ok(a.age); }
  }
});

test("the database accepts exactly the voices in the catalog", async () => {
  const { readFileSync } = await import("node:fs");
  const sql = readFileSync(new URL("../supabase/migrations/20270102000001_personalization.sql", import.meta.url), "utf8");
  const listed = [...sql.matchAll(/voice in \(([^)]+)\)/g)][0][1].split(",").map((x) => x.trim().replace(/'/g, "")).sort();
  assert.deepEqual(listed, JOURNEY_VOICES.map((v) => v.id).sort());
});
