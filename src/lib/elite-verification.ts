import "server-only";
import type Stripe from "stripe";
import { env } from "@/lib/env";
import { getLaunchState } from "@/lib/launch";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { compareNames } from "@/lib/elite";

/**
 * Elite Qualification & Verification Engine on Stripe.
 *
 *   Identity              → Stripe Identity (document + live selfie): identity, date of birth, face match.
 *   Bank ownership        → Stripe Financial Connections ownership, matched against the Identity name.
 *   Balances / deposits   → Financial Connections, SUPPORTING evidence only:
 *                           deposits are never treated as verified income, balances never as net worth.
 *   Income, business ownership, net worth, accomplishments
 *                         → private documents + the owner's manual verification.
 *
 * Sandbox (test keys): available to the owner, staff and test accounts, with fictional data.
 * Production: Identity follows the owner's identity-verification launch switch; Financial Connections stays
 * off until the owner confirms Stripe approved our Authorized Purpose and turns it on.
 */

export const FC_CONSENT_VERSION = "elite-fc-2026-11";
export const FC_CONSENT_TEXT =
  "I authorize The Art of Connect to use Stripe to connect my bank account and receive the account holder name, current balance and up to 12 months of transaction history, " +
  "solely to support the private review of my Elite Concierge eligibility. Only summaries are kept (never individual transactions), they are visible only to the founder, " +
  "they are never shared with other members, Journey, matches or business connections, and they are deleted after review. Bank deposits are not treated as verified income, " +
  "and balances are not treated as net worth. I can disconnect at any time.";

type Gate = { stripe: Stripe; live: boolean } | { stripe: null; reason: string };

async function isTester(userId: string) {
  const db = createAdminClient();
  if (!db) return false;
  const [{ data: p }, { data: r }] = await Promise.all([
    db.from("profiles").select("is_test").eq("id", userId).maybeSingle(),
    db.from("staff_roles").select("role").eq("user_id", userId).limit(1),
  ]);
  return Boolean(p?.is_test) || Boolean(r?.length);
}

/** Who may use a Stripe verification service right now. */
export async function verificationGate(kind: "identity" | "financial" | "fee", userId: string): Promise<Gate> {
  const s = await getStripe();
  if (!s.stripe) return { stripe: null, reason: s.reason ?? "Verification is not configured." };
  const launch = await getLaunchState();
  if (!s.isLive) {
    // Sandbox: no real verification, no real money. Limited to the owner, staff and test accounts.
    if (launch.testSession || (await isTester(userId))) return { stripe: s.stripe, live: false };
    return { stripe: null, reason: "This opens when Elite verification launches." };
  }
  const db = createAdminClient();
  const { data: es } = db ? await db.from("elite_settings").select("financial_connections_live, financial_purpose_approved, expedited_fee_active").maybeSingle() : { data: null };
  if (kind === "identity" && !launch.identity_verification_live) return { stripe: null, reason: "Identity verification opens at launch." };
  if (kind === "financial" && !(es?.financial_connections_live && es.financial_purpose_approved)) return { stripe: null, reason: "Bank verification isn't available yet." };
  if (kind === "fee" && !(launch.payments_live && es?.expedited_fee_active)) return { stripe: null, reason: "Expedited verification isn't available yet." };
  return { stripe: s.stripe, live: true };
}

/** The publishable key must belong to the same Stripe mode as the secret key. */
export function publishableKey(live: boolean) {
  const pk = (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "").trim();
  if (!pk) return null;
  return pk.startsWith(live ? "pk_live_" : "pk_test_") ? pk : null;
}

async function verifiedName(stripe: Stripe, userId: string) {
  const db = createAdminClient();
  if (!db) return null;
  const { data } = await db.from("identity_verifications").select("provider_session_id").eq("user_id", userId).eq("status", "verified").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return null;
  try {
    const v = await stripe.identity.verificationSessions.retrieve(data.provider_session_id, { expand: ["verified_outputs"] });
    return { first: v.verified_outputs?.first_name ?? null, last: v.verified_outputs?.last_name ?? null };
  } catch {
    return null;
  }
}

/** Gets or creates the member's Stripe customer used as the Financial Connections account holder. */
async function customerFor(stripe: Stripe, userId: string, email: string) {
  const db = createAdminClient()!;
  const { data: prior } = await db.from("elite_financial_sessions").select("stripe_customer_id").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (prior?.stripe_customer_id) {
    try {
      const c = await stripe.customers.retrieve(prior.stripe_customer_id);
      if (!("deleted" in c && c.deleted)) return c.id;
    } catch { /* create a new one */ }
  }
  const c = await stripe.customers.create({ email: email || undefined, metadata: { user_id: userId, purpose: "elite_verification" } });
  return c.id;
}

export async function startFinancialSession(input: { userId: string; email: string; candidateId: string }) {
  const gate = await verificationGate("financial", input.userId);
  if (!gate.stripe) return { ok: false as const, message: gate.reason };
  const pk = publishableKey(gate.live);
  if (!pk) return { ok: false as const, message: "Bank verification needs the Stripe publishable key for this mode (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)." };
  const db = createAdminClient()!;
  const customer = await customerFor(gate.stripe, input.userId, input.email);
  const session = await gate.stripe.financialConnections.sessions.create({
    account_holder: { type: "customer", customer },
    permissions: ["ownership", "balances", "transactions"],
    prefetch: ["ownership", "balances", "transactions"],
  });
  await db.from("elite_financial_sessions").insert({
    user_id: input.userId, candidate_id: input.candidateId, stripe_session_id: session.id, stripe_customer_id: customer,
    livemode: session.livemode, consent_version: FC_CONSENT_VERSION,
  });
  return { ok: true as const, clientSecret: session.client_secret, publishableKey: pk };
}

/** After the member finishes Stripe's flow: record the linked accounts and open a private review item. */
export async function completeFinancialSession(input: { userId: string; stripeSessionId: string }) {
  const db = createAdminClient();
  if (!db) return { ok: false as const, message: "Not available." };
  const { data: row } = await db.from("elite_financial_sessions").select("id, candidate_id, status, livemode").eq("stripe_session_id", input.stripeSessionId).eq("user_id", input.userId).maybeSingle();
  if (!row) return { ok: false as const, message: "That connection wasn't found." };
  const gate = await verificationGate("financial", input.userId);
  if (!gate.stripe) return { ok: false as const, message: gate.reason };
  const session = await gate.stripe.financialConnections.sessions.retrieve(input.stripeSessionId);
  const accounts = session.accounts?.data ?? [];
  if (!accounts.length) {
    await db.from("elite_financial_sessions").update({ status: "canceled" }).eq("id", row.id);
    return { ok: false as const, message: "No account was connected. You can try again whenever you like." };
  }
  for (const a of accounts) {
    await db.from("elite_financial_accounts").upsert({
      user_id: input.userId, candidate_id: row.candidate_id, session_id: row.id, stripe_account_id: a.id, livemode: a.livemode,
      institution_name: a.institution_name?.slice(0, 200) ?? null, category: a.category, subcategory: a.subcategory, last4: a.last4 ?? null,
    }, { onConflict: "stripe_account_id", ignoreDuplicates: true });
  }
  if (row.status !== "completed") {
    await db.from("elite_financial_sessions").update({ status: "completed" }).eq("id", row.id);
    const names = accounts.map((a) => `${a.institution_name ?? "Bank"}${a.last4 ? ` ••${a.last4}` : ""}`).join(", ");
    await db.from("elite_evidence").insert({
      candidate_id: row.candidate_id, kind: "financial_verification", status: "submitted",
      description: `Bank connection via Stripe Financial Connections${row.livemode ? "" : " (Sandbox test)"}: ${names}. Supporting evidence for owner review.`.slice(0, 1000),
    });
    await db.from("elite_candidates").update({ status: "verification_pending" }).eq("id", row.candidate_id).in("status", ["preliminary", "not_started", "info_required"]);
  }
  for (const a of accounts) await collectAccountData(a.id);
  return { ok: true as const, message: `Connected ${accounts.length} account${accounts.length === 1 ? "" : "s"}. Your founder will review the results privately.` };
}

/**
 * Reads whatever Stripe has finished refreshing for one account and keeps only summaries.
 * Called after connection, from Stripe's refresh webhooks and by the owner's Refresh button.
 * Once every data type is settled the account is disconnected, so no further data flows.
 */
export async function collectAccountData(stripeAccountId: string) {
  const db = createAdminClient();
  if (!db) return;
  const { data: row } = await db.from("elite_financial_accounts").select("id, user_id, data_status, disconnected_at").eq("stripe_account_id", stripeAccountId).maybeSingle();
  if (!row || row.data_status === "purged" || row.disconnected_at) return;
  const { stripe } = await getStripe();
  if (!stripe) return;
  const acct = await stripe.financialConnections.accounts.retrieve(stripeAccountId);
  const patch: Record<string, unknown> = {};

  const bal = acct.balance_refresh?.status;
  if (bal === "succeeded" && acct.balance) {
    const cur = Object.entries(acct.balance.current ?? {})[0];
    if (cur) { patch.balance_currency = cur[0]; patch.balance_cents = Math.round(Number(cur[1])); }
    patch.balance_as_of = acct.balance.as_of ? new Date(acct.balance.as_of * 1000).toISOString() : null;
  }

  const own = acct.ownership_refresh?.status;
  if (own === "succeeded" && acct.ownership) {
    const ownershipId = typeof acct.ownership === "string" ? acct.ownership : acct.ownership.id;
    const owners = await stripe.financialConnections.accounts.listOwners(stripeAccountId, { ownership: ownershipId, limit: 20 });
    patch.ownership_result = compareNames(await verifiedName(stripe, row.user_id), owners.data.map((o) => o.name ?? "").filter(Boolean));
  } else if (own === "failed") patch.ownership_result = "unavailable";

  const tx = acct.transaction_refresh?.status;
  if (tx === "succeeded") {
    const since = Math.floor(Date.now() / 1000) - 365 * 86400;
    let deposits = 0, count = 0, oldest = Infinity;
    for await (const t of stripe.financialConnections.transactions.list({ account: stripeAccountId, transacted_at: { gte: since }, limit: 100 })) {
      if (t.status === "void") continue;
      oldest = Math.min(oldest, t.transacted_at);
      if (t.amount > 0) { deposits += t.amount; count++; }
    }
    patch.deposits_12m_cents = deposits;
    patch.deposits_12m_count = count;
    patch.months_covered = Number.isFinite(oldest) ? Math.max(0, Math.round((Date.now() / 1000 - oldest) / 2_629_800)) : 0;
  }

  const states = [bal, own, tx];
  const settled = states.every((s) => s === "succeeded" || s === "failed");
  if (settled) {
    patch.data_status = states.every((s) => s === "succeeded") ? "collected" : states.some((s) => s === "succeeded") ? "partial" : "failed";
    const { data: es } = await db.from("elite_settings").select("evidence_retention_days").maybeSingle();
    patch.delete_after = new Date(Date.now() + (es?.evidence_retention_days ?? 90) * 86_400_000).toISOString();
    try { await stripe.financialConnections.accounts.disconnect(stripeAccountId); patch.disconnected_at = new Date().toISOString(); } catch { /* retried on next refresh */ }
  }
  if (Object.keys(patch).length) await db.from("elite_financial_accounts").update(patch).eq("id", row.id);
}

/** Member withdraws consent (or the owner purges): disconnect at Stripe and erase the amounts. */
export async function disconnectAccount(accountRowId: string, userId: string | null) {
  const db = createAdminClient();
  if (!db) return false;
  let q = db.from("elite_financial_accounts").select("id, stripe_account_id, disconnected_at").eq("id", accountRowId);
  if (userId) q = q.eq("user_id", userId);
  const { data: row } = await q.maybeSingle();
  if (!row) return false;
  const { stripe } = await getStripe();
  if (stripe && !row.disconnected_at) { try { await stripe.financialConnections.accounts.disconnect(row.stripe_account_id); } catch { /* already disconnected */ } }
  await db.from("elite_financial_accounts").update({
    disconnected_at: row.disconnected_at ?? new Date().toISOString(), balance_cents: null, balance_as_of: null,
    deposits_12m_cents: null, deposits_12m_count: null, months_covered: null, data_status: "purged",
  }).eq("id", row.id);
  return true;
}

// ─── Expedited verification fee (Stripe Payments) ─────────────────

export async function startExpeditedPayment(input: { userId: string; email: string }) {
  const db = createAdminClient();
  if (!db) return { ok: false as const, message: "Not available." };
  const [{ data: c }, { data: es }] = await Promise.all([
    db.from("elite_candidates").select("id, pathway, status, screening_meets, fee_waived, fee_paid_at").eq("user_id", input.userId).maybeSingle(),
    db.from("elite_settings").select("expedited_fee_cents, expedited_fee_active").maybeSingle(),
  ]);
  // Offered only after preliminary screening; never to someone who didn't pass it.
  if (!c || c.pathway !== "expedited" || !c.screening_meets || !["preliminary", "verification_pending", "info_required", "manual_review"].includes(c.status)) {
    return { ok: false as const, message: "Expedited verification is offered only after preliminary screening." };
  }
  if (c.fee_waived || c.fee_paid_at) return { ok: false as const, message: "Nothing is due." };
  const amount = es?.expedited_fee_cents ?? 0;
  if (amount <= 0) return { ok: false as const, message: "Pricing is being finalized." };
  const gate = await verificationGate("fee", input.userId);
  if (!gate.stripe) return { ok: false as const, message: gate.reason };
  const { data: pay, error } = await db.from("elite_verification_payments").insert({ user_id: input.userId, candidate_id: c.id, amount_cents: amount, livemode: gate.live }).select("id").single();
  if (error || !pay) return { ok: false as const, message: "That couldn't start. Nothing was charged." };
  const session = await gate.stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.email || undefined,
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: amount, product_data: { name: "Elite Concierge — Expedited Verification", description: "A faster, private verification review. It does not guarantee or purchase admission.", metadata: { role: "elite_verification" } } } }],
    metadata: { elite_fee_payment_id: pay.id, user_id: input.userId },
    payment_intent_data: { metadata: { elite_fee_payment_id: pay.id, user_id: input.userId } },
    success_url: `${env.siteUrl}/app/elite/eligibility?fee=paid`,
    cancel_url: `${env.siteUrl}/app/elite/eligibility?fee=canceled`,
  });
  await db.from("elite_verification_payments").update({ stripe_checkout_session_id: session.id }).eq("id", pay.id);
  return { ok: true as const, url: session.url ?? undefined, message: "Opening secure checkout…" };
}

/** Elite-specific Stripe events. Returns true when the event was fully handled here. */
export async function handleEliteStripeEvent(stripe: Stripe, event: Stripe.Event): Promise<boolean> {
  const db = createAdminClient();
  if (!db) return false;
  switch (event.type) {
    case "financial_connections.account.refreshed_balance":
    case "financial_connections.account.refreshed_ownership":
    case "financial_connections.account.refreshed_transactions":
      await collectAccountData((event.data.object as Stripe.FinancialConnections.Account).id);
      return true;
    case "checkout.session.completed": {
      const cs = event.data.object as Stripe.Checkout.Session;
      const id = cs.metadata?.elite_fee_payment_id;
      if (!id) return false;
      if (cs.payment_status !== "paid") return true;
      const pi = typeof cs.payment_intent === "string" ? cs.payment_intent : cs.payment_intent?.id ?? null;
      const { data: pay } = await db.from("elite_verification_payments").update({ status: "paid", paid_at: new Date().toISOString(), stripe_payment_intent_id: pi, livemode: event.livemode })
        .eq("id", id).eq("status", "pending").select("candidate_id, user_id").maybeSingle();
      if (pay) {
        await db.from("elite_candidates").update({ fee_paid_at: new Date().toISOString() }).eq("id", pay.candidate_id);
        await db.from("elite_candidates").update({ status: "verification_pending" }).eq("id", pay.candidate_id).eq("status", "preliminary");
        await db.rpc("elite_evaluate", { p_user: pay.user_id });
      }
      return true;
    }
    case "checkout.session.expired": {
      const id = (event.data.object as Stripe.Checkout.Session).metadata?.elite_fee_payment_id;
      if (!id) return false;
      await db.from("elite_verification_payments").update({ status: "canceled" }).eq("id", id).eq("status", "pending");
      return true;
    }
    case "charge.refunded": {
      const ch = event.data.object as Stripe.Charge;
      const pi = typeof ch.payment_intent === "string" ? ch.payment_intent : ch.payment_intent?.id;
      if (!pi) return false;
      const { data: hit } = await db.from("elite_verification_payments").update({ refunded_cents: ch.amount_refunded, status: ch.refunded ? "refunded" : "partially_refunded" })
        .eq("stripe_payment_intent_id", pi).select("id");
      return Boolean(hit?.length);
    }
  }
  return false;
}
