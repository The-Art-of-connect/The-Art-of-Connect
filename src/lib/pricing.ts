/**
 * Membership pricing — pure functions shared by the browser (live totals in
 * the membership builder) and the server (authoritative totals at checkout).
 *
 * The model is the owner's: named PACKAGES, each with its own price, covering
 * an exact set of experiences (and, for In Love, a singles or couples track).
 * The builder matches the visitor's choices to a package and shows the saving
 * against buying those experiences separately. Exclusive memberships include
 * all three experiences plus premium benefits.
 *
 * No prices live in code: everything comes from the owner-managed catalogue
 * returned by get_public_pricing(). Until pricing is published every price is
 * null and every amount below is null.
 */
import type { Experience } from "@/lib/experiences";

export type Interval = "month" | "year";
export type LoveTrack = "single" | "couple";

export type MembershipPackage = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: "single" | "bundle" | "exclusive";
  experiences: Experience[];
  love_track: LoveTrack | null;
  benefits: string[];
  highlight: string | null;
  monthly_price_cents: number | null;
  annual_price_cents: number | null;
  annual_months_charged: number | null;
  onboarding_fee_cents: number | null;
};

export type PricingCatalogue = {
  published: boolean;
  preview: boolean;
  currency: string;
  /** Global annual incentive: a year is billed as this many months (12 = no incentive). */
  annual_months_charged: number | null;
  minimum_member_age: number;
  couples_upgrade: { name: string; description: string; monthly_price_cents: number | null };
  referral_reward: string | null;
  experiences: { experience: Experience; name: string; subtitle: string; description: string; benefits: string[] }[];
  packages: MembershipPackage[];
  addons: {
    slug: string;
    name: string;
    description: string;
    billing: "monthly" | "one_time";
    audience: "member" | "professional";
    requires_experience: Experience | null;
    eligibility: string | null;
    price_cents: number | null;
  }[];
  professional_packages: {
    slug: string;
    name: string;
    description: string;
    eligible_types: string[];
    benefits: string[];
    eligibility: string | null;
    monthly_price_cents: number | null;
    onboarding_fee_cents: number | null;
  }[];
};

export type Promotion = { code: string; description: string | null; percent_off: number | null; amount_off_cents: number | null; applies_to_tiers: string[] };

export type Selection = {
  experiences: Experience[];
  interval: Interval;
  /** In Love track: true = couple, false = single. Ignored without In Love. */
  couples: boolean;
  addons: string[];
  /** Explicit choice of an exclusive membership (Executive Private, Elite Concierge). */
  package?: string | null;
};

export type Quote = {
  pkg: MembershipPackage | null;
  priced: boolean;
  /** Package monthly price. */
  packageMonthly: number | null;
  /** Couples upgrade added when no couples-specific package exists for this combination. */
  couplesMonthly: number | null;
  addonsMonthly: number | null;
  monthlyTotal: number | null;
  /** What the same experiences cost as separate single memberships (null if not comparable). */
  separateMonthly: number | null;
  /** Monthly saving of the bundle versus separate memberships. */
  bundleSavingsMonthly: number | null;
  /** Months billed for a 12-month year. */
  monthsCharged: number | null;
  annualTotal: number | null;
  /** Yearly saving of annual billing versus paying monthly. */
  annualSavings: number | null;
  /** What the member pays each billing period, before one-time fees and promotions. */
  recurringTotal: number | null;
  oneTimeTotal: number | null;
  onboardingFee: number | null;
  promotionDiscount: number | null;
  dueToday: number | null;
};

const ORDER: Experience[] = ["business", "counseling", "relationships"];
const sameSet = (a: Experience[], b: Experience[]) => a.length === b.length && a.every((x) => b.includes(x));

/** Keeps only valid, de-duplicated experiences in display order, and valid add-ons. */
export function normalizeSelection(cat: PricingCatalogue, sel: Selection): Selection {
  const exclusive = sel.package ? cat.packages.find((p) => p.slug === sel.package && p.category === "exclusive") ?? null : null;
  const experiences = exclusive ? [...ORDER] : ORDER.filter((x) => sel.experiences?.includes(x));
  const addonSlugs = new Set(
    cat.addons.filter((a) => a.audience === "member" && (!a.requires_experience || experiences.includes(a.requires_experience))).map((a) => a.slug),
  );
  return {
    experiences,
    interval: sel.interval === "year" ? "year" : "month",
    couples: Boolean(sel.couples) && experiences.includes("relationships"),
    addons: [...new Set(sel.addons ?? [])].filter((s) => addonSlugs.has(s)),
    package: exclusive?.slug ?? null,
  };
}

/**
 * The package for a selection: an explicitly chosen exclusive membership, or
 * the single/bundle package covering exactly these experiences — preferring
 * one made for the chosen In Love track. A couple may use a general package
 * plus the couples upgrade; a single never gets a couples-only package.
 */
export function matchPackage(cat: PricingCatalogue, rawSel: Selection): { pkg: MembershipPackage | null; needsCouplesUpgrade: boolean } {
  const sel = normalizeSelection(cat, rawSel);
  if (sel.package) return { pkg: cat.packages.find((p) => p.slug === sel.package) ?? null, needsCouplesUpgrade: false };
  if (!sel.experiences.length) return { pkg: null, needsCouplesUpgrade: false };
  const candidates = cat.packages.filter((p) => p.category !== "exclusive" && sameSet(p.experiences, sel.experiences));
  if (!sel.experiences.includes("relationships")) return { pkg: candidates[0] ?? null, needsCouplesUpgrade: false };
  const track: LoveTrack = sel.couples ? "couple" : "single";
  const exact = candidates.find((p) => p.love_track === track);
  if (exact) return { pkg: exact, needsCouplesUpgrade: false };
  const general = candidates.find((p) => p.love_track === null) ?? (track === "couple" ? candidates.find((p) => p.love_track === "single") : undefined);
  return { pkg: general ?? null, needsCouplesUpgrade: Boolean(general) && track === "couple" };
}

/** Cheapest way to buy the same experiences as separate single memberships (null if any is unavailable/unpriced). */
function separatePrice(cat: PricingCatalogue, sel: Selection): number | null {
  if (sel.experiences.length < 2 && !sel.package) return null;
  let total = 0;
  for (const exp of sel.experiences) {
    const sel1: Selection = { experiences: [exp], interval: "month", couples: sel.couples, addons: [] };
    const { pkg, needsCouplesUpgrade } = matchPackage(cat, sel1);
    if (!pkg || pkg.monthly_price_cents == null) return null;
    total += pkg.monthly_price_cents + (needsCouplesUpgrade ? cat.couples_upgrade.monthly_price_cents ?? NaN : 0);
  }
  return Number.isFinite(total) ? total : null;
}

const pct = (cents: number, percent: number | null | undefined) => Math.round((cents * (Number(percent) || 0)) / 100);

export function quote(cat: PricingCatalogue, rawSel: Selection, promo?: Promotion | null): Quote {
  const sel = normalizeSelection(cat, rawSel);
  const { pkg, needsCouplesUpgrade } = matchPackage(cat, sel);
  const addons = cat.addons.filter((a) => sel.addons.includes(a.slug));
  const empty: Quote = {
    pkg, priced: false, packageMonthly: null, couplesMonthly: null, addonsMonthly: null, monthlyTotal: null,
    separateMonthly: null, bundleSavingsMonthly: null, monthsCharged: null, annualTotal: null, annualSavings: null,
    recurringTotal: null, oneTimeTotal: null, onboardingFee: null, promotionDiscount: null, dueToday: null,
  };
  const priced =
    pkg != null &&
    pkg.monthly_price_cents != null &&
    (!needsCouplesUpgrade || cat.couples_upgrade.monthly_price_cents != null) &&
    addons.every((a) => a.price_cents != null);
  if (!priced || !pkg) return empty;

  const packageMonthly = pkg.monthly_price_cents!;
  const couplesMonthly = needsCouplesUpgrade ? cat.couples_upgrade.monthly_price_cents! : 0;
  const addonsMonthly = addons.filter((a) => a.billing === "monthly").reduce((s, a) => s + a.price_cents!, 0);
  const monthlyTotal = packageMonthly + couplesMonthly + addonsMonthly;

  const separateMonthly = pkg.category === "single" ? null : separatePrice(cat, sel);
  const bundleSavingsMonthly = separateMonthly != null ? Math.max(0, separateMonthly - packageMonthly - couplesMonthly) : null;

  // Annual: a fixed annual package price if set, otherwise "12 months for the price of N".
  const monthsCharged = Number(pkg.annual_months_charged ?? cat.annual_months_charged ?? 12);
  const packageAnnual = pkg.annual_price_cents ?? Math.round(packageMonthly * monthsCharged);
  const extrasAnnual = Math.round((couplesMonthly + addonsMonthly) * monthsCharged);
  const annualTotal = packageAnnual + extrasAnnual;
  const annualSavings = Math.max(0, monthlyTotal * 12 - annualTotal);
  const recurringTotal = sel.interval === "year" ? annualTotal : monthlyTotal;

  const onboardingFee = pkg.onboarding_fee_cents ?? 0;
  const oneTimeTotal = addons.filter((a) => a.billing === "one_time").reduce((s, a) => s + a.price_cents!, 0) + onboardingFee;

  // Promotions apply to the first billing period's membership charge only.
  let promotionDiscount = 0;
  if (promo && (!promo.applies_to_tiers?.length || promo.applies_to_tiers.includes(pkg.slug))) {
    promotionDiscount = promo.percent_off ? pct(recurringTotal, promo.percent_off) : Math.min(promo.amount_off_cents ?? 0, recurringTotal);
  }

  return {
    pkg, priced: true, packageMonthly, couplesMonthly, addonsMonthly, monthlyTotal,
    separateMonthly, bundleSavingsMonthly, monthsCharged, annualTotal, annualSavings, recurringTotal,
    oneTimeTotal, onboardingFee, promotionDiscount,
    dueToday: recurringTotal - promotionDiscount + oneTimeTotal,
  };
}

export function formatMoney(cents: number | null | undefined, currency = "usd") {
  if (cents == null) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
}

/** "12 months for the price of 10" — or null when there is no annual incentive. */
export function annualIncentiveLabel(months: number | null | undefined) {
  const m = Number(months);
  if (!m || m >= 12) return null;
  return `12 months for the price of ${Number.isInteger(m) ? m : m.toFixed(1)}`;
}

/** Selection <-> shareable URL query (?experiences=business,love&billing=annual&couples=1&package=executive-private). */
const URL_KEYS: Record<Experience, string> = { business: "business", counseling: "life", relationships: "love" };
export function selectionToQuery(sel: Selection) {
  const p = new URLSearchParams();
  if (sel.package) p.set("package", sel.package);
  else if (sel.experiences.length) p.set("experiences", sel.experiences.map((e) => URL_KEYS[e]).join(","));
  if (sel.interval === "year") p.set("billing", "annual");
  if (sel.couples) p.set("couples", "1");
  if (sel.addons.length) p.set("addons", sel.addons.join(","));
  return p.toString();
}
export function selectionFromQuery(q: Record<string, string | string[] | undefined>): Selection {
  const get = (k: string) => (Array.isArray(q[k]) ? q[k]![0] : (q[k] as string | undefined)) ?? "";
  const byUrl = Object.fromEntries(Object.entries(URL_KEYS).map(([k, v]) => [v, k as Experience]));
  return {
    experiences: get("experiences").split(",").map((s) => byUrl[s.trim()] ?? (s.trim() as Experience)).filter(Boolean),
    interval: get("billing") === "annual" || get("billing") === "year" ? "year" : "month",
    couples: get("couples") === "1",
    addons: get("addons").split(",").map((s) => s.trim()).filter(Boolean),
    package: get("package").trim().slice(0, 40) || null,
  };
}
