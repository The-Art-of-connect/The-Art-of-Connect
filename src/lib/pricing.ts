/**
 * Membership pricing — pure functions shared by the browser (live totals in
 * the membership builder) and the server (authoritative totals at checkout).
 * No prices live in code: everything comes from the owner-managed catalogue
 * returned by the database function get_public_pricing(). When pricing is not
 * yet published, prices are null and every amount below is null.
 */
import type { Experience } from "@/lib/experiences";

export type Interval = "month" | "year";

export type PricingCatalogue = {
  published: boolean;
  preview: boolean;
  currency: string;
  annual_discount_percent: number | null;
  minimum_member_age: number;
  couples_upgrade: { name: string; description: string; monthly_price_cents: number | null };
  referral_reward: string | null;
  experiences: { experience: Experience; name: string; subtitle: string; description: string; benefits: string[]; monthly_price_cents: number | null }[];
  tiers: {
    slug: string;
    name: string;
    description: string;
    experience_count: number;
    benefits: string[];
    eligibility: string | null;
    bundle_discount_percent: number | null;
    annual_discount_percent: number | null;
    setup_fee_cents: number | null;
  }[];
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
  couples: boolean;
  addons: string[];
};

export type Quote = {
  tier: PricingCatalogue["tiers"][number] | null;
  priced: boolean;
  lines: { label: string; monthly_cents: number | null }[];
  individualMonthly: number | null;
  bundleDiscountMonthly: number | null;
  couplesMonthly: number | null;
  addonsMonthly: number | null;
  monthlyTotal: number | null;
  annualBeforeDiscount: number | null;
  annualDiscount: number | null;
  annualTotal: number | null;
  /** What the member pays each billing period (month or year), before one-time fees and promotions. */
  recurringTotal: number | null;
  oneTimeTotal: number | null;
  promotionDiscount: number | null;
  dueToday: number | null;
  /** Yearly saving versus paying for each experience separately, monthly. */
  annualSavings: number | null;
};

const pct = (cents: number, percent: number | null | undefined) => Math.round((cents * (Number(percent) || 0)) / 100);

/** Keeps only valid, active, de-duplicated experiences in display order. */
export function normalizeSelection(cat: PricingCatalogue, sel: Selection): Selection {
  const available = new Set(cat.experiences.map((e) => e.experience));
  const experiences = cat.experiences.map((e) => e.experience).filter((x) => sel.experiences.includes(x) && available.has(x));
  const addonSlugs = new Set(
    cat.addons
      .filter((a) => a.audience === "member" && (!a.requires_experience || experiences.includes(a.requires_experience)))
      .map((a) => a.slug),
  );
  return {
    experiences,
    interval: sel.interval === "year" ? "year" : "month",
    couples: sel.couples && experiences.includes("relationships"),
    addons: [...new Set(sel.addons)].filter((s) => addonSlugs.has(s)),
  };
}

export function tierFor(cat: PricingCatalogue, count: number) {
  return cat.tiers.find((t) => t.experience_count === count) ?? null;
}

export function quote(cat: PricingCatalogue, rawSel: Selection, promo?: Promotion | null): Quote {
  const sel = normalizeSelection(cat, rawSel);
  const tier = sel.experiences.length ? tierFor(cat, sel.experiences.length) : null;
  const chosen = cat.experiences.filter((e) => sel.experiences.includes(e.experience));
  const addons = cat.addons.filter((a) => sel.addons.includes(a.slug));

  const lines = chosen.map((e) => ({ label: e.name, monthly_cents: e.monthly_price_cents }));
  const priced =
    chosen.length > 0 &&
    chosen.every((e) => e.monthly_price_cents != null) &&
    tier?.bundle_discount_percent != null &&
    (!sel.couples || cat.couples_upgrade.monthly_price_cents != null) &&
    addons.every((a) => a.price_cents != null);

  const empty: Quote = {
    tier, priced: false, lines,
    individualMonthly: null, bundleDiscountMonthly: null, couplesMonthly: null, addonsMonthly: null,
    monthlyTotal: null, annualBeforeDiscount: null, annualDiscount: null, annualTotal: null,
    recurringTotal: null, oneTimeTotal: null, promotionDiscount: null, dueToday: null, annualSavings: null,
  };
  if (!priced || !tier) return empty;

  const individualMonthly = chosen.reduce((s, e) => s + (e.monthly_price_cents ?? 0), 0);
  const bundleDiscountMonthly = pct(individualMonthly, tier.bundle_discount_percent);
  const couplesMonthly = sel.couples ? cat.couples_upgrade.monthly_price_cents ?? 0 : 0;
  const addonsMonthly = addons.filter((a) => a.billing === "monthly").reduce((s, a) => s + (a.price_cents ?? 0), 0);
  const monthlyTotal = individualMonthly - bundleDiscountMonthly + couplesMonthly + addonsMonthly;

  const annualPercent = tier.annual_discount_percent ?? cat.annual_discount_percent ?? 0;
  const annualBeforeDiscount = monthlyTotal * 12;
  const annualDiscount = pct(annualBeforeDiscount, annualPercent);
  const annualTotal = annualBeforeDiscount - annualDiscount;
  const recurringTotal = sel.interval === "year" ? annualTotal : monthlyTotal;

  const oneTimeTotal = addons.filter((a) => a.billing === "one_time").reduce((s, a) => s + (a.price_cents ?? 0), 0) + (tier.setup_fee_cents ?? 0);

  // Promotions apply to the first billing period's membership charge only.
  let promotionDiscount = 0;
  if (promo && (!promo.applies_to_tiers?.length || promo.applies_to_tiers.includes(tier.slug))) {
    promotionDiscount = promo.percent_off ? pct(recurringTotal, promo.percent_off) : Math.min(promo.amount_off_cents ?? 0, recurringTotal);
  }

  const paidPerYear = sel.interval === "year" ? annualTotal : monthlyTotal * 12;
  const annualSavings = (individualMonthly + couplesMonthly + addonsMonthly) * 12 - paidPerYear;

  return {
    tier, priced: true, lines,
    individualMonthly, bundleDiscountMonthly, couplesMonthly, addonsMonthly, monthlyTotal,
    annualBeforeDiscount, annualDiscount, annualTotal, recurringTotal,
    oneTimeTotal, promotionDiscount,
    dueToday: recurringTotal - promotionDiscount + oneTimeTotal,
    annualSavings,
  };
}

export function formatMoney(cents: number | null | undefined, currency = "usd") {
  if (cents == null) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
}

/** Selection <-> shareable URL query (?experiences=business,love&billing=year&couples=1). */
const URL_KEYS: Record<Experience, string> = { business: "business", counseling: "life", relationships: "love" };
export function selectionToQuery(sel: Selection) {
  const p = new URLSearchParams();
  if (sel.experiences.length) p.set("experiences", sel.experiences.map((e) => URL_KEYS[e]).join(","));
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
  };
}
