import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { getCatalogue } from "@/lib/catalogue";
import { EXPERIENCES } from "@/lib/experiences";
import { getLaunchState } from "@/lib/launch";
import { normalizeSelection, quote } from "@/lib/pricing";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { losses, type Plan } from "@/lib/recommend";
import { createAdminClient } from "@/lib/supabase/admin";

const body = z.object({
  experiences: z.array(z.enum(["business", "counseling", "relationships"])).max(3),
  interval: z.enum(["month", "year"]),
  couples: z.boolean(),
  addons: z.array(z.string().max(40)).max(20),
  package: z.string().max(40).nullable().optional(),
  /** Directive 44: moving to a plan that removes anything needs the member's explicit confirmation. */
  acknowledgeLoss: z.boolean().optional(),
});

/**
 * Add or remove experiences, move between packages, or switch billing on the
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
    .select("stripe_subscription_id, stripe_product_id, stripe_membership_item_id, promotion_code, tier_slug")
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
  if (!q.priced || !q.pkg || q.recurringTotal == null) return NextResponse.json({ error: "This membership is not available." }, { status: 409 });
  const pkg = q.pkg;
  // Directive 44: never silently remove a benefit. List exactly what would be lost and ask the member to confirm.
  const admin = createAdminClient();
  const { data: limits } = admin ? await admin.from("journey_tier_limits").select("package_slug, monthly_messages, unlimited_messages") : { data: null };
  const allowance = (slug: string) => { const l = (limits ?? []).find((x) => x.package_slug === slug); return l ? (l.unlimited_messages ? null : l.monthly_messages) : undefined; };
  const toPlan = (p: (typeof catalogue.packages)[number]): Plan => ({ slug: p.slug, name: p.name, category: p.category, experiences: [...p.experiences], love_track: p.love_track, monthly_price_cents: p.monthly_price_cents, all_access: p.all_access, journeyMessages: allowance(p.slug) });
  const fromPkg = catalogue.packages.find((p) => p.slug === sub.tier_slug);
  const lost = fromPkg ? losses(toPlan(fromPkg), toPlan(pkg)) : [];
  if (lost.length && !parsed.data.acknowledgeLoss) {
    return NextResponse.json({ error: `This change would remove ${lost.join(", ")}. Your history and records always stay with you.`, losses: lost }, { status: 409 });
  }

  const { stripe, reason } = await getStripe();
  if (!stripe) return NextResponse.json({ error: reason }, { status: 503 });
  await stripe.products.update(sub.stripe_product_id, {
    name: pkg.name,
    description: selection.experiences.map((e) => EXPERIENCES[e].name).join(" · ") + (q.couplesMonthly ? ` + ${catalogue.couples_upgrade.name}` : ""),
  });
  await stripe.subscriptions.update(sub.stripe_subscription_id, {
    items: [{ id: sub.stripe_membership_item_id, price_data: { currency: catalogue.currency, product: sub.stripe_product_id, unit_amount: q.recurringTotal, recurring: { interval: selection.interval } } }],
    proration_behavior: "create_prorations",
    metadata: {
      user_id: viewer.id,
      kind: "member",
      tier_slug: pkg.slug,
      tier_name: pkg.name,
      experiences: selection.experiences.join(","),
      interval: selection.interval,
      couples: selection.couples ? "1" : "0",
      addons: selection.addons.join(","),
      amount_cents: String(q.recurringTotal),
      monthly_equivalent_cents: String(selection.interval === "year" ? Math.round(q.annualTotal! / 12) : q.monthlyTotal!),
      promo: sub.promotion_code ?? "",
    },
  });
  return NextResponse.json({ ok: true, tier: pkg.name });
}
