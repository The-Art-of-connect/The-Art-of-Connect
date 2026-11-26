import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { env } from "@/lib/env";
import { getLaunchState } from "@/lib/launch";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

/**
 * Lets a member update the card on file (for example after a failed payment) in Stripe's secure billing page.
 * Only the card and invoices can be managed there; plan changes stay on The Art of Connect.
 */
export async function POST() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const supabase = (await createClient())!;
  const { data: sub } = await supabase.from("subscriptions").select("stripe_customer_id").eq("user_id", viewer.id).eq("kind", "member")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!sub?.stripe_customer_id) return NextResponse.json({ error: "No membership billing found." }, { status: 404 });
  const { stripe, reason, isLive } = await getStripe();
  if (!stripe) return NextResponse.json({ error: reason }, { status: 503 });
  if (isLive && !(await getLaunchState()).payments_live) return NextResponse.json({ error: "Live payments have not been authorized." }, { status: 403 });
  // A card-and-invoices-only portal configuration (created once per Stripe account).
  const existing = await stripe.billingPortal.configurations.list({ active: true, limit: 20 });
  const config = existing.data.find((c) => c.metadata?.aoc === "card-only") ?? await stripe.billingPortal.configurations.create({
    metadata: { aoc: "card-only" },
    business_profile: { headline: "The Art of Connect — update your card" },
    features: {
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
      customer_update: { enabled: false },
      subscription_cancel: { enabled: false },
      subscription_update: { enabled: false },
    },
  });
  const session = await stripe.billingPortal.sessions.create({ customer: sub.stripe_customer_id, configuration: config.id, return_url: `${env.siteUrl}/app/membership` });
  return NextResponse.json({ url: session.url });
}
