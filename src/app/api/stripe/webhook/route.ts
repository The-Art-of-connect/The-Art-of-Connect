import { handleJourneyStripeEvent } from "@/lib/journey-commerce";
import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { serverSecret } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordVerification } from "@/lib/identity";
import { invoiceForPaymentIntent, paymentIntentForInvoice } from "@/lib/billing";
import { ownerAlertAddress, sendEmail } from "@/lib/email";
import { templates, type EmailContent } from "@/lib/email-templates";

const ALL = ["business", "counseling", "relationships"] as const;
const LABEL: Record<string, string> = { business: "In Business", counseling: "In Life", relationships: "In Love" };
const day = (unix?: number | null) =>
  unix ? new Date(unix * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : null;

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

  /**
   * Member notification. Only the account email and first name are read —
   * never journals, assessments or other private content. Failures never
   * block the webhook; the Stripe event id prevents duplicate sends.
   */
  const notify = async (userId: string | null | undefined, build: (name: string | null) => EmailContent, category: "membership" | "billing") => {
    if (!userId) return;
    try {
      const [{ data: u }, { data: prof }] = await Promise.all([
        db.auth.admin.getUserById(userId),
        db.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
      ]);
      const email = u?.user?.email;
      if (email) await sendEmail(email, build((prof?.display_name as string | null) ?? null), { category, idempotencyKey: `${event.id}:${category}` });
    } catch {
      /* email is best-effort */
    }
  };
  const alertOwner = async (title: string, summary: string, portalPath: string) => {
    try {
      await sendEmail(ownerAlertAddress(), templates.ownerAlert({ title, summary, portalPath }), { category: "owner_alert", idempotencyKey: `${event.id}:owner` });
    } catch {
      /* best-effort */
    }
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

  // Journey Plus, Private Sessions and Auto-Reload: access is granted here, only after Stripe confirms payment.
  if (await handleJourneyStripeEvent(stripe, event)) return NextResponse.json({ received: true });

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const s = event.data.object;
      await syncSubscription(s);
      const m = s.metadata ?? {};
      if (m.kind === "professional") break;
      if (event.type === "customer.subscription.created" && ["active", "trialing"].includes(s.status)) {
        const amount = s.items.data[0]?.price?.unit_amount ?? Number(m.amount_cents) ?? 0;
        await notify(
          m.user_id,
          (name) =>
            templates.membershipConfirmed({
              name,
              tierName: m.tier_name || "membership",
              experiences: (m.experiences ?? "").split(",").filter(Boolean).map((e) => LABEL[e] ?? e),
              amount,
              currency: s.currency,
              interval: m.interval === "year" ? "year" : "month",
            }),
          "membership",
        );
      }
      const prev = (event.data as { previous_attributes?: Partial<Stripe.Subscription> }).previous_attributes;
      const scheduledCancel = event.type === "customer.subscription.updated" && s.cancel_at_period_end && prev?.cancel_at_period_end === false;
      if (event.type === "customer.subscription.deleted" || scheduledCancel) {
        const end = scheduledCancel ? day((s as any).current_period_end ?? s.items.data[0]?.current_period_end) : null;
        await notify(m.user_id, (name) => templates.membershipCanceled({ name, endDate: end }), "membership");
      }
      break;
    }
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
      const rawSub = inv.subscription ?? inv.parent?.subscription_details?.subscription ?? null;
      const subId: string | null = rawSub ? (typeof rawSub === "string" ? rawSub : rawSub.id) : null;
      const findSub = async () =>
        subId ? (await db.from("subscriptions").select("id, user_id").eq("stripe_subscription_id", subId).maybeSingle()).data : null;
      let sub = await findSub();
      // Stripe may deliver invoice.paid before customer.subscription.created:
      // record the membership first so the payment is linked to it.
      if (subId && !sub) {
        try {
          await syncSubscription(await stripe.subscriptions.retrieve(subId));
          sub = await findSub();
        } catch {
          /* recorded without a link; a later delivery fills it in */
        }
      }
      await db.from("payments").upsert(
        {
          user_id: sub?.user_id ?? null,
          subscription_id: sub?.id ?? null,
          amount_cents: event.type === "invoice.paid" ? inv.amount_paid : inv.amount_due,
          currency: inv.currency,
          status: event.type === "invoice.paid" ? "succeeded" : "failed",
          livemode: event.livemode,
          stripe_invoice_id: inv.id,
          // Stable per-invoice key so repeated webhook deliveries update one row.
          stripe_payment_intent_id: `inv_${inv.id}`,
          stripe_payment_ref: event.type === "invoice.paid" ? await paymentIntentForInvoice(stripe, inv.id) : null,
        },
        { onConflict: "stripe_payment_intent_id" },
      );
      if (event.type === "invoice.paid" && inv.amount_paid > 0) {
        await notify(sub?.user_id, (name) => templates.paymentReceipt({ name, amount: inv.amount_paid, currency: inv.currency, date: day(inv.status_transitions?.paid_at ?? inv.created) ?? "today" }), "billing");
      }
      if (event.type === "invoice.payment_failed") {
        await notify(sub?.user_id, (name) => templates.paymentFailed({ name, amount: inv.amount_due, currency: inv.currency }), "billing");
        await alertOwner("A membership payment failed", "A member’s payment did not go through. Stripe will retry automatically.", "/admin/revenue");
      }
      break;
    }
    case "identity.verification_session.verified":
    case "identity.verification_session.requires_input":
    case "identity.verification_session.canceled":
    case "identity.verification_session.processing": {
      const { data: setting } = await db.from("platform_settings").select("value").eq("key", "minimum_member_age").maybeSingle();
      await recordVerification(stripe, event.data.object.id, Number(setting?.value ?? 21));
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object;
      const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (pi) {
        const patch = { refunded_amount_cents: charge.amount_refunded, status: charge.refunded ? "refunded" : "partially_refunded" };
        let { data: hit } = await db.from("payments").update(patch).eq("stripe_payment_ref", pi).select("user_id");
        if (!hit?.length) {
          // Payment row not yet linked to its PaymentIntent: match through the invoice.
          const invoiceId = await invoiceForPaymentIntent(stripe, pi);
          if (invoiceId) ({ data: hit } = await db.from("payments").update({ ...patch, stripe_payment_ref: pi }).eq("stripe_invoice_id", invoiceId).select("user_id"));
        }
        const prevRefunded = (event.data as { previous_attributes?: { amount_refunded?: number } }).previous_attributes?.amount_refunded ?? 0;
        const thisRefund = charge.amount_refunded - prevRefunded;
        if (thisRefund > 0) await notify(hit?.[0]?.user_id as string | undefined, (name) => templates.refundIssued({ name, amount: thisRefund, currency: charge.currency }), "billing");
      }
      break;
    }
  }
  return NextResponse.json({ received: true });
}
