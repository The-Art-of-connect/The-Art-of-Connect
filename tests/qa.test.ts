import { test } from "node:test";
import assert from "node:assert/strict";
import { featureState, QA_DEPARTMENTS, readiness, type QaFeature } from "../src/lib/qa.ts";

const base: QaFeature = { key: "x", department: "account", title: "X", href: "/", tracker_key: "x", peace_status: "not_tested", owner_status: "not_started", retest_required: false, owner_approved: false };
const built = { built: true, tests_passed: true, merged: true, deployed: true, operational: false, awaiting: null };

test("ten departments, in the founder's order", () => {
  assert.equal(QA_DEPARTMENTS.length, 10);
  assert.equal(QA_DEPARTMENTS[0].title, "Account and Registration");
  assert.equal(QA_DEPARTMENTS[9].title, "Security and Privacy");
});

test("a feature is operational only when the tracker says so", () => {
  assert.equal(featureState(null).key, "unfinished");
  assert.equal(featureState({ ...built, built: false }).key, "unfinished");
  assert.equal(featureState(built).key, "partial");
  assert.equal(featureState({ ...built, operational: true }).key, "operational");
});

test("launch readiness follows the testing workflow", () => {
  assert.deepEqual(readiness(base, { ...built, built: false }, 0), ["development"]);
  assert.deepEqual(readiness(base, built, 0), ["technical"]);
  assert.deepEqual(readiness({ ...base, peace_status: "passed" }, built, 0), ["review"]);
  assert.deepEqual(readiness({ ...base, peace_status: "passed", owner_status: "needs_changes", retest_required: true }, built, 1), ["correction"]);
  assert.deepEqual(readiness({ ...base, peace_status: "passed", retest_required: true }, built, 0), ["retest"]);
  assert.deepEqual(readiness({ ...base, owner_approved: true, owner_status: "passed" }, built, 0), ["approved"]);
  assert.deepEqual(readiness({ ...base, peace_status: "passed" }, { ...built, awaiting: "legal" }, 0), ["review", "external"]);
});
