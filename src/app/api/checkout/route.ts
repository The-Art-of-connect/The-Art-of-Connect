import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";
import { getViewer, isStaff } from "@/lib/auth";
import { checkPromotion, getCatalogue } from "@/lib/catalogue";
import { env } from "@/lib/env";
import { EXPERIENCES } from "@/lib/experiences";
import { getLaunchState } from "@/lib/launch";
import { normalizeSelection, quote } from "@/lib/pricing";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

const body = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("member"),
    selection: z.object({
      experiences: z.array(z.enum(["business", "counseling", "relationships"])).min(1).max(3),
      interval: z.enum(["month", "year"]),
      couples: z.boolean(),
      addons: z.array(z.string().max(40)).max(20),
    }),
    promo: z.string().max(40).optional(),
  }),
  z.object({ kind: z.literal("professional"), package: z.string().max(40), interval: z.enum(["month", "year"]).default("month") }),
]);

/**
 * Starts Stripe Checkout for ONE unified subscription. Every amount is
 * recalculated here from the owner's published pricing — nothing the browser
 * sends about prices is trusted. Before payments launch, only staff can use
 * it, and only with Stripe test keys.
 */
export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  const launch = await getLaunchState();
  const staffTest = isStaff(viewer) && !launch.payments_live;
  if (!launch.payments_live && !staffTest) return NextResponse.json({ error: "Membership payments open soon." }, { status: 403 });
  const { stripe, reason, isLive } = await getStripe();
  if (!stripe) return NextResponse.json({ error: reason }, { status: 503 });
  if (isLive && !launch.payments_live) return NextResponse.json({ error: "Live payments have not been authorized." }, { status: 403 });

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  // Staff may test with draft prices; everyone else needs published pricing.
  const catalogue = await getCatalogue(staffTest);
  if (!catalogue.published && !catalogue.preview) return NextResponse.json({ error: "Pricing has not been published yet." }, { status: 409 });
  const currency = catalogue.currency;
  const recurring = (interval: "month" | "year") => ({ interval });

  let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  let metadata: Record<string, string> = { user_id: viewer.id };
  let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;

  if (parsed.data.kind === "member") {
    if (viewer.accountType === "member" && !viewer.ageEligible) return NextResponse.json({ error: "Age eligibility has not been confirmed for this account." }, { status: 403 });
    const selection = normalizeSelection(catalogue, parsed.data.selection);
    const promo = parsed.data.promo ? await checkPromotion(parsed.data.promo) : null;
    const q = quote(catalogue, selection, promo);
    if (!q.priced || !q.tier || q.recurringTotal == null) return NextResponse.json({ error: "This membership is not available yet." }, { status: 409 });

    const names = selection.experiences.map((e) => EXPERIENCES[e].name);
    const extras = [selection.couples ? catalogue.couples_upgrade.name : null, ...catalogue.addons.filter((a) => selection.addons.includes(a.slug) && a.billing === "monthly").map((a) => a.name)].filter(Boolean);
    lineItems.push({
      quantity: 1,
      price_data: {
        currency,
        unit_amount: q.recurringTotal,
        recurring: recurring(selection.interval),
        product_data: { name: q.tier.name, description: [names.join(" · "), ...extras].join(" + "), metadata: { role: "membership" } },
      },
    });
    if (q.tier.setup_fee_cents) {
      lineItems.push({ quantity: 1, price_data: { currency, unit_amount: q.tier.setup_fee_cents, product_data: { name: `${q.tier.name} setup` } } });
    }
    for (const a of catalogue.addons.filter((x) => selection.addons.includes(x.slug) && x.billing === "one_time" && x.price_cents)) {
      lineItems.push({ quantity: 1, price_data: { currency, unit_amount: a.price_cents!, product_data: { name: a.name } } });
    }
    if (q.promotionDiscount && promo) {
      const coupon = await stripe.coupons.create({ amount_off: q.promotionDiscount, currency, duration: "once", name: promo.code });
      discounts = [{ coupon: coupon.id }];
    }
    metadata = {
      ...metadata,
      kind: "member",
      tier_slug: q.tier.slug,
      tier_name: q.tier.name,
      experiences: selection.experiences.join(","),
      interval: selection.interval,
      couples: selection.couples ? "1" : "0",
      addons: selection.addons.join(","),
      amount_cents: String(q.recurringTotal),
      monthly_equivalent_cents: String(selection.interval === "year" ? Math.round(q.annualTotal! / 12) : q.monthlyTotal!),
      promo: promo?.code ?? "",
    };
  } else {
    // Professional packages: only approved professionals may subscribe.
    const supabase = (await createClient())!;
    const { data: counselor } = await supabase.schema("counseling").from("counselors").select("is_verified, professional_type").eq("user_id", viewer.id).maybeSingle();
    if (!counselor?.is_verified) return NextResponse.json({ error: "Your professional application must be approved first." }, { status: 403 });
    const pkg = catalogue.professional_packages.find((p) => p.slug === (parsed.data as { package: string }).package);
    if (!pkg || pkg.monthly_price_cents == null) return NextResponse.json({ error: "Package unavailable." }, { status: 404 });
    if (!pkg.eligible_types.includes(counselor.professional_type)) return NextResponse.json({ error: "This package isn’t available for your professional type." }, { status: 403 });
    const interval = parsed.data.interval;
    const pct = Number(catalogue.annual_discount_percent ?? 0);
    const amount = interval === "year" ? Math.round(pkg.monthly_price_cents * 12 * (1 - pct / 100)) : pkg.monthly_price_cents;
    lineItems = [{ quantity: 1, price_data: { currency, unit_amount: amount, recurring: recurring(interval), product_data: { name: pkg.name, metadata: { role: "membership" } } } }];
    if (pkg.onboarding_fee_cents) lineItems.push({ quantity: 1, price_data: { currency, unit_amount: pkg.onboarding_fee_cents, product_data: { name: `${pkg.name} onboarding` } } });
    metadata = { ...metadata, kind: "professional", tier_slug: pkg.slug, tier_name: pkg.name, experiences: "", interval, couples: "0", addons: "", amount_cents: String(amount), monthly_equivalent_cents: String(interval === "year" ? Math.round(amount / 12) : amount), promo: "" };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: lineItems,
    discounts,
    customer_email: viewer.email,
    client_reference_id: viewer.id,
    metadata,
    subscription_data: { metadata },
    success_url: `${env.siteUrl}/app?welcome=1`,
    cancel_url: `${env.siteUrl}/app/onboarding`,
  });
  return NextResponse.json({ url: session.url });
}
