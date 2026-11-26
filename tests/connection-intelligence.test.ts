import { test } from "node:test";
import assert from "node:assert/strict";
import { combineCouple, evaluate } from "../src/lib/connection-intelligence.ts";
import { recommendCircle } from "../src/lib/social.ts";

test("business: complementary expertise is compatible; nothing to offer each other is not", () => {
  const founder = { needs: ["finance", "marketing"], expertise: ["operations"], biz_goal: "partners" };
  const cfo = { expertise: ["finance"], needs: ["operations"], biz_goal: "partners" };
  const r = evaluate("business", founder, cfo);
  assert.equal(r.fit, "strong");
  assert.match(r.reasons.join(" "), /expertise in finance & funding complements/);
  assert.equal(evaluate("business", founder, { expertise: ["legal"], needs: ["legal"] }).fit, "unlikely");
});

test("mentorship: seeking and offering match in both directions, only where expertise meets need", () => {
  const mentee = { needs: ["sales"] }, mentor = { expertise: ["sales", "leadership"] };
  assert.equal(evaluate("mentorship_seek", mentee, mentor).fit !== "unlikely", true);
  assert.equal(evaluate("mentorship_offer", mentor, mentee).fit !== "unlikely", true);
  assert.equal(evaluate("mentorship_seek", mentee, { expertise: ["legal"] }).fit, "unlikely");
});

test("friendship: shared activities and social energy fit; opposite social styles with nothing shared do not", () => {
  assert.equal(evaluate("friendship", { activities: ["dining", "arts"], social_energy: "intimate" }, { activities: ["dining", "arts"], social_energy: "intimate" }).fit, "strong");
  assert.equal(evaluate("friendship", { activities: ["fitness"], social_energy: "intimate" }, { activities: ["games"], social_energy: "lively" }).fit, "unlikely");
});

test("travel: friendship compatibility is not travel compatibility", () => {
  const a = { activities: ["dining", "arts"], social_energy: "balanced", travel_style: "budget", pace: "packed" };
  const b = { activities: ["dining", "arts"], social_energy: "balanced", travel_style: "luxury", pace: "relaxed" };
  assert.notEqual(evaluate("friendship", a, b).fit, "unlikely");
  const t = evaluate("travel", a, b);
  assert.equal(t.fit, "unlikely");
  assert.match(t.reasons.join(" "), /travel styles differ/);
  assert.equal(evaluate("travel", { travel_style: "luxury", trip_types: ["beach", "food"], pace: "relaxed" }, { travel_style: "luxury", trip_types: ["beach", "food"], pace: "relaxed" }).fit, "strong");
});

test("couples friendships consider both partners' preferences", () => {
  const couple = combineCouple({ trip_types: ["beach", "cruise"], activities: ["dining"] }, { trip_types: ["cruise"], activities: ["dining", "music"] });
  assert.deepEqual(couple.trip_types, ["cruise"]);
  assert.equal(evaluate("couples_friendship", couple, { trip_types: ["cruise"], activities: ["dining"] }).fit !== "unlikely", true);
});

test("Elite status and wealth are never inputs: identical answers give identical results", () => {
  const a = { biz_stage: "executive", values: ["integrity"] };
  const withStatus = { ...a, elite: "yes", income: "very high" } as never;
  assert.deepEqual(evaluate("peers", a, a), evaluate("peers", a, withStatus));
});

test("circles are recommended with reasons, never assigned", () => {
  assert.equal(recommendCircle({ slug: "luxury-travel", kind: "specialized", interests: ["travel", "dining"] }, ["travel", "dining"]).level, "Naturally Aligned");
  assert.equal(recommendCircle({ slug: "social-gatherings", kind: "open", interests: ["social"] }, []).level, "Open Community");
  assert.equal(recommendCircle({ slug: "book-lovers", kind: "specialized", interests: ["books"] }, ["travel"]).level, "Explore Beyond Your Circle");
});
