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
  annual_months_charged: null,
  minimum_member_age: 40,
  couples_upgrade: { name: "Couples upgrade", description: "Adds a second, secure login for your partner and your shared relationship space.", monthly_price_cents: null },
  referral_reward: null,
  experiences: EXPERIENCE_ORDER.map((k) => ({
    experience: k, name: EXPERIENCES[k].name, subtitle: EXPERIENCES[k].subtitle, description: EXPERIENCES[k].summary,
    benefits: EXPERIENCES[k].pillars.slice(0, 4),
  })),
  packages: [],
  addons: [],
  professional_packages: [],
};

export const getCatalogue = cache(async (preview = false): Promise<PricingCatalogue> => {
  const supabase = await createClient();
  if (!supabase) return OFFLINE;
  const { data, error } = await supabase.rpc("get_public_pricing", { preview });
  if (error || !data) return OFFLINE;
  // Tolerate an older database (before membership packages) without breaking pages.
  const d = data as Partial<PricingCatalogue>;
  return {
    ...OFFLINE,
    ...d,
    annual_months_charged: d.annual_months_charged ?? null,
    experiences: d.experiences?.length ? d.experiences : OFFLINE.experiences,
    packages: Array.isArray(d.packages) ? d.packages : [],
    addons: Array.isArray(d.addons) ? d.addons : [],
    professional_packages: Array.isArray(d.professional_packages) ? d.professional_packages : [],
  } as PricingCatalogue;
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
