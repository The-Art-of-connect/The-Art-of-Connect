/**
 * Intelligent membership recommendations (founder directive 42). Pure: shared by the pop-up, the comparison, Journey's
 * rule-based guidance and tests. Works only from the centralized pricing and entitlement records (the catalogue).
 *
 *  • recommendFor(need): the LOWEST-priced published membership that actually unlocks the feature, plus up to two
 *    higher-value alternatives. Never Executive Private or Elite Concierge when a lower membership is enough.
 *  • Elite Concierge is invitation-only: never a purchase recommendation; shown as Most Comprehensive Access.
 *  • Best Value: the bundle with the greatest genuine saving against buying its societies separately (needs prices).
 *  • Prices are never invented: with no published price, comparisons are by benefits only.
 */
import { decide, type GateFacts, type Need } from "./gate.ts";
import { LEVEL_ORDER as LEVELS, levelOf, type Level } from "./membership-level.ts";

export type Plan = { slug: string; name: string; category: string; experiences: string[]; love_track?: string | null; monthly_price_cents: number | null; all_access?: boolean; benefits?: string[];
  /** Included Journey messages per month; null means unlimited (directive 44: never reduced by a level up). */
  journeyMessages?: number | null };
export type Current = { packageSlug: string | null; level: Level; experiences: readonly string[]; society: GateFacts["society"] };

const PAID = (e: readonly string[]) => e.filter((x) => x === "business" || x === "relationships");
export const levelOfPlan = (p: Plan): Level => levelOf({ packageSlug: p.slug.replace("+couples", ""), status: "active", experiences: p.experiences, eliteBadge: false });
const factsFor = (p: Plan, c: Current): GateFacts => ({ signedIn: true, level: levelOfPlan(p), experiences: p.experiences, society: c.society, live: { business: true, relationships: true }, preview: true });

/** Whether a plan unlocks a need (launch switches aside: they apply equally to every plan). */
export const unlocks = (p: Plan, need: Need, c: Current) => decide(need, factsFor(p, c)).kind === "allowed";
const price = (p: Plan) => p.monthly_price_cents ?? Number.POSITIVE_INFINITY;
const buyable = (p: Plan) => !p.all_access && p.slug !== "elite-concierge";
/** Couples plans for couples, singles plans for singles; everyone else may see either. */
const fitsSociety = (p: Plan, c: Current) => !p.love_track || !c.society || c.society === "business" || (c.society === "couples") === (p.love_track === "couple");

/**
 * Relationship status and membership level work together (directive 44 audit): every plan that includes In Love can carry
 * the couples experience through the Couples upgrade (a second, secure login for the partner and the shared space). These
 * options are added alongside the published plans; Elite Concierge already includes couples. The upgrade's price comes only
 * from the owner's pricing record — with no approved price, the option shows without a price.
 */
export const COUPLES_SUFFIX = "+couples";
export function withCouplesOptions(plans: Plan[], upgradeCents: number | null): Plan[] {
  const couplesAllowance = plans.find((p) => p.love_track === "couple")?.journeyMessages;
  const extra = plans
    .filter((p) => p.experiences.includes("relationships") && !p.love_track && !p.all_access)
    .map((p): Plan => ({
      ...p, slug: p.slug + COUPLES_SUFFIX, name: `${p.name} with the Couples upgrade`, love_track: "couple",
      monthly_price_cents: p.monthly_price_cents != null && upgradeCents != null ? p.monthly_price_cents + upgradeCents : null,
      journeyMessages: p.journeyMessages === null || couplesAllowance === null ? null
        : p.journeyMessages === undefined && couplesAllowance === undefined ? undefined : Math.max(p.journeyMessages ?? 0, couplesAllowance ?? 0),
    }));
  return [...plans, ...extra];
}
export const baseSlug = (slug: string) => slug.replace(COUPLES_SUFFIX, "");

/**
 * Directive 44 (permanent): what a member would lose by moving from one plan to another. A level up loses nothing:
 * every society, the membership level, the couples experience and the Journey allowance are kept or increased.
 */
export function losses(from: Plan | null, to: Plan): string[] {
  if (!from) return [];
  const out: string[] = [];
  for (const e of PAID(from.experiences)) if (!to.experiences.includes(e)) out.push(e === "business" ? "In Business" : "In Love");
  if (LEVELS.indexOf(levelOfPlan(to)) < LEVELS.indexOf(levelOfPlan(from))) out.push("your current membership level");
  if (from.love_track === "couple" && to.love_track !== "couple" && !to.all_access) out.push("the couples experience for you and your partner");
  const allowance = (p: Plan) => (p.journeyMessages === null || p.all_access ? Number.POSITIVE_INFINITY : p.journeyMessages ?? 0);
  if (from.journeyMessages !== undefined && to.journeyMessages !== undefined && allowance(to) < allowance(from)) out.push("part of your monthly Journey allowance");
  return out;
}
export const isLevelUp = (from: Plan | null, to: Plan) => losses(from, to).length === 0;

export type Recommendation = { plan: Plan; priceDifferenceCents: number | null; gains: string[] };
export function describe(p: Plan, c: Current, plans: Plan[]): Recommendation {
  const cur = plans.find((x) => x.slug === c.packageSlug) ?? null;
  const diff = p.monthly_price_cents == null ? null : p.monthly_price_cents - (cur?.monthly_price_cents ?? 0);
  const have = new Set(PAID(c.experiences));
  const gains = [
    ...PAID(p.experiences).filter((e) => !have.has(e)).map((e) => (e === "business" ? "In Business" : "In Love")),
    ...((["executive", "elite"] as Level[]).includes(levelOfPlan(p)) && !(["executive", "elite"] as Level[]).includes(c.level) ? ["CONNECT 360"] : []),
  ];
  return { plan: p, priceDifferenceCents: diff, gains };
}

export function recommendFor(need: Need, c: Current, plans: Plan[]): { recommended: Recommendation | null; alternatives: Recommendation[]; elite: boolean } {
  if (c.level === "elite") return { recommended: null, alternatives: [], elite: true };
  if (need.elite || need.level === "elite") return { recommended: null, alternatives: [], elite: true };
  // An upgrade keeps everything the member already has: never a plan that drops a society or lowers their level.
  const currentPlan = plans.find((x) => x.slug === c.packageSlug) ?? null;
  const keeps = (p: Plan) => PAID(c.experiences).every((e) => p.experiences.includes(e)) && LEVELS.indexOf(levelOfPlan(p)) >= LEVELS.indexOf(c.level) && isLevelUp(currentPlan, p);
  const fits = plans.filter((p) => buyable(p) && p.slug !== c.packageSlug && fitsSociety(p, c) && keeps(p) && unlocks(p, need, c))
    .sort((a, b) => price(a) - price(b) || PAID(a.experiences).length - PAID(b.experiences).length);
  if (!fits.length) return { recommended: null, alternatives: [], elite: false };
  const [first, ...rest] = fits;
  // Higher-value alternatives: only plans that include more than the recommendation.
  const more = rest.filter((p) => PAID(p.experiences).length > PAID(first.experiences).length || levelOfPlan(p) !== levelOfPlan(first)).slice(0, 2);
  return { recommended: describe(first, c, plans), alternatives: more.map((p) => describe(p, c, plans)), elite: false };
}

/** Best Value: the bundle with the largest genuine saving versus its societies bought separately. Null without prices. */
export function bestValue(plans: Plan[]): { slug: string; savingCents: number } | null {
  // The price of one society on its own (singles pricing; the couples plan covers two people, so it isn't a fair unit).
  const single = (e: string) => Math.min(...plans.filter((p) => p.category === "single" && p.love_track !== "couple" && PAID(p.experiences).length === 1 && p.experiences.includes(e)).map(price));
  let best: { slug: string; savingCents: number; pct: number } | null = null;
  for (const p of plans) {
    if (!buyable(p) || p.monthly_price_cents == null) continue;
    const parts = PAID(p.experiences);
    if (parts.length < 2) continue;
    const separate = parts.reduce((s, e) => s + single(e), 0);
    if (!Number.isFinite(separate)) continue;
    const saving = separate - p.monthly_price_cents;
    const pct = saving / separate;
    if (saving > 0 && (!best || pct > best.pct)) best = { slug: p.slug, savingCents: saving, pct };
  }
  return best && { slug: best.slug, savingCents: best.savingCents };
}

/** Most Comprehensive Access: the all-inclusive membership (Elite Concierge, invitation-only). */
export const mostComprehensive = (plans: Plan[]) => plans.find((p) => p.all_access)?.slug ?? null;

/** Recommended for You: the lowest plan covering what the member has plus what they said they want. */
export function recommendedForYou(c: Current, interests: ("business" | "relationships")[], plans: Plan[]): string | null {
  if (c.level === "elite") return null;
  const want = new Set([...PAID(c.experiences), ...interests]);
  if (!want.size) want.add(c.society === "business" ? "business" : "relationships");
  const currentPlan = plans.find((x) => x.slug === c.packageSlug) ?? null;
  const covers = plans.filter((p) => buyable(p) && fitsSociety(p, c) && [...want].every((e) => p.experiences.includes(e)) && isLevelUp(currentPlan, p))
    .sort((a, b) => price(a) - price(b) || PAID(a.experiences).length - PAID(b.experiences).length);
  const pick = covers[0];
  return pick && pick.slug !== c.packageSlug ? pick.slug : null;
}
