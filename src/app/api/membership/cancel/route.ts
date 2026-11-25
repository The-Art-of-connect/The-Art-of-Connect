import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

/**
 * Cancel at the end of the current billing period (access continues until
 * then), or resume a membership that was set to cancel. The webhook keeps
 * the database and access in sync.
 */
export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { resume } = (await request.json().catch(() => ({}))) as { resume?: boolean };
  const supabase = (await createClient())!;
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id")
    .eq("user_id", viewer.id)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sub?.stripe_subscription_id) return NextResponse.json({ error: "No active membership." }, { status: 404 });
  const { stripe, reason } = await getStripe();
  if (!stripe) return NextResponse.json({ error: reason }, { status: 503 });
  const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: !resume });
  return NextResponse.json({ ok: true, cancelAtPeriodEnd: updated.cancel_at_period_end });
}
