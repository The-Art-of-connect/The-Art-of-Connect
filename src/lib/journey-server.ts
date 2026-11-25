import "server-only";
import { getMfaStatus, getViewer } from "@/lib/auth";
import { getLaunchState } from "@/lib/launch";
import { createAdminClient } from "@/lib/supabase/admin";
import { createResponse, isOpenAIConfigured, type ChatTurn } from "@/lib/openai";
import {
  buildJourneyInstructions, journeyAccessFor, modeAllowed, ownerTestAccess,
  type JourneyCapability, type JourneyMode, type PaidMembership,
} from "@/lib/journey";
import {
  allowanceView, costCents, decide, trimHistory, type AllowanceView, type JourneySettings, type TierLimit,
} from "@/lib/journey-budget";

/**
 * The only path from a member to OpenAI. Order of checks, all on the server:
 *   1. Signed in, active account.
 *   2. A PAID membership that includes this Journey experience (free
 *      accounts, visitors and owner grants without payment get nothing).
 *   3. The experience is launched (owner tests are separately authorized).
 *   4. Emergency switch on, paid usage authorized, OpenAI key present.
 *   5. Allowances, rate limits and spending caps (decide()).
 *   6. Atomic database reservation (journey_reserve) — re-checks money and
 *      messages under a lock, refuses duplicates and simultaneous requests.
 *   7. Only then: the OpenAI request. Afterwards the actual cost is
 *      reconciled; a failed request never uses a message.
 */

const LAUNCH_KEY: Record<Exclude<JourneyMode, "concierge">, "business_live" | "counseling_live" | "relationships_live"> = {
  business: "business_live", life: "counseling_live", love: "relationships_live",
};

const SAFETY_NOTE =
  "If you or someone else may be in danger, contact local emergency services (911 in the U.S.) or call or text 988 for the Suicide & Crisis Lifeline. You can also reach our safety team from Safety in your member menu.";

export type JourneyReply =
  | { ok: true; reply: string; conversationId: string | null; allowance: AllowanceView | null }
  | { ok: false; status: number; message: string; allowance?: AllowanceView | null; safety: string };

const refuse = (status: number, message: string, allowance?: AllowanceView | null): JourneyReply => ({ ok: false, status, message, allowance, safety: SAFETY_NOTE });

type Db = NonNullable<ReturnType<typeof createAdminClient>>;

async function loadSettings(db: Db) {
  const [{ data: s }, { data: models }] = await Promise.all([
    db.from("journey_settings").select("*").maybeSingle(),
    db.from("journey_models").select("id, input_cents_per_million, output_cents_per_million, enabled"),
  ]);
  if (!s) return null;
  const settings: JourneySettings = {
    enabled: s.enabled,
    paidUsageAuthorized: s.paid_usage_authorized,
    companyMonthlyLimitCents: s.company_monthly_limit_cents === null ? null : Number(s.company_monthly_limit_cents),
    ownerTestMonthlyLimitCents: s.owner_test_monthly_limit_cents === null ? null : Number(s.owner_test_monthly_limit_cents),
    alertThresholds: s.alert_thresholds ?? [],
    defaultModel: s.default_model,
    perMinuteRequests: s.per_minute_requests,
    maxInputChars: s.max_input_chars,
    maxHistoryMessages: s.max_history_messages,
    maxHistoryChars: s.max_history_chars,
    attachmentsEnabled: s.attachments_enabled,
    models: (models ?? []).map((m) => ({
      id: m.id, enabled: m.enabled,
      inputCentsPerMillion: m.input_cents_per_million === null ? null : Number(m.input_cents_per_million),
      outputCentsPerMillion: m.output_cents_per_million === null ? null : Number(m.output_cents_per_million),
    })),
  };
  return {
    settings,
    ownerTestingEnabled: Boolean(s.owner_testing_enabled),
    enhancedPackages: (s.enhanced_packages ?? []) as string[],
    entitledStatuses: (s.entitled_statuses ?? []) as string[],
    disabled: (s.disabled_capabilities ?? []) as JourneyCapability[],
  };
}

/** The paying membership behind this member, and whose allowance they draw from (a couple shares the subscriber's). */
async function membershipFor(db: Db, userId: string) {
  const pick = "user_id, kind, status, tier_slug, experiences, amount_cents, couples_upgrade, current_period_end, billing_interval";
  const { data: own } = await db.from("subscriptions").select(pick).eq("user_id", userId).eq("kind", "member").order("created_at", { ascending: false }).limit(1).maybeSingle();
  let sub = own;
  if (!sub) {
    const { data: mine } = await db.schema("relationships").from("couple_members").select("couple_id").eq("user_id", userId).maybeSingle();
    if (mine) {
      const { data: others } = await db.schema("relationships").from("couple_members").select("user_id").eq("couple_id", mine.couple_id).neq("user_id", userId);
      const ids = (others ?? []).map((o) => o.user_id as string);
      if (ids.length) {
        const { data: partnerSub } = await db.from("subscriptions").select(pick).in("user_id", ids).eq("kind", "member").eq("couples_upgrade", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
        sub = partnerSub;
      }
    }
  }
  if (!sub) return null;
  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end) : null;
  const periodStart = periodEnd ? new Date(periodEnd) : null;
  if (periodStart) periodStart.setUTCMonth(periodStart.getUTCMonth() - (sub.billing_interval === "year" ? 12 : 1));
  // Annual members still get a MONTHLY allowance: use the current month within the paid year.
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const start = sub.billing_interval === "year" || !periodStart ? monthStart : periodStart;
  const membership: PaidMembership = {
    kind: sub.kind, status: sub.status, packageSlug: sub.tier_slug, experiences: sub.experiences ?? [], amountCents: sub.amount_cents,
  };
  return { membership, holderId: sub.user_id as string, periodStart: start, periodEnd: periodEnd ?? new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1)) };
}

export async function sendJourneyMessage(input: {
  mode: JourneyMode;
  message: string;
  requestKey: string;
  conversationId?: string | null;
  ownerTest?: boolean;
  hasAttachment?: boolean;
}): Promise<JourneyReply> {
  const viewer = await getViewer();
  if (!viewer) return refuse(401, "Please sign in to talk with Journey.");
  const db = createAdminClient();
  if (!db) return refuse(503, "Journey isn't available yet.");
  const cfg = await loadSettings(db);
  if (!cfg) return refuse(503, "Journey isn't available yet.");

  let holderId = viewer.id;
  let packageSlug: string | null = null;
  let access: "standard" | "enhanced" = "enhanced";
  let periodStart = new Date();
  let periodEnd = new Date();
  let tier: TierLimit | null = null;

  if (input.ownerTest) {
    const mfa = await getMfaStatus();
    if (!ownerTestAccess({ roles: viewer.roles, mfaVerified: mfa.verified, ownerTestingEnabled: cfg.ownerTestingEnabled }))
      return refuse(403, "Owner testing isn't authorized for this session.");
    periodStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  } else {
    const m = await membershipFor(db, viewer.id);
    const level = journeyAccessFor(m?.membership, { enhancedPackages: cfg.enhancedPackages, entitledStatuses: cfg.entitledStatuses });
    if (!m || level === "none") return refuse(403, "Journey is a benefit of paid memberships.");
    if (!modeAllowed(input.mode, level, m.membership)) return refuse(403, "This Journey experience isn't part of your membership.");
    const launch = await getLaunchState();
    if (!launch.payments_live || (input.mode !== "concierge" && !launch[LAUNCH_KEY[input.mode]])) return refuse(403, "Journey opens soon.");
    access = level;
    holderId = m.holderId;
    packageSlug = m.membership.packageSlug;
    periodStart = m.periodStart;
    periodEnd = m.periodEnd;
    const { data: t } = await db.from("journey_tier_limits").select("*").eq("package_slug", packageSlug ?? "").maybeSingle();
    tier = t ? {
      packageSlug: t.package_slug, monthlyMessages: t.monthly_messages, dailyMessages: t.daily_messages,
      memberMonthlyLimitCents: t.member_monthly_limit_cents === null ? null : Number(t.member_monthly_limit_cents),
      tierMonthlyLimitCents: t.tier_monthly_limit_cents === null ? null : Number(t.tier_monthly_limit_cents),
      maxOutputTokens: t.max_output_tokens, model: t.model,
    } : null;
  }

  if (!isOpenAIConfigured()) return refuse(503, "Journey isn't available yet.");

  const { data: u } = await db.rpc("journey_holder_usage", { p_holder: holderId, p_period_start: periodStart.toISOString() });
  const usage = u as Record<string, number | string> | null;
  const view = tier?.monthlyMessages != null && usage
    ? allowanceView(tier.monthlyMessages, Number(usage.period_messages), Number(usage.purchased_remaining), periodEnd)
    : null;

  // Instructions: founder's philosophy and guardrails first, then the owner's published version.
  const { data: published } = await db.from("journey_instruction_versions").select("version, body").eq("status", "published").maybeSingle();
  const instructions = buildJourneyInstructions({ mode: input.mode, access, ownerInstructions: published?.body ?? null, disabledCapabilities: cfg.disabled });

  // Context: only this member's own conversation, trimmed to the owner's limits.
  let history: ChatTurn[] = [];
  if (input.conversationId && !input.ownerTest) {
    const { data: conv } = await db.from("journey_conversations").select("id").eq("id", input.conversationId).eq("user_id", viewer.id).maybeSingle();
    if (!conv) return refuse(404, "That conversation wasn't found.");
    const { data: msgs } = await db.from("journey_messages").select("role, content").eq("conversation_id", conv.id).order("created_at", { ascending: true }).limit(200);
    history = trimHistory((msgs ?? []).map((r) => ({ role: r.role === "journey" ? "assistant" : "user", content: r.content }) as ChatTurn), cfg.settings.maxHistoryMessages, cfg.settings.maxHistoryChars);
  }
  const promptChars = instructions.length + history.reduce((n, h) => n + h.content.length, 0);

  const d = decide({
    settings: cfg.settings, tier, ownerTest: input.ownerTest, promptChars, messageChars: input.message.length, hasAttachment: input.hasAttachment,
    usage: {
      inFlight: Number(usage?.in_flight ?? 0), minuteRequests: Number(usage?.minute ?? 0), dayMessages: Number(usage?.day ?? 0),
      periodMessages: Number(usage?.period_messages ?? 0), periodCents: Number(usage?.period_cents ?? 0),
      purchasedRemaining: Number(usage?.purchased_remaining ?? 0), tierMonthCents: 0, companyMonthCents: 0,
    },
  });
  if (!d.allowed) return refuse(429, d.memberMessage, view);

  const { data: reserved } = await db.rpc("journey_reserve", {
    p_user: viewer.id, p_holder: holderId, p_request_key: input.requestKey, p_package: packageSlug, p_mode: input.mode,
    p_model: d.model, p_reserve: d.reserveCents, p_period_start: periodStart.toISOString(), p_owner_test: Boolean(input.ownerTest),
  });
  if (typeof reserved !== "string" || reserved.startsWith("refused:")) {
    const why = String(reserved ?? "");
    return refuse(429, why === "refused:in_flight" ? "Journey is still replying to your last message." : why === "refused:duplicate" ? "That message was already sent." : "Journey is resting right now. Please try again a little later.", view);
  }
  const usageId = Number(reserved);

  const result = await createResponse({ model: d.model, instructions, history, message: input.message, maxOutputTokens: d.maxOutputTokens });
  const rate = cfg.settings.models.find((m) => m.id === d.model)!;
  const actual = costCents(rate, result.inputTokens, result.outputTokens) ?? d.reserveCents;
  await db.rpc("journey_complete", { p_id: usageId, p_ok: result.ok, p_in: result.inputTokens, p_out: result.outputTokens, p_cost: actual });
  if (!result.ok) return refuse(502, "Journey couldn't reply just now. This message didn't count toward your allowance.", view);

  if (input.ownerTest) {
    await db.from("journey_test_runs").insert({ mode: input.mode, instruction_version: published?.version ?? null, prompt: input.message, reply: result.text, created_by: viewer.id });
    return { ok: true, reply: result.text, conversationId: null, allowance: null };
  }

  let conversationId = input.conversationId ?? null;
  if (!conversationId) {
    const { data: c } = await db.from("journey_conversations").insert({ user_id: viewer.id, mode: input.mode, title: input.message.slice(0, 80) }).select("id").single();
    conversationId = c?.id ?? null;
  }
  if (conversationId) {
    await db.from("journey_messages").insert([
      { conversation_id: conversationId, user_id: viewer.id, role: "member", content: input.message },
      { conversation_id: conversationId, user_id: viewer.id, role: "journey", content: result.text },
    ]);
  }
  const after = view && !d.usesPurchased
    ? allowanceView(view.allowance, view.used + 1, view.purchasedRemaining, periodEnd)
    : view && { ...view, purchasedRemaining: Math.max(0, view.purchasedRemaining - 1) };
  return { ok: true, reply: result.text, conversationId, allowance: after };
}
