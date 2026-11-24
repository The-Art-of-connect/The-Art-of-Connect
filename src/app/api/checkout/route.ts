import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getViewer, isStaff } from "@/lib/auth";
import { env } from "@/lib/env";
import { getLaunchState } from "@/lib/launch";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

const body = z.object({ plan: z.string().max(40), experience: z.enum(["relationships", "business", "counseling"]).optional() });

/**
 * Starts a Stripe Checkout session for a membership package.
 * Before payments launch, only staff can use it, and only with Stripe test keys.
 */
export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const launch = await getLaunchState();
  if (!launch.payments_live && !isStaff(viewer)) {
    return NextResponse.json({ error: "Memberships are not on sale yet" }, { status: 403 });
  }
  const { stripe, reason, isLive } = await getStripe();
  if (!stripe) return NextResponse.json({ error: reason }, { status: 503 });
  if (isLive && !launch.payments_live) return NextResponse.json({ error: "Live payments have not been authorized" }, { status: 403 });

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const supabase = (await createClient())!;
  const { data: plan } = await supabase
    .from("membership_plans")
    .select("id, slug, experiences, stripe_price_id, is_active")
    .eq("slug", parsed.data.plan)
    .maybeSingle();
  if (!plan?.stripe_price_id || (!plan.is_active && !isStaff(viewer))) {
    return NextResponse.json({ error: "Package unavailable" }, { status: 404 });
  }
  // Single-experience packages need the member's chosen experience.
  const experiences: string[] = plan.experiences.length ? plan.experiences : parsed.data.experience ? [parsed.data.experience] : [];
  if (!experiences.length) return NextResponse.json({ error: "Choose an experience" }, { status: 400 });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
    customer_email: viewer.email,
    client_reference_id: viewer.id,
    allow_promotion_codes: true,
    metadata: { user_id: viewer.id, plan_id: plan.id, experiences: experiences.join(",") },
    subscription_data: { metadata: { user_id: viewer.id, plan_id: plan.id, experiences: experiences.join(",") } },
    success_url: `${env.siteUrl}/app?welcome=1`,
    cancel_url: `${env.siteUrl}/membership`,
  });
  return NextResponse.json({ url: session.url });
}
