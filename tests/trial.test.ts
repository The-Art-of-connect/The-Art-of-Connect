import { test } from "node:test";
import assert from "node:assert/strict";
import { TRIAL_DAYS, firstChargeDate, formatChargeDate, trialEligiblePackage } from "../src/lib/trial.ts";
import { autoRenewalStatement } from "../src/lib/legal-requirements.ts";

test("the trial is 15 days and the first charge is 15 days after it begins", () => {
  assert.equal(TRIAL_DAYS, 15);
  const start = new Date(Date.UTC(2026, 10, 26, 12));
  assert.equal(formatChargeDate(firstChargeDate(start)), "December 11, 2026");
});

test("every paid membership except Elite can be trialed", () => {
  for (const slug of ["professional-society", "personal-society", "couples-membership", "dual-society", "executive-private"]) assert.ok(trialEligiblePackage(slug), slug);
  assert.equal(trialEligiblePackage("elite-concierge"), false);
  assert.equal(trialEligiblePackage(null), false);
});

test("trial terms disclose the card requirement, first charge date and amount, cancellation and one trial per member", () => {
  const t = autoRenewalStatement({ packageName: "The Personal Society", amount: "$39.99", interval: "month", trialDays: 15, firstCharge: "December 11, 2026" });
  for (const part of ["15-day free trial", "valid card is required", "$39.99", "December 11, 2026", "every month", "cancel online at any time", "will not be charged if I cancel during the trial", "Only one trial"]) assert.ok(t.includes(part), part);
  assert.ok(!autoRenewalStatement({ packageName: "X", amount: "$1", interval: "month" }).includes("trial"));
});
