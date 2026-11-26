import "server-only";
import Stripe from "stripe";
import { serverSecret } from "@/lib/env";
import { getLaunchState } from "@/lib/launch";

/**
 * Returns a Stripe client only when it is safe to use:
 * - test keys (sk_test_) always work, for building and QA;
 * - live keys (sk_live_) are refused until payments are launched.
 * If the main key is live, an optional STRIPE_TEST_SECRET_KEY keeps Sandbox testing available
 * (owner testing sessions, and everything else until live payments are authorized).
 */
export async function getStripe() {
  const main = serverSecret("STRIPE_SECRET_KEY");
  const testKey = serverSecret("STRIPE_TEST_SECRET_KEY");
  const live = (k: string) => k.startsWith("sk_live_") || k.startsWith("rk_live_");
  const launch = await getLaunchState();
  const key = main && live(main) && testKey && !live(testKey) && (launch.testSession || !launch.payments_live) ? testKey : main || testKey;
  if (!key) return { stripe: null, reason: "Stripe is not configured" } as const;
  const isLive = live(key);
  // Owner testing sessions only ever use Stripe test mode, whatever key is configured.
  if (isLive && launch.testSession) return { stripe: null, reason: "Owner testing uses Stripe test mode only. Live keys are refused." } as const;
  if (isLive && !launch.payments_live) {
    return { stripe: null, reason: "Live payments have not been authorized" } as const;
  }
  return { stripe: new Stripe(key), reason: null, isLive } as const;
}
