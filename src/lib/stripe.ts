import "server-only";
import Stripe from "stripe";
import { serverSecret } from "@/lib/env";
import { getLaunchState } from "@/lib/launch";

/**
 * Returns a Stripe client only when it is safe to use:
 * - test keys (sk_test_) always work, for building and QA;
 * - live keys (sk_live_) are refused until payments are launched.
 */
export async function getStripe() {
  const key = serverSecret("STRIPE_SECRET_KEY");
  if (!key) return { stripe: null, reason: "Stripe is not configured" } as const;
  const isLive = key.startsWith("sk_live_") || key.startsWith("rk_live_");
  if (isLive && !(await getLaunchState()).payments_live) {
    return { stripe: null, reason: "Live payments have not been authorized" } as const;
  }
  return { stripe: new Stripe(key), reason: null, isLive } as const;
}
