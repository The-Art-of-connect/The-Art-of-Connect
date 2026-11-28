import { test } from "node:test";
import assert from "node:assert/strict";
import { nextStep } from "../src/lib/next-step.ts";

const base = { discoveryStarted: true, discoveryHref: "/app/know-yourself", level: "free", experiences: [] as string[], society: null, coupleJoined: null, paidJourney: false };

test("audit priority 3: every member gets one specific next action", () => {
  assert.equal(nextStep({ ...base, discoveryStarted: false }).label, "Begin The Art of Knowing Yourself");
  assert.equal(nextStep({ ...base, experiences: ["relationships"], society: "couples", coupleJoined: false }).label, "Invite your partner");
  assert.equal(nextStep({ ...base, level: "executive" }).label, "Open CONNECT 360");
  assert.equal(nextStep({ ...base, experiences: ["relationships"], society: "singles" }).label, "Find people");
  assert.equal(nextStep({ ...base, experiences: ["business"] }).label, "Open your business dashboard");
  assert.equal(nextStep(base).label, "Continue your discovery");
});

test("official names are used in next actions", () => {
  assert.match(nextStep({ ...base, level: "elite" }).label, /CONNECT 360/);
});
