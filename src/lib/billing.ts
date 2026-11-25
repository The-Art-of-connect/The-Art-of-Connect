import "server-only";
import type Stripe from "stripe";

const piId = (pi: unknown): string | null =>
  !pi ? null : typeof pi === "string" ? pi : typeof pi === "object" && pi && "id" in pi ? String((pi as { id: string }).id) : null;

/**
 * Finds the PaymentIntent that paid an invoice. Stripe's current API no longer
 * puts it on the invoice itself, so several routes are tried in order:
 *  1. the invoice's own `payments` list (expanded),
 *  2. the Invoice Payments API,
 *  3. the legacy `payment_intent` field (older API versions).
 */
export async function paymentIntentForInvoice(stripe: Stripe, invoiceId: string): Promise<string | null> {
  try {
    const inv: any = await stripe.invoices.retrieve(invoiceId, { expand: ["payments"] });
    const fromPayments = (inv?.payments?.data ?? [])
      .map((p: any) => piId(p?.payment?.payment_intent))
      .find(Boolean);
    if (fromPayments) return fromPayments;
    if (inv?.payment_intent) return piId(inv.payment_intent);
  } catch {
    /* fall through */
  }
  try {
    const res: any = await (stripe as any).invoicePayments.list({ invoice: invoiceId, limit: 3 });
    const found = (res?.data ?? []).map((p: any) => piId(p?.payment?.payment_intent)).find(Boolean);
    if (found) return found;
  } catch {
    /* not available on this API version / key */
  }
  return null;
}

/** Finds the invoice a PaymentIntent paid (used to match refunds back to a payment row). */
export async function invoiceForPaymentIntent(stripe: Stripe, paymentIntentId: string): Promise<string | null> {
  try {
    const res: any = await (stripe as any).invoicePayments.list({
      payment: { type: "payment_intent", payment_intent: paymentIntentId },
      limit: 1,
    });
    const inv = res?.data?.[0]?.invoice;
    return inv ? (typeof inv === "string" ? inv : inv.id) : null;
  } catch {
    return null;
  }
}
