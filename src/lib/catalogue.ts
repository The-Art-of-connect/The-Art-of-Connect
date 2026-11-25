import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { EXPERIENCES, EXPERIENCE_ORDER } from "@/lib/experiences";
import type { PricingCatalogue, Promotion } from "@/lib/pricing";

/**
 * Used only when the database is unreachable: names and descriptions so the
 * pages still render. It contains NO prices — every amount is null.
 */
const OFFLINE: PricingCatalogue = {
  published: false,
  preview: false,
  currency: "usd",
  annual_discount_percent: null,
  minimum_member_age: 40,
  couples_upgrade: { name: "Couples upgrade", description: "Adds a second, secure login for your partner and your shared relationship space.", monthly_price_cents: null },
  referral_reward: null,
  experiences: EXPERIENCE_ORDER.map((k) => ({
    experience: k, name: EXPERIENCES[k].name, subtitle: EXPERIENCES[k].subtitle, description: EXPERIENCES[k].summary,
    benefits: EXPERIENCES[k].pillars.slice(0, 4), monthly_price_cents: null,
  })),
  tiers: [
    { slug: "signature", name: "Signature Membership", description: "Choose any one experience.", experience_count: 1, benefits: ["One experience of your choice", "One secure account on every device", "Upgrade at any time"], eligibility: null, bundle_discount_percent: null, annual_discount_percent: null, setup_fee_cents: null },
    { slug: "premier", name: "Premier Membership", description: "Choose any two experiences at a bundled rate.", experience_count: 2, benefits: ["Any two experiences", "Bundled savings", "One account, one subscription"], eligibility: null, bundle_discount_percent: null, annual_discount_percent: null, setup_fee_cents: null },
    { slug: "elite", name: "Elite Membership", description: "All three experiences at our best bundled rate.", experience_count: 3, benefits: ["In Business, In Life and In Love", "Our best bundled rate", "Priority access to new features"], eligibility: null, bundle_discount_percent: null, annual_discount_percent: null, setup_fee_cents: null },
  ],
  addons: [],
  professional_packages: [],
};

export const getCatalogue = cache(async (preview = false): Promise<PricingCatalogue> => {
  const supabase = await createClient();
  if (!supabase) return OFFLINE;
  const { data, error } = await supabase.rpc("get_public_pricing", { preview });
  if (error || !data) return OFFLINE;
  return data as PricingCatalogue;
});

export async function getPublicOffers(): Promise<{ code: string; description: string | null; percent_off: number | null; amount_off_cents: number | null; ends_at: string | null }[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase.rpc("get_public_offers");
  return (data as never) ?? [];
}

export async function checkPromotion(code: string): Promise<Promotion | null> {
  const clean = code.trim().slice(0, 40);
  if (!clean) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.rpc("check_promotion", { promo_code: clean });
  return (data as Promotion) ?? null;
}
