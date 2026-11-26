// Unit tests for the membership package pricing engine. Run: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  annualIncentiveLabel, matchPackage, normalizeSelection, quote, selectionFromQuery, selectionToQuery,
  type MembershipPackage, type PricingCatalogue,
} from "../src/lib/pricing.ts";

// Test-only catalogue. Real prices come from the Owner Portal, never from code.
// Original package prices are used where known; the rest are test values.
const pkg = (p: Partial<MembershipPackage> & Pick<MembershipPackage, "slug" | "category" | "experiences">): MembershipPackage => ({
  name: p.slug, tagline: "", description: "", love_track: null, benefits: [], highlight: null,
  monthly_price_cents: null, annual_price_cents: null, annual_months_charged: null, onboarding_fee_cents: null, ...p,
});
const cat = (over: Partial<PricingCatalogue> = {}): PricingCatalogue => ({
  published: true, preview: false, currency: "usd", annual_months_charged: 10, minimum_member_age: 40,
  couples_upgrade: { name: "Couples upgrade", description: "", monthly_price_cents: 2000 },
  referral_reward: null,
  experiences: [],
  packages: [
    pkg({ slug: "professional-society", category: "single", experiences: ["business"], monthly_price_cents: 2999 }),
    pkg({ slug: "personal-society", category: "single", experiences: ["relationships"], love_track: "single", monthly_price_cents: 3999 }),
    pkg({ slug: "couples-membership", category: "single", experiences: ["relationships"], love_track: "couple", monthly_price_cents: 5999 }), // test value
    pkg({ slug: "dual-society", category: "bundle", experiences: ["business", "relationships"], monthly_price_cents: 5999, onboarding_fee_cents: 2500 }), // fee: test value
    pkg({ slug: "executive-private", category: "exclusive", experiences: ["business", "counseling", "relationships"], monthly_price_cents: 9999 }),
    pkg({ slug: "elite-concierge", category: "exclusive", experiences: ["business", "counseling", "relationships"], monthly_price_cents: 24999, annual_price_cents: 249990 }),
  ],
  addons: [
    { slug: "concierge", name: "Concierge", description: "", billing: "monthly", audience: "member", requires_experience: null, eligibility: null, price_cents: 1000 },
    { slug: "portrait", name: "Profile portrait", description: "", billing: "one_time", audience: "member", requires_experience: "relationships", eligibility: null, price_cents: 9900 },
  ],
  professional_packages: [],
  ...over,
});
const sel = (experiences: ("business" | "counseling" | "relationships")[], extra: Partial<Parameters<typeof quote>[1]> = {}) =>
  ({ experiences, interval: "month" as const, couples: false, addons: [] as string[], ...extra });

test("original prices: The Professional Society $29.99 and The Personal Society $39.99", () => {
  assert.equal(quote(cat(), sel(["business"])).monthlyTotal, 2999);
  const love = quote(cat(), sel(["relationships"]));
  assert.equal(love.pkg?.slug, "personal-society");
  assert.equal(love.monthlyTotal, 3999);
});

test("Dual Society: Business + Love is $59.99 and shows the saving versus separate memberships", () => {
  const q = quote(cat(), sel(["relationships", "business"]));
  assert.equal(q.pkg?.slug, "dual-society");
  assert.equal(q.monthlyTotal, 5999);
  assert.equal(q.separateMonthly, 2999 + 3999);
  assert.equal(q.bundleSavingsMonthly, 2999 + 3999 - 5999);
});

test("couples choose the Couples Membership, never the singles package", () => {
  const q = quote(cat(), sel(["relationships"], { couples: true }));
  assert.equal(q.pkg?.slug, "couples-membership");
  assert.equal(q.couplesMonthly, 0);
});

test("a couple on a bundle without a couples version adds the couples upgrade", () => {
  const q = quote(cat(), sel(["business", "relationships"], { couples: true }));
  assert.equal(q.pkg?.slug, "dual-society");
  assert.equal(q.couplesMonthly, 2000);
  assert.equal(q.monthlyTotal, 5999 + 2000);
});

test("membership access v2: The Art of Becoming is free, so choosing it never changes the paid membership", () => {
  assert.equal(quote(cat(), sel(["business", "counseling"])).pkg?.slug, "professional-society");
  assert.equal(quote(cat(), sel(["business", "counseling", "relationships"])).pkg?.slug, "dual-society");
  const onlyFree = quote(cat(), sel(["counseling"]));
  assert.equal(onlyFree.pkg, null);
  assert.equal(onlyFree.priced, false);
});

test("annual billing: 12 months for the price of 10", () => {
  const q = quote(cat(), sel(["business"], { interval: "year" }));
  assert.equal(q.monthsCharged, 10);
  assert.equal(q.annualTotal, 29990);
  assert.equal(q.recurringTotal, 29990);
  assert.equal(q.annualSavings, 2999 * 2);
});

test("a package's fixed annual price overrides the incentive", () => {
  const q = quote(cat(), sel([], { package: "elite-concierge", interval: "year" }));
  assert.equal(q.annualTotal, 249990);
});

test("exclusive memberships: Executive Private $99.99 and Elite Concierge $249.99 include all three", () => {
  const ex = quote(cat(), sel([], { package: "executive-private" }));
  assert.equal(ex.monthlyTotal, 9999);
  assert.deepEqual(normalizeSelection(cat(), sel([], { package: "executive-private" })).experiences, ["business", "counseling", "relationships"]);
  assert.equal(quote(cat(), sel(["business"], { package: "elite-concierge" })).monthlyTotal, 24999);
  // An unknown or non-exclusive "package" is ignored.
  assert.equal(matchPackage(cat(), sel(["business"], { package: "dual-society" })).pkg?.slug, "professional-society");
});

test("onboarding fee and one-time add-ons are due today; monthly add-ons recur", () => {
  const q = quote(cat(), sel(["business", "relationships"], { addons: ["concierge", "portrait"] }));
  assert.equal(q.pkg?.slug, "dual-society");
  assert.equal(q.monthlyTotal, 5999 + 1000);
  assert.equal(q.oneTimeTotal, 2500 + 9900);
  assert.equal(q.dueToday, 5999 + 1000 + 2500 + 9900);
});

test("promotions apply to the first period, optionally only to chosen packages", () => {
  const promo = { code: "FOUNDING", description: null, percent_off: 20, amount_off_cents: null, applies_to_tiers: ["dual-society"] };
  assert.equal(quote(cat(), sel(["business", "relationships"]), promo).promotionDiscount, 1200);
  assert.equal(quote(cat(), sel(["business"]), promo).promotionDiscount, 0);
});

test("unpublished pricing → package still matched, every amount null", () => {
  const draft = cat({ packages: cat().packages.map((p) => ({ ...p, monthly_price_cents: null })) });
  const q = quote(draft, sel(["business", "relationships"]));
  assert.equal(q.pkg?.slug, "dual-society");
  assert.equal(q.priced, false);
  assert.equal(q.dueToday, null);
});

test("selection is normalized: duplicates, unknown add-ons and couples-without-Love removed", () => {
  const n = normalizeSelection(cat(), { experiences: ["relationships", "business", "business"] as never, interval: "month", couples: true, addons: ["concierge", "nope", "concierge"] });
  assert.deepEqual(n.experiences, ["business", "relationships"]);
  assert.deepEqual(n.addons, ["concierge"]);
  assert.equal(normalizeSelection(cat(), sel(["business"], { couples: true })).couples, false);
});

test("shareable links round-trip, including exclusive packages", () => {
  const s = { experiences: ["business", "relationships"] as never, interval: "year" as const, couples: true, addons: ["concierge"], package: null };
  assert.deepEqual(selectionFromQuery(Object.fromEntries(new URLSearchParams(selectionToQuery(s)))), s);
  const e = selectionFromQuery(Object.fromEntries(new URLSearchParams(selectionToQuery({ ...s, package: "executive-private" }))));
  assert.equal(e.package, "executive-private");
});

test("annual incentive label", () => {
  assert.equal(annualIncentiveLabel(10), "12 months for the price of 10");
  assert.equal(annualIncentiveLabel(12), null);
});
