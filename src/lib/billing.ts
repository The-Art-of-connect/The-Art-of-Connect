import "server-only";
import type Stripe from "stripe";

/** Finds the PaymentIntent that paid an invoice (Stripe's newer API exposes it via invoice payments). */
export async function paymentIntentForInvoice(stripe: Stripe, invoiceId: string): Promise<string | null> {
  try {
    const list = await (stripe as any).invoicePayments.list({ invoice: invoiceId, limit: 1 });
    const pi = list?.data?.[0]?.payment?.payment_intent;
    if (pi) return typeof pi === "string" ? pi : pi.id;
  } catch {
    /* older API versions */
  }
  try {
    const inv: any = await stripe.invoices.retrieve(invoiceId);
    const pi = inv.payment_intent;
    return pi ? (typeof pi === "string" ? pi : pi.id) : null;
  } catch {
    return null;
  }
}
