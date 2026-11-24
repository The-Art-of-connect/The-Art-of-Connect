import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { serverSecret } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const syncSubscription = async (sub: Stripe.Subscription) => {
    const userId = sub.metadata.user_id;
    const planId = sub.metadata.plan_id;
    if (!userId || !planId) return;
    const periodEnd = (sub as any).current_period_end ?? sub.items.data[0]?.current_period_end;
    await db.from("subscriptions").upsert(
      {
        user_id: userId,
        plan_id: planId,
        status: sub.status === "unpaid" || sub.status === "incomplete_expired" ? "canceled" : sub.status,
        stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        stripe_subscription_id: sub.id,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        cancel_at_period_end: sub.cancel_at_period_end,
      },
      { onConflict: "stripe_subscription_id" },
    );
    const experiences = (sub.metadata.experiences ?? "").split(",").filter(Boolean);
    const entitled = ["active", "trialing", "past_due"].includes(sub.status);
    for (const experience of experiences) {
      if (entitled) {
        await db.from("experience_access").upsert({ user_id: userId, experience, status: "active", source: "subscription" });
      } else {
        // Only remove access that came from a subscription; owner grants stay.
        await db.from("experience_access").update({ status: "revoked" }).eq("user_id", userId).eq("experience", experience).eq("source", "subscription");
      }
    }
  };

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object);
      break;
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
    case "charge.refunded": {
      const charge = event.data.object as any;
      const invoiceId = charge.invoice ?? null;
      if (invoiceId) await db.from("payments").update({ status: "refunded" }).eq("stripe_invoice_id", invoiceId);
      break;
    }
  }
  return NextResponse.json({ received: true });
}
