// Unit tests for the pricing calculator. Run: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { quote, normalizeSelection, selectionFromQuery, selectionToQuery, type PricingCatalogue } from "../src/lib/pricing.ts";

// Test-only catalogue. Real prices come from the owner portal, never from code.
const cat = (over: Partial<PricingCatalogue> = {}): PricingCatalogue => ({
  published: true, preview: false, currency: "usd", annual_discount_percent: 15, minimum_member_age: 40,
  couples_upgrade: { name: "Couples upgrade", description: "", monthly_price_cents: 1500 },
  referral_reward: null,
  experiences: [
    { experience: "business", name: "In Business", subtitle: "", description: "", benefits: [], monthly_price_cents: 4000 },
    { experience: "counseling", name: "In Life", subtitle: "", description: "", benefits: [], monthly_price_cents: 3000 },
    { experience: "relationships", name: "In Love", subtitle: "", description: "", benefits: [], monthly_price_cents: 5000 },
  ],
  tiers: [
    { slug: "signature", name: "Signature", description: "", experience_count: 1, benefits: [], eligibility: null, bundle_discount_percent: 0, annual_discount_percent: null, setup_fee_cents: null },
    { slug: "premier", name: "Premier", description: "", experience_count: 2, benefits: [], eligibility: null, bundle_discount_percent: 10, annual_discount_percent: null, setup_fee_cents: null },
    { slug: "elite", name: "Elite", description: "", experience_count: 3, benefits: [], eligibility: null, bundle_discount_percent: 20, annual_discount_percent: 25, setup_fee_cents: 2500 },
  ],
  addons: [
    { slug: "concierge", name: "Concierge", description: "", billing: "monthly", audience: "member", requires_experience: null, eligibility: null, price_cents: 2000 },
    { slug: "portrait", name: "Profile portrait", description: "", billing: "one_time", audience: "member", requires_experience: "relationships", eligibility: null, price_cents: 9900 },
  ],
  professional_packages: [],
  ...over,
});

test("single experience → Signature, no bundle discount", () => {
  const q = quote(cat(), { experiences: ["business"], interval: "month", couples: false, addons: [] });
  assert.equal(q.tier?.slug, "signature");
  assert.equal(q.monthlyTotal, 4000);
  assert.equal(q.bundleDiscountMonthly, 0);
  assert.equal(q.annualSavings, 0);
});

test("two experiences → Premier with 10% bundle discount", () => {
  const q = quote(cat(), { experiences: ["business", "relationships"], interval: "month", couples: false, addons: [] });
  assert.equal(q.tier?.slug, "premier");
  assert.equal(q.individualMonthly, 9000);
  assert.equal(q.bundleDiscountMonthly, 900);
  assert.equal(q.monthlyTotal, 8100);
  assert.equal(q.annualSavings, 900 * 12);
});

test("annual billing applies the global annual discount", () => {
  const q = quote(cat(), { experiences: ["business", "counseling"], interval: "year", couples: false, addons: [] });
  // 7000 - 10% = 6300/mo → 75600/yr - 15% = 64260
  assert.equal(q.annualTotal, 64260);
  assert.equal(q.recurringTotal, 64260);
  assert.equal(q.annualSavings, 7000 * 12 - 64260);
});

test("Elite uses its own annual discount override and setup fee", () => {
  const q = quote(cat(), { experiences: ["business", "counseling", "relationships"], interval: "year", couples: false, addons: [] });
  // 12000 - 20% = 9600/mo → 115200 - 25% = 86400
  assert.equal(q.tier?.slug, "elite");
  assert.equal(q.annualTotal, 86400);
  assert.equal(q.oneTimeTotal, 2500);
  assert.equal(q.dueToday, 86400 + 2500);
});

test("couples upgrade only applies when In Love is selected", () => {
  const withLove = quote(cat(), { experiences: ["relationships"], interval: "month", couples: true, addons: [] });
  assert.equal(withLove.couplesMonthly, 1500);
  assert.equal(withLove.monthlyTotal, 6500);
  const without = quote(cat(), { experiences: ["business"], interval: "month", couples: true, addons: [] });
  assert.equal(without.couplesMonthly, 0);
});

test("add-ons: monthly recurring, one-time due today, experience-restricted ones dropped", () => {
  const q = quote(cat(), { experiences: ["business"], interval: "month", couples: false, addons: ["concierge", "portrait"] });
  assert.equal(q.addonsMonthly, 2000);
  assert.equal(q.oneTimeTotal, 0); // portrait requires In Love, so it is removed
  const q2 = quote(cat(), { experiences: ["relationships"], interval: "month", couples: false, addons: ["portrait"] });
  assert.equal(q2.oneTimeTotal, 9900);
  assert.equal(q2.dueToday, 5000 + 9900);
});

test("promotion applies to the first period; tier-restricted codes respected", () => {
  const sel = { experiences: ["business", "counseling"] as const, interval: "month" as const, couples: false, addons: [] };
  const q = quote(cat(), { ...sel, experiences: [...sel.experiences] }, { code: "X", description: null, percent_off: 50, amount_off_cents: null, applies_to_tiers: [] });
  assert.equal(q.promotionDiscount, 3150);
  assert.equal(q.dueToday, 3150);
  const restricted = quote(cat(), { ...sel, experiences: [...sel.experiences] }, { code: "Y", description: null, percent_off: 50, amount_off_cents: null, applies_to_tiers: ["elite"] });
  assert.equal(restricted.promotionDiscount, 0);
  const fixed = quote(cat(), { ...sel, experiences: [...sel.experiences] }, { code: "Z", description: null, percent_off: null, amount_off_cents: 999999, applies_to_tiers: [] });
  assert.equal(fixed.dueToday, 0); // never negative
});

test("unpublished pricing → tier still shown, every amount null", () => {
  const c = cat();
  c.experiences = c.experiences.map((e) => ({ ...e, monthly_price_cents: null }));
  const q = quote(c, { experiences: ["business", "relationships"], interval: "year", couples: false, addons: [] });
  assert.equal(q.tier?.slug, "premier");
  assert.equal(q.priced, false);
  assert.equal(q.monthlyTotal, null);
  assert.equal(q.dueToday, null);
});

test("selection is normalized: duplicates and unknown values removed", () => {
  const s = normalizeSelection(cat(), { experiences: ["relationships", "business", "business", "bogus" as never], interval: "decade" as never, couples: true, addons: ["nope"] });
  assert.deepEqual(s.experiences, ["business", "relationships"]);
  assert.equal(s.interval, "month");
  assert.equal(s.couples, true);
  assert.deepEqual(s.addons, []);
});

test("shareable links round-trip", () => {
  const sel = { experiences: ["business", "relationships"] as never[], interval: "year" as const, couples: true, addons: ["concierge"] };
  const back = selectionFromQuery(Object.fromEntries(new URLSearchParams(selectionToQuery(sel))));
  assert.deepEqual(back, sel);
  assert.equal(selectionToQuery(sel), "experiences=business%2Clove&billing=annual&couples=1&addons=concierge");
});
