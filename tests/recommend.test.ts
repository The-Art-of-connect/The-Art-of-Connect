import { test } from "node:test";
import assert from "node:assert/strict";
import { bestValue, isLevelUp, mostComprehensive, recommendedForYou, recommendFor, unlocks, type Current, type Plan } from "../src/lib/recommend.ts";
import { decide, needForHref, type Need } from "../src/lib/gate.ts";
import { levelOf } from "../src/lib/membership-level.ts";

// Founder directive 42: every membership level against every restricted feature, from the centralized plans.
const PLANS: Plan[] = [
  { slug: "professional-society", name: "The Professional Society", category: "single", experiences: ["business"], monthly_price_cents: 2999 },
  { slug: "personal-society", name: "The Personal Society", category: "single", experiences: ["relationships"], love_track: "single", monthly_price_cents: 3999 },
  { slug: "couples-membership", name: "Couples Membership", category: "single", experiences: ["relationships"], love_track: "couple", monthly_price_cents: 5999 },
  { slug: "dual-society", name: "Dual Society", category: "bundle", experiences: ["business", "relationships"], monthly_price_cents: 5999 },
  { slug: "executive-private", name: "Executive Private", category: "exclusive", experiences: ["business", "counseling", "relationships"], monthly_price_cents: 9999 },
  { slug: "elite-concierge", name: "Elite Concierge", category: "exclusive", experiences: ["business", "counseling", "relationships"], monthly_price_cents: 24999, all_access: true },
];
const member = (packageSlug: string | null, society: Current["society"] = "singles"): Current => {
  const p = PLANS.find((x) => x.slug === packageSlug);
  const experiences = p ? p.experiences : ["counseling"];
  return { packageSlug, society, experiences, level: levelOf({ packageSlug, status: packageSlug ? "active" : null, experiences, eliteBadge: false }) };
};
const MEMBERS = { free: member(null), professional: member("professional-society", "business"), singles: member("personal-society"), couples: member("couples-membership", "couples"), dual: member("dual-society"), executive: member("executive-private"), elite: member("elite-concierge") };
const NEEDS: Record<string, Need> = {
  "In Love": { experience: "relationships" }, "In Business": { experience: "business" }, "Connections and circles": { level: "one" },
  "CONNECT 360": needForHref("/app/connect360")!, "My Intelligence Office": needForHref("/app/connect360/intelligence")!, "Elite Concierge": { elite: true },
};

test("every level × every restricted feature: the recommendation always unlocks it, at the lowest price", () => {
  for (const [who, c] of Object.entries(MEMBERS)) for (const [what, need] of Object.entries(NEEDS)) {
    const facts = { signedIn: true, level: c.level, experiences: c.experiences, society: c.society, live: { business: true, relationships: true }, preview: false };
    const allowed = decide(need, facts).kind === "allowed";
    const r = recommendFor(need, c, PLANS);
    if (allowed || who === "elite") { assert.ok(!r.recommended || who !== "elite", `${who} → ${what}`); continue; }
    if (need.elite) { assert.equal(r.recommended, null, `${who} → ${what}: Elite is invitation-only`); continue; }
    // Directive 44: if no purchasable plan is a genuine level up that unlocks it, there is no recommendation (the comparison shows the options).
    const anyLevelUp = PLANS.some((p) => !p.all_access && p.slug !== c.packageSlug && unlocks(p, need, c) && isLevelUp(PLANS.find((x) => x.slug === c.packageSlug) ?? null, p)
      && (!p.love_track || c.society === "business" || (c.society === "couples") === (p.love_track === "couple")));
    if (!anyLevelUp) { assert.equal(r.recommended, null, `${who} → ${what}: no level up exists, so none is recommended`); continue; }
    assert.ok(r.recommended, `${who} → ${what} has a recommendation`);
    assert.ok(unlocks(r.recommended!.plan, need, c), `${who} → ${what}: ${r.recommended!.plan.slug} unlocks it`);
    // Every plan the member already holds must still be included after the upgrade.
    for (const e of c.experiences.filter((x) => x !== "counseling")) assert.ok(r.recommended!.plan.experiences.includes(e), `${who} → ${what}: keeps ${e}`);
    const cheaper = PLANS.filter((p) => p.slug !== c.packageSlug && !p.all_access && unlocks(p, need, c) && (p.monthly_price_cents ?? 0) < (r.recommended!.plan.monthly_price_cents ?? 0)
      && c.experiences.filter((x) => x !== "counseling").every((e) => p.experiences.includes(e))
      && (!p.love_track || c.society === "business" || (c.society === "couples") === (p.love_track === "couple")));
    assert.deepEqual(cheaper.map((p) => p.slug), [], `${who} → ${what}: nothing cheaper unlocks it`);
  }
});

test("never Executive Private when a lower membership is enough", () => {
  assert.equal(recommendFor({ experience: "relationships" }, MEMBERS.free, PLANS).recommended?.plan.slug, "personal-society");
  assert.equal(recommendFor({ experience: "business" }, MEMBERS.singles, PLANS).recommended?.plan.slug, "dual-society");
  assert.equal(recommendFor({ experience: "relationships" }, MEMBERS.couples.society === "couples" ? member(null, "couples") : MEMBERS.free, PLANS).recommended?.plan.slug, "couples-membership");
  assert.equal(recommendFor(NEEDS["CONNECT 360"], MEMBERS.dual, PLANS).recommended?.plan.slug, "executive-private");
});

test("alternatives offer genuinely more, with the price difference from the current plan", () => {
  const r = recommendFor({ experience: "relationships" }, MEMBERS.free, PLANS);
  assert.ok(r.alternatives.length > 0 && r.alternatives.every((a) => a.plan.experiences.length >= r.recommended!.plan.experiences.length));
  const up = recommendFor({ experience: "business" }, MEMBERS.singles, PLANS).recommended!;
  assert.equal(up.priceDifferenceCents, 5999 - 3999);
  assert.deepEqual(up.gains, ["In Business"]);
});

test("Elite Members are never offered an upgrade", () => {
  for (const need of Object.values(NEEDS)) assert.equal(recommendFor(need, MEMBERS.elite, PLANS).recommended, null);
  assert.equal(recommendedForYou(MEMBERS.elite, ["business"], PLANS), null);
});

test("Best Value is the genuine saving, not the highest price; Most Comprehensive is Elite Concierge", () => {
  assert.deepEqual(bestValue(PLANS), { slug: "dual-society", savingCents: 2999 + 3999 - 5999 });
  assert.equal(mostComprehensive(PLANS), "elite-concierge");
  assert.equal(bestValue(PLANS.map((p) => ({ ...p, monthly_price_cents: null }))), null, "no prices, no invented value");
});

test("Recommended for You follows stated interests and what the member already has", () => {
  assert.equal(recommendedForYou(MEMBERS.free, ["relationships"], PLANS), "personal-society");
  assert.equal(recommendedForYou(MEMBERS.singles, ["business"], PLANS), "dual-society");
  assert.equal(recommendedForYou(MEMBERS.dual, [], PLANS), null, "already covered: no upgrade implied");
});
