import "server-only";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getLaunchState } from "@/lib/launch";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Journey Plus purchases, Private Session purchases and Auto-Reload.
 *   • Nothing is ever charged without the member's explicit action or
 *     their recorded Auto-Reload authorization.
 *   • Access is granted ONLY when Stripe confirms the payment (webhook →
 *     journey_grant_purchase), never when a checkout merely starts.
 *   • Live charges are refused until the owner turns on live payments.
 *     Before that, only owner/staff can test with Stripe test keys.
 */

type Kind = "messages" | "voice_minutes" | "session";
export type CommerceResult = { ok: true; url?: string; message: string } | { ok: false; message: string };

async function paymentsAllowed(staff: boolean) {
  const launch = await getLaunchState();
  const s = await getStripe();
  if (!s.stripe) return { stripe: null, reason: "Purchases open soon." } as const;
  if (!launch.payments_live && !(staff && !s.isLive)) return { stripe: null, reason: "Purchases open soon." } as const;
  return { stripe: s.stripe, reason: null } as const;
}

export async function startPurchase(input: { userId: string; holderId: string; email: string; kind: Kind; slug: string; staff: boolean }): Promise<CommerceResult> {
  const db = createAdminClient();
  if (!db) return { ok: false, message: "Purchases open soon." };
  const { data: s } = await db.from("journey_settings").select("message_packages_published, sessions_published").maybeSingle();
  let name = "", quantity = 0, price: number | null = null;
  if (input.kind === "session") {
    if (!s?.sessions_published && !input.staff) return { ok: false, message: "Private Sessions open soon." };
    const { data: p } = await db.from("journey_session_products").select("name, minutes, price_cents, is_active").eq("slug", input.slug).maybeSingle();
    if (!p?.is_active) return { ok: false, message: "That session isn't available." };
    name = `Journey ${p.name} (${p.minutes} minutes)`; quantity = 1; price = p.price_cents;
  } else {
    if (!s?.message_packages_published && !input.staff) return { ok: false, message: "Journey Plus opens soon." };
    const { data: p } = await db.from("journey_message_packages").select("messages, price_cents, is_active").eq("slug", input.slug).maybeSingle();
    if (!p?.is_active) return { ok: false, message: "That package isn't available." };
    name = `Journey Plus — ${p.messages} ${input.kind === "voice_minutes" ? "voice minutes" : "messages"}`; quantity = p.messages; price = p.price_cents;
  }
  if (price === null || price <= 0) return { ok: false, message: "Pricing is being finalized." };

  const pay = await paymentsAllowed(input.staff);
  if (!pay.stripe) return { ok: false, message: pay.reason };

  const { data: purchase, error } = await db.from("journey_purchases").insert({
    user_id: input.userId, holder_id: input.holderId, kind: input.kind, package_slug: input.slug, quantity, amount_cents: price,
  }).select("id").single();
  if (error || !purchase) return { ok: false, message: "That purchase couldn't start. Nothing was charged." };

  const session = await pay.stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.email || undefined,
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: price, product_data: { name, metadata: { role: "journey" } } } }],
    metadata: { journey_purchase_id: purchase.id, user_id: input.userId },
    payment_intent_data: { metadata: { journey_purchase_id: purchase.id, user_id: input.userId } },
    success_url: `${env.siteUrl}/app/journey/plus?purchase=success`,
    cancel_url: `${env.siteUrl}/app/journey/plus?purchase=canceled`,
  });
  await db.from("journey_purchases").update({ stripe_checkout_session_id: session.id }).eq("id", purchase.id);
  return { ok: true, url: session.url ?? undefined, message: "Opening secure checkout…" };
}

/** Starts Auto-Reload authorization: the member saves a card in Stripe and agrees to the terms shown. Off until that succeeds. */
export async function startAutoReloadSetup(input: { userId: string; email: string; packageSlug: string; capCents: number | null; consentText: string; staff: boolean }): Promise<CommerceResult> {
  const db = createAdminClient();
  if (!db) return { ok: false, message: "Auto-Reload opens soon." };
  const { data: p } = await db.from("journey_message_packages").select("price_cents, is_active").eq("slug", input.packageSlug).maybeSingle();
  if (!p?.is_active || !p.price_cents) return { ok: false, message: "Choose an available package." };
  const pay = await paymentsAllowed(input.staff);
  if (!pay.stripe) return { ok: false, message: pay.reason };
  await db.from("journey_auto_reload").upsert({
    user_id: input.userId, enabled: false, package_slug: input.packageSlug, monthly_cap_cents: input.capCents, consent_text: input.consentText.slice(0, 2000), updated_at: new Date().toISOString(),
  });
  const session = await pay.stripe.checkout.sessions.create({
    mode: "setup",
    currency: "usd",
    customer_creation: "always",
    customer_email: input.email || undefined,
    metadata: { journey_auto_reload: input.userId },
    setup_intent_data: { metadata: { journey_auto_reload: input.userId } },
    success_url: `${env.siteUrl}/app/journey/plus?autoreload=on`,
    cancel_url: `${env.siteUrl}/app/journey/plus?autoreload=canceled`,
  });
  return { ok: true, url: session.url ?? undefined, message: "Opening secure card setup…" };
}

/**
 * Called when a member's allowance runs out. Charges their saved card for
 * the package they chose — only if they turned Auto-Reload on and every
 * company safeguard allows it. Access arrives only after Stripe confirms.
 */
export async function maybeAutoReload(userId: string, holderId: string): Promise<"started" | string> {
  const db = createAdminClient();
  if (!db) return "unavailable";
  const { data: a } = await db.from("journey_auto_reload").select("package_slug, stripe_customer_id, stripe_payment_method_id").eq("user_id", userId).maybeSingle();
  if (!a?.package_slug) return "off";
  const { data: p } = await db.from("journey_message_packages").select("messages, price_cents, is_active").eq("slug", a.package_slug).maybeSingle();
  if (!p?.is_active || !p.price_cents) return "package_unavailable";
  const { data: allowed } = await db.rpc("journey_auto_reload_allowed", { p_user: userId, p_amount: p.price_cents });
  if (allowed !== "allowed") return String(allowed);
  const { stripe } = await getStripe();
  if (!stripe || !a.stripe_customer_id || !a.stripe_payment_method_id) return "payments_off";
  const { data: purchase } = await db.from("journey_purchases").insert({
    user_id: userId, holder_id: holderId, kind: "messages", package_slug: a.package_slug, quantity: p.messages, amount_cents: p.price_cents, auto_reload: true,
  }).select("id").single();
  if (!purchase) return "error";
  try {
    const pi = await stripe.paymentIntents.create({
      amount: p.price_cents, currency: "usd", customer: a.stripe_customer_id, payment_method: a.stripe_payment_method_id,
      off_session: true, confirm: true, description: `Journey Auto-Reload — ${p.messages} messages`,
      metadata: { journey_purchase_id: purchase.id, user_id: userId, auto_reload: "1" },
    }, { idempotencyKey: `journey-reload-${purchase.id}` });
    await db.from("journey_purchases").update({ stripe_payment_intent_id: pi.id }).eq("id", purchase.id);
    return "started";
  } catch {
    await db.from("journey_purchases").update({ status: "failed", completed_at: new Date().toISOString() }).eq("id", purchase.id);
    return "payment_failed";
  }
}

/** Webhook handlers — the only place purchased access is granted. */
export async function handleJourneyStripeEvent(stripe: Stripe, event: Stripe.Event): Promise<boolean> {
  const db = createAdminClient();
  if (!db) return false;
  if (event.type === "checkout.session.completed") {
    const cs = event.data.object as Stripe.Checkout.Session;
    if (cs.metadata?.journey_purchase_id && cs.payment_status === "paid") {
      const pi = typeof cs.payment_intent === "string" ? cs.payment_intent : cs.payment_intent?.id ?? null;
      await db.rpc("journey_grant_purchase", { p_purchase: cs.metadata.journey_purchase_id, p_payment_intent: pi });
      return true;
    }
    if (cs.metadata?.journey_auto_reload && cs.mode === "setup" && cs.setup_intent) {
      const si = await stripe.setupIntents.retrieve(typeof cs.setup_intent === "string" ? cs.setup_intent : cs.setup_intent.id);
      const pm = typeof si.payment_method === "string" ? si.payment_method : si.payment_method?.id;
      const customer = typeof cs.customer === "string" ? cs.customer : cs.customer?.id;
      if (pm && customer) {
        await db.from("journey_auto_reload").update({
          enabled: true, authorized_at: new Date().toISOString(), stripe_payment_method_id: pm, stripe_customer_id: customer, updated_at: new Date().toISOString(),
        }).eq("user_id", cs.metadata.journey_auto_reload);
      }
      return true;
    }
  }
  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    if (pi.metadata?.journey_purchase_id) {
      await db.rpc("journey_grant_purchase", { p_purchase: pi.metadata.journey_purchase_id, p_payment_intent: pi.id });
      return true;
    }
  }
  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object as Stripe.PaymentIntent;
    if (pi.metadata?.journey_purchase_id) {
      await db.from("journey_purchases").update({ status: "failed", completed_at: new Date().toISOString() }).eq("id", pi.metadata.journey_purchase_id).eq("status", "pending");
      // A declined Auto-Reload pauses Auto-Reload so it can't retry repeatedly.
      if (pi.metadata.auto_reload === "1" && pi.metadata.user_id) await db.from("journey_auto_reload").update({ enabled: false }).eq("user_id", pi.metadata.user_id);
      return true;
    }
  }
  return false;
}
