// Directive 51 section 5: monthly dollar allowances at actual AI cost; text and voice share one balance.
import { test } from "node:test";
import assert from "node:assert/strict";
import { balanceLabel, decide, dollarView, hasBalance, isAllowanceMode, type JourneySettings, type TierLimit, type Usage } from "../src/lib/journey-budget.ts";

const settings: JourneySettings = {
  enabled: true, paidUsageAuthorized: true, companyMonthlyLimitCents: 50_000, ownerTestMonthlyLimitCents: 2_000,
  alertThresholds: [50, 80, 100], defaultModel: "m", perMinuteRequests: 6, maxInputChars: 4000,
  maxHistoryMessages: 12, maxHistoryChars: 12000, attachmentsEnabled: false,
  models: [{ id: "m", inputCentsPerMillion: 100, outputCentsPerMillion: 400, enabled: true }],
};
const singles: TierLimit = { packageSlug: "personal-society", monthlyMessages: null, dailyMessages: null, memberMonthlyLimitCents: 500, tierMonthlyLimitCents: null, maxOutputTokens: 700, model: null, unlimited: false, fairUseDaily: 300, personMonthlyLimitCents: 500 };
const couples: TierLimit = { ...singles, packageSlug: "couples-membership", memberMonthlyLimitCents: 1000, personMonthlyLimitCents: 500 };
const usage = (o: Partial<Usage> = {}): Usage => ({ inFlight: 0, minuteRequests: 0, dayMessages: 0, periodMessages: 0, periodCents: 0, tierMonthCents: 0, companyMonthCents: 0, purchasedRemaining: 0, ...o });
const run = (t: TierLimit, u: Partial<Usage>) => decide({ settings, tier: t, usage: usage(u), promptChars: 3000, messageChars: 200 });

test("allowance mode: a dollar allowance with no message count and never unlimited", () => {
  assert.equal(isAllowanceMode(singles), true);
  assert.equal(isAllowanceMode({ ...singles, unlimited: true }), false);
  assert.equal(isAllowanceMode({ ...singles, monthlyMessages: 150 }), false);
});

test("within the allowance Journey replies; past it, it stops kindly unless the member bought more", () => {
  assert.equal(run(singles, { periodCents: 100 }).allowed, true);
  const d = run(singles, { periodCents: 499.9 });
  assert.equal(d.allowed, false);
  if (!d.allowed) assert.match(d.memberMessage, /included Journey allowance/);
  const bought = run(singles, { periodCents: 499.9, purchasedRemaining: 3 });
  assert.equal(bought.allowed && bought.usesPurchased, true);
});

test("couples: each person has $5 of the couple's $10", () => {
  assert.equal(run(couples, { periodCents: 400, personCents: 400 }).allowed, true);
  assert.equal(run(couples, { periodCents: 600, personCents: 499.9 }).allowed, false);
  assert.equal(run(couples, { periodCents: 999.9, personCents: 100 }).allowed, false);
});

test("one balance wording everywhere, in dollars", () => {
  const v = dollarView(2500, 340, 0, new Date("2026-12-28"));
  assert.equal(balanceLabel(v), "$21.60 of $25.00 included this month");
  assert.equal(hasBalance(v), true);
  assert.equal(hasBalance(dollarView(500, 500, 0, new Date())), false);
});

test("pay-as-you-go: a Free member's balance is their purchased Journey credits, worded once", async () => {
  const { creditsView } = await import("../src/lib/journey-budget.ts");
  assert.equal(balanceLabel(creditsView(12, new Date("2026-12-01"))), "12 Journey credits remaining");
  assert.equal(balanceLabel(creditsView(1, new Date("2026-12-01"))), "1 Journey credit remaining");
  assert.equal(hasBalance(creditsView(0, new Date())), false);
  assert.equal(hasBalance(creditsView(3, new Date())), true);
});
