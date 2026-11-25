import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { getCatalogue } from "@/lib/catalogue";
import { EXPERIENCES } from "@/lib/experiences";
import { getLaunchState } from "@/lib/launch";
import { normalizeSelection, quote } from "@/lib/pricing";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

const body = z.object({
  experiences: z.array(z.enum(["business", "counseling", "relationships"])).min(1).max(3),
  interval: z.enum(["month", "year"]),
  couples: z.boolean(),
  addons: z.array(z.string().max(40)).max(20),
});

/**
 * Add or remove experiences, upgrade/downgrade tiers, or switch billing on the
 * member's existing subscription. Stripe prorates the difference; the webhook
 * then updates access to match.
 */
export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!(await getLaunchState()).payments_live) return NextResponse.json({ error: "Membership changes open at launch." }, { status: 403 });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const supabase = (await createClient())!;
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id, stripe_product_id, stripe_membership_item_id, promotion_code")
    .eq("user_id", viewer.id)
    .eq("kind", "member")
    .in("status", ["active", "trialing", "past_due"])
    .maybeSingle();
  if (!sub?.stripe_subscription_id || !sub.stripe_membership_item_id || !sub.stripe_product_id) {
    return NextResponse.json({ error: "No active membership to change." }, { status: 404 });
  }

  const catalogue = await getCatalogue();
  const selection = normalizeSelection(catalogue, parsed.data);
  const q = quote(catalogue, selection);
  if (!q.priced || !q.tier || q.recurringTotal == null) return NextResponse.json({ error: "This membership is not available." }, { status: 409 });

  const { stripe, reason } = await getStripe();
  if (!stripe) return NextResponse.json({ error: reason }, { status: 503 });
  await stripe.products.update(sub.stripe_product_id, {
    name: q.tier.name,
    description: selection.experiences.map((e) => EXPERIENCES[e].name).join(" · ") + (selection.couples ? ` + ${catalogue.couples_upgrade.name}` : ""),
  });
  await stripe.subscriptions.update(sub.stripe_subscription_id, {
    items: [{ id: sub.stripe_membership_item_id, price_data: { currency: catalogue.currency, product: sub.stripe_product_id, unit_amount: q.recurringTotal, recurring: { interval: selection.interval } } }],
    proration_behavior: "create_prorations",
    metadata: {
      user_id: viewer.id,
      kind: "member",
      tier_slug: q.tier.slug,
      tier_name: q.tier.name,
      experiences: selection.experiences.join(","),
      interval: selection.interval,
      couples: selection.couples ? "1" : "0",
      addons: selection.addons.join(","),
      amount_cents: String(q.recurringTotal),
      monthly_equivalent_cents: String(selection.interval === "year" ? Math.round(q.annualTotal! / 12) : q.monthlyTotal!),
      promo: sub.promotion_code ?? "",
    },
  });
  return NextResponse.json({ ok: true, tier: q.tier.name });
}
