// Phased onboarding: registry, duplicate prevention, reuse, save/resume, eligibility.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_REGISTRY, ageEligibility, matchmakingBlockers, remainingQuestions, resumePoint, reuseAnswers,
  shareableAnswers, stageProgress, validateRegistry, withOwnerSettings, type ActivationInput, type Question,
} from "../src/lib/onboarding.ts";

const today = new Date(Date.UTC(2026, 10, 25));

test("the default registry is valid", () => {
  assert.deepEqual(validateRegistry(DEFAULT_REGISTRY), []);
});

test("duplicate ids and duplicate information are rejected", () => {
  const dupe: Question = { ...DEFAULT_REGISTRY[0], id: "q.legal_name_again" };
  assert.match(validateRegistry([...DEFAULT_REGISTRY, dupe]).join(), /same information/);
  assert.match(validateRegistry([...DEFAULT_REGISTRY, DEFAULT_REGISTRY[1]]).join(), /Duplicate question id/);
});

test("income and net worth can never be asked", () => {
  const q: Question = { id: "q.income", version: 1, stage: "compatibility", measures: "income", prompt: "Income", kind: "text", required: false };
  assert.match(validateRegistry([...DEFAULT_REGISTRY, q]).join(), /never required/);
});

test("answers given at registration are reused, not asked again", () => {
  const ctx = { track: "single" as const, answers: {}, prior: { "registration.date_of_birth": "1985-04-02" } };
  assert.equal(reuseAnswers(DEFAULT_REGISTRY, ctx)["q.date_of_birth"], "1985-04-02");
  assert.ok(!remainingQuestions(DEFAULT_REGISTRY, "welcome", ctx).some((q) => q.id === "q.date_of_birth"));
});

test("singles-only questions are skipped for couples and general members", () => {
  const ids = remainingQuestions(DEFAULT_REGISTRY, "welcome", { track: "couple", answers: {} }).map((q) => q.id);
  assert.ok(!ids.includes("q.dating_preferences"));
  assert.equal(remainingQuestions(DEFAULT_REGISTRY, "compatibility", { track: "general", answers: {} }).length, 0);
});

test("save and resume picks up at the first unanswered required question", () => {
  const answers = { "q.legal_name": "A Member", "q.date_of_birth": "1980-01-01" };
  assert.deepEqual(resumePoint(DEFAULT_REGISTRY, { track: "single", answers }), { stage: "welcome", question: "q.location" });
  const p = stageProgress(DEFAULT_REGISTRY, "welcome", { track: "single", answers });
  assert.equal(p.answered, 2);
  assert.equal(p.total, 6);
  assert.equal(p.complete, false);
});

test("optional questions do not block a stage", () => {
  const answers = { "q.three_qualities": ["Calm"], "q.core_values": ["Honesty"], "q.ideal_lifestyle": "A mix of all of these" };
  assert.equal(stageProgress(DEFAULT_REGISTRY, "understanding", { track: "single", answers }).complete, true);
});

test("the owner can make a question required without code changes", () => {
  const reg = withOwnerSettings(DEFAULT_REGISTRY, { "q.proud_of_becoming": true });
  const answers = { "q.three_qualities": ["Calm"], "q.core_values": ["Honesty"], "q.ideal_lifestyle": "A mix of all of these" };
  assert.equal(stageProgress(reg, "understanding", { track: "single", answers }).complete, false);
});

test("private answers are never shared with other members", () => {
  const shared = shareableAnswers(DEFAULT_REGISTRY, { "q.legal_name": "X", "q.date_of_birth": "1980-01-01", "q.disagreement": "x", "q.core_values": ["Faith"] });
  assert.deepEqual(Object.keys(shared), ["q.core_values"]);
});

test("singles must be 30+, other members 21+", () => {
  assert.equal(ageEligibility("1996-11-26", "single", today).eligible, false); // turns 30 tomorrow
  assert.equal(ageEligibility("1996-11-25", "single", today).eligible, true); // 30 today
  assert.equal(ageEligibility("2005-11-26", "general", today).eligible, false); // 20
  assert.equal(ageEligibility("2005-11-25", "general", today).eligible, true); // 21 today
  assert.equal(ageEligibility("1990-02-30", "general", today).eligible, false); // invalid date
});

const ready: ActivationInput = {
  track: "single", dateOfBirth: "1980-01-01", emailConfirmed: true, identityVerified: true, idAgeConfirmed: true,
  photoVerified: true, agreementsAccepted: true, openSafetyRestriction: false, welcomeStageComplete: true,
};

test("matchmaking activates only when every verification is complete", () => {
  assert.deepEqual(matchmakingBlockers(ready, today), []);
  assert.equal(matchmakingBlockers({ ...ready, photoVerified: false }, today).length, 1);
  assert.equal(matchmakingBlockers({ ...ready, idAgeConfirmed: false }, today).length, 1);
  assert.equal(matchmakingBlockers({ ...ready, dateOfBirth: "2000-01-01" }, today).length, 1);
});

test("a safety restriction blocks matchmaking regardless of membership", () => {
  // Membership and payment are not inputs, so no plan can override this.
  assert.deepEqual(matchmakingBlockers({ ...ready, openSafetyRestriction: true }, today), ["Your account is under safety review."]);
});
