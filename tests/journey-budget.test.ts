// Journey spending controls: every limit is checked before OpenAI is called.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  INITIAL_MONTHLY_MESSAGES, PROPOSED_MESSAGE_PACKAGES, allowanceView, costCents, crossedThresholds, decide, trimHistory,
  type JourneySettings, type TierLimit, type Usage,
} from "../src/lib/journey-budget.ts";

const settings = (o: Partial<JourneySettings> = {}): JourneySettings => ({
  enabled: true, paidUsageAuthorized: true, companyMonthlyLimitCents: 50_000, ownerTestMonthlyLimitCents: 2_000,
  alertThresholds: [50, 80, 100], defaultModel: "m", perMinuteRequests: 6, maxInputChars: 4000,
  maxHistoryMessages: 12, maxHistoryChars: 12000, attachmentsEnabled: false,
  models: [{ id: "m", inputCentsPerMillion: 100, outputCentsPerMillion: 400, enabled: true }], ...o,
});
const tier = (o: Partial<TierLimit> = {}): TierLimit => ({
  packageSlug: "personal-society", monthlyMessages: 150, dailyMessages: 30, memberMonthlyLimitCents: 300, tierMonthlyLimitCents: 20_000, maxOutputTokens: 700, model: null, ...o,
});
const usage = (o: Partial<Usage> = {}): Usage => ({
  inFlight: 0, minuteRequests: 0, dayMessages: 0, periodMessages: 0, periodCents: 0, tierMonthCents: 0, companyMonthCents: 0, purchasedRemaining: 0, ...o,
});
const run = (o: { s?: Partial<JourneySettings>; t?: Partial<TierLimit> | null; u?: Partial<Usage>; chars?: number; ownerTest?: boolean; attach?: boolean } = {}) =>
  decide({ settings: settings(o.s), tier: o.t === null ? null : tier(o.t ?? {}), usage: usage(o.u), promptChars: 3000, messageChars: o.chars ?? 200, ownerTest: o.ownerTest, hasAttachment: o.attach });

test("the founder's initial allowances: one per membership, none unlimited, couples 250 shared", () => {
  assert.equal(INITIAL_MONTHLY_MESSAGES["personal-society"], 150);
  assert.equal(INITIAL_MONTHLY_MESSAGES["couples-membership"], 250);
  assert.equal(INITIAL_MONTHLY_MESSAGES["elite-concierge"], 750);
  assert.equal(Object.keys(INITIAL_MONTHLY_MESSAGES).length, 10);
  assert.ok(Object.values(INITIAL_MONTHLY_MESSAGES).every((n) => Number.isFinite(n) && n > 0));
  assert.deepEqual(PROPOSED_MESSAGE_PACKAGES.map((p) => p.priceCents), [499, 899, 1499, 2999]);
});

test("a normal request is allowed and reserves its worst-case cost", () => {
  const d = run();
  assert.equal(d.allowed, true);
  if (d.allowed) assert.equal(d.reserveCents, costCents(settings().models[0], Math.ceil(3200 / 4) + 16, 700));
});

test("the emergency switch and missing authorization stop everything", () => {
  assert.equal(run({ s: { enabled: false } }).allowed, false);
  assert.equal(run({ s: { paidUsageAuthorized: false } }).allowed, false);
});

test("fail closed: no model rate, no company budget or no membership limits means no request", () => {
  assert.equal(run({ s: { models: [{ id: "m", inputCentsPerMillion: null, outputCentsPerMillion: 400, enabled: true }] } }).allowed, false);
  assert.equal(run({ s: { companyMonthlyLimitCents: null } }).allowed, false);
  assert.equal(run({ t: { memberMonthlyLimitCents: null } }).allowed, false);
  assert.equal(run({ t: null }).allowed, false);
});

test("allowance used: purchased messages are used next, otherwise requests stop (never an automatic charge)", () => {
  assert.equal(run({ u: { periodMessages: 150 } }).allowed, false);
  const d = run({ u: { periodMessages: 150, purchasedRemaining: 3 } });
  assert.equal(d.allowed && d.usesPurchased, true);
});

test("daily limit, per-minute limit and one request at a time", () => {
  assert.equal(run({ u: { dayMessages: 30 } }).allowed, false);
  assert.equal(run({ u: { minuteRequests: 6 } }).allowed, false);
  assert.equal(run({ u: { inFlight: 1 } }).allowed, false);
});

test("member, membership and company spending caps", () => {
  assert.equal(run({ u: { periodCents: 300 } }).allowed, false);
  assert.equal(run({ u: { tierMonthCents: 20_000 } }).allowed, false);
  assert.equal(run({ u: { companyMonthCents: 50_000 } }).allowed, false);
});

test("input limits and attachments", () => {
  assert.equal(run({ chars: 4001 }).allowed, false);
  assert.equal(run({ chars: 0 }).allowed, false);
  assert.equal(run({ attach: true }).allowed, false);
  assert.equal(run({ attach: true, s: { attachmentsEnabled: true } }).allowed, true);
});

test("owner testing uses its own budget, never a member allowance", () => {
  assert.equal(run({ ownerTest: true, t: null }).allowed, true);
  assert.equal(run({ ownerTest: true, t: null, s: { ownerTestMonthlyLimitCents: null } }).allowed, false);
  assert.equal(run({ ownerTest: true, t: null, u: { periodCents: 2_000 } }).allowed, false);
});

test("conversation history is trimmed to the owner's limits, newest first", () => {
  const h = Array.from({ length: 20 }, (_, i) => ({ content: String(i).padStart(10, "x") }));
  assert.deepEqual(trimHistory(h, 3, 1000).map((m) => m.content.slice(-2)), ["17", "18", "19"]);
  assert.equal(trimHistory(h, 50, 25).length, 2);
});

test("member allowance display with 75 / 90 / 100% notices and reset date", () => {
  const end = new Date(Date.UTC(2026, 11, 25));
  assert.equal(allowanceView(150, 113, 0, end).notice, 75);
  assert.equal(allowanceView(150, 135, 0, end).notice, 90);
  const full = allowanceView(150, 150, 25, end);
  assert.deepEqual([full.remaining, full.notice, full.purchasedRemaining, full.resetsOn], [0, 100, 25, "2026-12-25"]);
  assert.equal(allowanceView(150, 10, 0, end).notice, null);
});

test("owner spending alerts fire once as each threshold is crossed", () => {
  assert.deepEqual(crossedThresholds(1000, 400, 850, [50, 80, 100]), [50, 80]);
  assert.deepEqual(crossedThresholds(1000, 850, 900, [50, 80, 100]), []);
});
