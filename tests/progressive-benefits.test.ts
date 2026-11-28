import { test } from "node:test";
import assert from "node:assert/strict";
import { isLevelUp, levelOfPlan, losses, recommendFor, recommendedForYou, type Current, type Plan } from "../src/lib/recommend.ts";
import { LEVEL_ORDER } from "../src/lib/membership-level.ts";
import { needForHref, type Need } from "../src/lib/gate.ts";

// Founder directive 44 (permanent): every level up keeps everything and adds more. Live plan data, allowances from
// journey_tier_limits (November 28, 2026).
const PLANS: Plan[] = [
  { slug: "professional-society", name: "The Professional Society", category: "single", experiences: ["business"], monthly_price_cents: 2999, journeyMessages: 125 },
  { slug: "personal-society", name: "The Personal Society", category: "single", experiences: ["relationships"], love_track: "single", monthly_price_cents: 3999, journeyMessages: 150 },
  { slug: "couples-membership", name: "Couples Membership", category: "single", experiences: ["relationships"], love_track: "couple", monthly_price_cents: 5999, journeyMessages: 250 },
  { slug: "dual-society", name: "Dual Society", category: "bundle", experiences: ["business", "relationships"], monthly_price_cents: 5999, journeyMessages: 225 },
  { slug: "executive-private", name: "Executive Private", category: "exclusive", experiences: ["business", "counseling", "relationships"], monthly_price_cents: 9999, journeyMessages: 450 },
  { slug: "elite-concierge", name: "Elite Concierge", category: "exclusive", experiences: ["business", "counseling", "relationships"], monthly_price_cents: 24999, all_access: true, journeyMessages: null },
];
const allowance = (p: Plan) => (p.journeyMessages === null ? Infinity : p.journeyMessages ?? 0);
const paid = (p: Plan) => p.experiences.filter((e) => e !== "counseling");

test("every possible combination: a level up never loses a society, level, couples experience or Journey allowance", () => {
  for (const from of PLANS) for (const to of PLANS) {
    if (from === to || !isLevelUp(from, to)) continue;
    for (const e of paid(from)) assert.ok(to.experiences.includes(e), `${from.slug} → ${to.slug} keeps ${e}`);
    assert.ok(LEVEL_ORDER.indexOf(levelOfPlan(to)) >= LEVEL_ORDER.indexOf(levelOfPlan(from)), `${from.slug} → ${to.slug} keeps the level`);
    assert.ok(allowance(to) >= allowance(from), `${from.slug} → ${to.slug} keeps the Journey allowance`);
    if (from.love_track === "couple") assert.ok(to.love_track === "couple" || to.all_access, `${from.slug} → ${to.slug} keeps couples`);
  }
});

test("every recommendation, from every plan, for every need, is a genuine level up", () => {
  const needs: Need[] = [{ experience: "relationships" }, { experience: "business" }, { level: "one" }, { level: "complete" }, needForHref("/app/connect360")!];
  for (const from of [null, ...PLANS]) for (const need of needs) {
    const society: Current["society"] = from?.love_track === "couple" ? "couples" : from?.slug === "professional-society" ? "business" : "singles";
    const c: Current = { packageSlug: from?.slug ?? null, level: from ? levelOfPlan(from) : "free", experiences: from ? from.experiences : ["counseling"], society };
    const r = recommendFor(need, c, PLANS);
    for (const rec of [r.recommended, ...r.alternatives].filter(Boolean)) assert.deepEqual(losses(from, rec!.plan), [], `${from?.slug ?? "free"} → ${rec!.plan.slug}`);
    const forYou = recommendedForYou(c, ["business", "relationships"], PLANS);
    if (forYou) assert.deepEqual(losses(from, PLANS.find((p) => p.slug === forYou)!), [], `${from?.slug ?? "free"} recommended for you → ${forYou}`);
  }
});

test("Couples Membership is never 'upgraded' to Dual Society (it would lose couples and Journey allowance)", () => {
  const couples = PLANS[2], dual = PLANS[3];
  assert.deepEqual(losses(couples, dual), ["the couples experience for you and your partner", "part of your monthly Journey allowance"]);
  const r = recommendFor({ experience: "business" }, { packageSlug: couples.slug, level: "one", experiences: couples.experiences, society: "couples" }, PLANS);
  assert.notEqual(r.recommended?.plan.slug, "dual-society");
});

test("moving to a smaller plan lists exactly what would be lost", () => {
  assert.deepEqual(losses(PLANS[3], PLANS[0]), ["In Love", "your current membership level", "part of your monthly Journey allowance"]);
  assert.ok(losses(PLANS[4], PLANS[3]).includes("your current membership level"));
  assert.deepEqual(losses(PLANS[0], PLANS[4]), []);
});
