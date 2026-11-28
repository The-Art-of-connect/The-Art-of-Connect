import "server-only";
import { cache } from "react";
import { getViewer, isInsidePreview, isStaff } from "@/lib/auth";
import { getLaunchState } from "@/lib/launch";
import { getMembership } from "@/lib/membership-server";
import { getCatalogue } from "@/lib/catalogue";
import { selectionToQuery } from "@/lib/pricing";
import { trialEligiblePackage, TRIAL_DAYS } from "@/lib/trial";
import { createClient } from "@/lib/supabase/server";
import { isQaAccount } from "@/lib/qa-access";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GateFacts } from "@/lib/gate";
import { withCouplesOptions, COUPLES_SUFFIX, type Current, type Plan } from "@/lib/recommend";

export type Offer = { slug: string; name: string; tagline: string; benefits: string[]; monthlyCents: number | null; href: string; trial: boolean };
export type GateContext = { facts: GateFacts; offers: Record<string, Offer>; plans: Plan[]; current: Current; paymentsLive: boolean; trialDays: number };

/** Everything the membership-aware pop-up needs (directive 36), from the viewer's real entitlements and live prices. */
export const getGateContext = cache(async (): Promise<GateContext | null> => {
  const viewer = await getViewer();
  if (!viewer) return null;
  const [launch, membership, catalogue] = await Promise.all([getLaunchState(), getMembership(viewer), getCatalogue()]);
  const preview = isStaff(viewer) || isInsidePreview(viewer) || Boolean(launch.testSession) || (await isQaAccount(viewer.id));
  const db = await createClient();
  // Whether the member's membership already carries the couples experience (Couples upgrade).
  const { data: subRow } = db && !isInsidePreview(viewer) ? await db.from("subscriptions").select("couples_upgrade").eq("user_id", viewer.id).eq("kind", "member").in("status", ["active", "trialing"]).order("created_at", { ascending: false }).limit(1).maybeSingle() : { data: null };
  const couplesNow = Boolean(subRow?.couples_upgrade);
  // The owner preview shows the site as a brand-new member, who is eligible for the 15-day trial.
  const { data: trialOk } = isInsidePreview(viewer) ? { data: true } : db ? await db.rpc("trial_available", { p: viewer.id }) : { data: false };
  // Journey allowances per plan (directive 44: a level up never reduces them).
  const admin = createAdminClient();
  const { data: limits } = admin ? await admin.from("journey_tier_limits").select("package_slug, monthly_messages, unlimited_messages") : { data: null };
  const allowanceOf = (slug: string) => { const l = (limits ?? []).find((x) => x.package_slug === slug); return l ? (l.unlimited_messages ? null : l.monthly_messages) : undefined; };
  const offers = Object.fromEntries(catalogue.packages.map((p) => [p.slug, {
    slug: p.slug, name: p.name, tagline: p.tagline, benefits: (p.benefits ?? []).slice(0, 3), monthlyCents: p.monthly_price_cents,
    href: `/membership?${selectionToQuery({ experiences: p.experiences, interval: "month", couples: p.love_track === "couple", addons: [], package: p.category === "exclusive" ? p.slug : null })}#build`,
    trial: trialOk === true && trialEligiblePackage(p.slug),
  } satisfies Offer]));
  // Couples options: the same plan with the Couples upgrade selected in the membership builder.
  for (const p of catalogue.packages.filter((x) => x.experiences.includes("relationships") && !x.love_track && !x.all_access)) {
    const base = offers[p.slug];
    offers[p.slug + COUPLES_SUFFIX] = { ...base, slug: p.slug + COUPLES_SUFFIX, name: `${p.name} with the Couples upgrade`,
      monthlyCents: p.monthly_price_cents != null && catalogue.couples_upgrade.monthly_price_cents != null ? p.monthly_price_cents + catalogue.couples_upgrade.monthly_price_cents : null,
      href: `/membership?${selectionToQuery({ experiences: p.experiences, interval: "month", couples: true, addons: [], package: p.category === "exclusive" ? p.slug : null })}#build` };
  }
  return {
    facts: {
      signedIn: true, level: membership?.level ?? "free", experiences: viewer.experiences, society: viewer.society ?? null,
      live: { business: launch.business_live, relationships: launch.relationships_live }, preview,
    },
    offers, paymentsLive: launch.payments_live, trialDays: TRIAL_DAYS,
    // The centralized plans and the member's current membership, for recommendations (directive 42).
    plans: withCouplesOptions(catalogue.packages.map((p) => ({ slug: p.slug, name: p.name, category: p.category, experiences: [...p.experiences], love_track: p.love_track, monthly_price_cents: p.monthly_price_cents, all_access: p.all_access, benefits: p.benefits, journeyMessages: allowanceOf(p.slug) })), catalogue.couples_upgrade.monthly_price_cents),
    current: { packageSlug: membership?.packageSlug ? membership.packageSlug + (couplesNow && membership.packageSlug !== "couples-membership" ? COUPLES_SUFFIX : "") : null, level: membership?.level ?? "free", experiences: viewer.experiences, society: viewer.society ?? null },
  };
});
