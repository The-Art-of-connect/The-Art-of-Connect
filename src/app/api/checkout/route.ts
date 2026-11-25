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
import { allInEffect } from "@/lib/legal";
import { acceptanceStatement, autoRenewalStatement, checkoutDocs } from "@/lib/legal-requirements";
import { clientMeta } from "@/lib/security";
import { formatMoney } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

const body = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("member"),
    selection: z.object({
      experiences: z.array(z.enum(["business", "counseling", "relationships"])).max(3),
      interval: z.enum(["month", "year"]),
      couples: z.boolean(),
      addons: z.array(z.string().max(40)).max(20),
      package: z.string().max(40).nullable().optional(),
    }),
    promo: z.string().max(40).optional(),
    accept: z.literal(true, { message: "Please accept the membership agreements and automatic renewal terms." }),
  }),
  z.object({ kind: z.literal("professional"), package: z.string().max(40), interval: z.enum(["month", "year"]).default("month"), accept: z.literal(true) }),
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
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.find((i) => i.path.includes("accept")) ? "Please accept the agreements and automatic renewal terms to continue." : "Invalid request." }, { status: 400 });

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
    if (!q.priced || !q.pkg || q.recurringTotal == null) return NextResponse.json({ error: "This membership is not available yet." }, { status: 409 });
    const pkg = q.pkg;
    // Affirmative acceptance of the published agreements and the automatic-renewal terms, recorded before payment.
    const docs = checkoutDocs(selection.experiences, pkg.love_track === "couple" || (q.couplesMonthly ?? 0) > 0);
    if (!(await allInEffect(docs))) return NextResponse.json({ error: "Our membership agreements are being finalized. Payments open soon." }, { status: 409 });
    const accepted = await recordCheckoutAcceptance(docs, autoRenewalStatement({ packageName: pkg.name, amount: formatMoney(q.recurringTotal, catalogue.currency) ?? "", interval: selection.interval }));
    if (!accepted) return NextResponse.json({ error: "We couldn’t record your acceptance. Please try again." }, { status: 500 });

    const names = selection.experiences.map((e) => EXPERIENCES[e].name);
    const extras = [q.couplesMonthly ? catalogue.couples_upgrade.name : null, ...catalogue.addons.filter((a) => selection.addons.includes(a.slug) && a.billing === "monthly").map((a) => a.name)].filter(Boolean);
    lineItems.push({
      quantity: 1,
      price_data: {
        currency,
        unit_amount: q.recurringTotal,
        recurring: recurring(selection.interval),
        product_data: { name: pkg.name, description: [names.join(" · "), ...extras].join(" + "), metadata: { role: "membership" } },
      },
    });
    if (q.onboardingFee) {
      lineItems.push({ quantity: 1, price_data: { currency, unit_amount: q.onboardingFee, product_data: { name: `${pkg.name} onboarding` } } });
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
      tier_slug: pkg.slug,
      tier_name: pkg.name,
      experiences: selection.experiences.join(","),
      interval: selection.interval,
      couples: selection.couples ? "1" : "0",
      couples_upgrade: q.couplesMonthly ? "1" : "0",
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
    const proDocs = ["professional-agreement", "subscription-auto-renewal", "refund-policy"];
    if (!(await allInEffect(proDocs))) return NextResponse.json({ error: "The Professional Provider Agreement is being finalized. Subscriptions open soon." }, { status: 409 });
    const months = Number(catalogue.annual_months_charged ?? 12);
    const amount = interval === "year" ? Math.round(pkg.monthly_price_cents * months) : pkg.monthly_price_cents;
    if (!(await recordCheckoutAcceptance(proDocs, autoRenewalStatement({ packageName: pkg.name, amount: formatMoney(amount, currency) ?? "", interval })))) {
      return NextResponse.json({ error: "We couldn’t record your acceptance. Please try again." }, { status: 500 });
    }
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

/** Records acceptance (with the exact wording shown) for the signed-in member. */
async function recordCheckoutAcceptance(docs: string[], renewal: string) {
  const supabase = await createClient();
  if (!supabase) return false;
  const { ipHash, userAgent } = await clientMeta();
  const { error } = await supabase.rpc("record_legal_acceptance", {
    docs, ctx: "checkout", statement: `${renewal} ${acceptanceStatement(docs)}`.slice(0, 1000), ip_hash: ipHash, user_agent: userAgent,
  });
  return !error;
}
