import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { serverSecret } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordVerification } from "@/lib/identity";

const ALL = ["business", "counseling", "relationships"] as const;

/**
 * Stripe → database sync. Signature-verified; the only place subscriptions,
 * payments and subscription-based experience access are written.
 */
export async function POST(request: NextRequest) {
  const secret = serverSecret("STRIPE_WEBHOOK_SECRET");
  const { stripe } = await getStripe();
  const db = createAdminClient();
  if (!secret || !stripe || !db) return NextResponse.json({ error: "Payments not configured" }, { status: 503 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), request.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const partnersOf = async (userId: string) => {
    const { data: mine } = await db.schema("relationships").from("couple_members").select("couple_id").eq("user_id", userId).maybeSingle();
    if (!mine) return [];
    const { data } = await db.schema("relationships").from("couple_members").select("user_id").eq("couple_id", mine.couple_id).neq("user_id", userId);
    return (data ?? []).map((r) => r.user_id as string);
  };

  const syncSubscription = async (subscription: Stripe.Subscription) => {
    const sub = await stripe.subscriptions.retrieve(subscription.id, { expand: ["items.data.price.product"] });
    const m = sub.metadata;
    const userId = m.user_id;
    if (!userId) return;
    const item = sub.items.data.find((i) => (i.price.product as Stripe.Product)?.metadata?.role === "membership") ?? sub.items.data[0];
    const periodEnd = (sub as any).current_period_end ?? item?.current_period_end;
    const experiences = (m.experiences ?? "").split(",").filter((e): e is (typeof ALL)[number] => (ALL as readonly string[]).includes(e));
    const status = sub.status === "unpaid" || sub.status === "incomplete_expired" ? "canceled" : sub.status;
    const entitled = ["active", "trialing", "past_due"].includes(sub.status);
    const couples = m.couples === "1";

    await db.from("subscriptions").upsert(
      {
        user_id: userId,
        status,
        kind: m.kind === "professional" ? "professional" : "member",
        tier_slug: m.tier_slug ?? null,
        tier_name: m.tier_name ?? null,
        experiences,
        billing_interval: m.interval === "year" ? "year" : "month",
        amount_cents: item?.price.unit_amount ?? Number(m.amount_cents) ?? null,
        monthly_equivalent_cents: Number(m.monthly_equivalent_cents) || null,
        couples_upgrade: couples,
        addons: (m.addons ?? "").split(",").filter(Boolean),
        promotion_code: m.promo || null,
        stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        stripe_subscription_id: sub.id,
        stripe_product_id: typeof item?.price.product === "string" ? item.price.product : (item?.price.product as Stripe.Product)?.id ?? null,
        stripe_membership_item_id: item?.id ?? null,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        cancel_at_period_end: sub.cancel_at_period_end,
      },
      { onConflict: "stripe_subscription_id" },
    );

    if (m.kind === "professional") return;

    // Grant exactly the experiences in the membership; remove any dropped
    // ones that came from a subscription (owner grants are left alone).
    for (const exp of ALL) {
      if (entitled && experiences.includes(exp)) {
        await db.from("experience_access").upsert({ user_id: userId, experience: exp, status: "active", source: "subscription" });
      } else {
        await db.from("experience_access").update({ status: "revoked" }).eq("user_id", userId).eq("experience", exp).eq("source", "subscription");
      }
    }
    // Couples upgrade: the partner's In Love access comes from this membership.
    for (const partner of await partnersOf(userId)) {
      if (entitled && couples && experiences.includes("relationships")) {
        await db.from("experience_access").upsert({ user_id: partner, experience: "relationships", status: "active", source: "couples_upgrade" });
      } else {
        await db.from("experience_access").update({ status: "revoked" }).eq("user_id", partner).eq("experience", "relationships").eq("source", "couples_upgrade");
      }
    }
  };

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object);
      break;
    case "checkout.session.completed": {
      const code = event.data.object.metadata?.promo;
      if (code) {
        const { data: p } = await db.from("promotions").select("id, redemption_count").eq("code", code).maybeSingle();
        if (p) await db.from("promotions").update({ redemption_count: p.redemption_count + 1 }).eq("id", p.id);
      }
      break;
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const inv = event.data.object as any;
      const subId = inv.subscription ?? inv.parent?.subscription_details?.subscription ?? null;
      const { data: sub } = subId
        ? await db.from("subscriptions").select("id, user_id").eq("stripe_subscription_id", subId).maybeSingle()
        : { data: null };
      await db.from("payments").upsert(
        {
          user_id: sub?.user_id ?? null,
          subscription_id: sub?.id ?? null,
          amount_cents: event.type === "invoice.paid" ? inv.amount_paid : inv.amount_due,
          currency: inv.currency,
          status: event.type === "invoice.paid" ? "succeeded" : "failed",
          livemode: event.livemode,
          stripe_invoice_id: inv.id,
          stripe_payment_intent_id: `inv_${inv.id}`,
        },
        { onConflict: "stripe_payment_intent_id" },
      );
      break;
    }
    case "identity.verification_session.verified":
    case "identity.verification_session.requires_input":
    case "identity.verification_session.canceled":
    case "identity.verification_session.processing": {
      const { data: setting } = await db.from("platform_settings").select("value").eq("key", "minimum_member_age").maybeSingle();
      await recordVerification(stripe, event.data.object.id, Number(setting?.value ?? 40));
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as any;
      if (charge.invoice) await db.from("payments").update({ status: "refunded" }).eq("stripe_invoice_id", charge.invoice);
      break;
    }
  }
  return NextResponse.json({ received: true });
}
