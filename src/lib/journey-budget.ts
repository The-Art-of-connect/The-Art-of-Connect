/**
 * Journey AI usage and spending controls — pure functions, enforced on the
 * server BEFORE every OpenAI request. Provider budget alerts are a backstop
 * only. The database repeats the money and allowance checks atomically
 * (journey_reserve) so simultaneous requests cannot slip past a limit.
 *
 * Founder rules:
 *   • Journey is paid-only. Elite Concierge (all-inclusive) has unlimited text,
 *     protected by fair-use and abuse safeguards; every other membership has an allowance.
 *   • Each membership has ONE monthly message allowance (bundles are not
 *     multiplied). Couples share one allowance between both partners.
 *   • Included messages reset each billing period and do not roll over.
 *     Purchased message packages are used after the included allowance and
 *     expire under owner-set rules.
 *   • Members are never charged automatically. When the allowance is used up,
 *     new AI requests stop; conversations, safety tools and every non-AI
 *     feature stay available.
 *   • Failed and duplicate requests never use up a message.
 *   • Fail closed: a missing price, limit or allowance means no request.
 */

// ─── Initial allowances (owner-configurable; seeded in the database) ───
export const INITIAL_MONTHLY_MESSAGES: Readonly<Record<string, number>> = {
  "art-of-becoming": 100,
  "professional-society": 125,
  "personal-society": 150,
  "business-life": 175,
  "life-love": 200,
  "dual-society": 225,
  "couples-membership": 250, // shared between both partners
  "complete-society": 300,
  "executive-private": 450,
  "elite-concierge": 750,
};
export const FREE_ACCOUNT_MESSAGES = 0;

/** Proposed add-on packages. Prices stay unpublished until the owner approves them. */
export const PROPOSED_MESSAGE_PACKAGES: readonly { messages: number; priceCents: number }[] = [
  { messages: 25, priceCents: 499 },
  { messages: 50, priceCents: 899 },
  { messages: 100, priceCents: 1499 },
  { messages: 250, priceCents: 2999 },
];

export const USAGE_NOTICE_THRESHOLDS = [75, 90, 100] as const;

// ─── Types ──────────────────────────────────────────────────────────
export type ModelRate = {
  id: string;
  /** US cents per 1,000,000 input tokens, entered by the owner from OpenAI's current pricing. */
  inputCentsPerMillion: number | null;
  outputCentsPerMillion: number | null;
  enabled: boolean;
};

export type JourneySettings = {
  enabled: boolean;
  paidUsageAuthorized: boolean;
  companyMonthlyLimitCents: number | null;
  ownerTestMonthlyLimitCents: number | null;
  alertThresholds: number[];
  models: ModelRate[];
  defaultModel: string | null;
  perMinuteRequests: number;
  maxInputChars: number;
  /** How many earlier messages are sent back to the model as context. */
  maxHistoryMessages: number;
  /** Characters of earlier conversation sent as context, at most. */
  maxHistoryChars: number;
  /** Attachments are not processed unless the owner turns this on. */
  attachmentsEnabled: boolean;
};

export type TierLimit = {
  packageSlug: string;
  monthlyMessages: number | null;
  dailyMessages: number | null;
  memberMonthlyLimitCents: number | null;
  tierMonthlyLimitCents: number | null;
  maxOutputTokens: number;
  model: string | null;
  /** All-inclusive memberships: no message allowance and never a purchase prompt; fair use only. */
  unlimited?: boolean;
  fairUseDaily?: number;
  /** Directive 51: a couple's per-person share of the monthly allowance (null: the whole allowance). */
  personMonthlyLimitCents?: number | null;
};

/** Directive 51 allowance mode: a monthly dollar allowance at actual AI cost (no message count, never unlimited). */
export const isAllowanceMode = (t: Pick<TierLimit, "monthlyMessages" | "unlimited" | "memberMonthlyLimitCents"> | null | undefined) =>
  Boolean(t && !t.unlimited && t.monthlyMessages == null && t.memberMonthlyLimitCents != null);

/** Usage counted against one allowance holder (a member, or a couple's shared account). */
export type Usage = {
  /** Requests reserved but not finished yet. */
  inFlight: number;
  minuteRequests: number;
  dayMessages: number;
  /** Completed messages this billing period (failed and duplicate requests are not counted). */
  periodMessages: number;
  periodCents: number;
  tierMonthCents: number;
  companyMonthCents: number;
  /** Purchased messages still unexpired. */
  purchasedRemaining: number;
  /** Allowance mode: this person's own text and voice cost this period (couples share a holder). */
  personCents?: number;
};

export type Decision =
  | { allowed: true; model: string; maxOutputTokens: number; reserveCents: number; usesPurchased: boolean }
  | { allowed: false; reason: string; memberMessage: string };

const RESTING = "Journey is resting right now. Please try again a little later.";
const deny = (reason: string, memberMessage = RESTING): Decision => ({ allowed: false, reason, memberMessage });

// ─── Cost ───────────────────────────────────────────────────────────
/** A cautious estimate: about 4 characters per token, rounded up, plus a margin. */
export const estimateTokens = (chars: number) => Math.ceil(Math.max(0, chars) / 4) + 16;

/** Cost in cents, rounded up to 1/10,000 of a cent. Null if the model has no rate entered. */
export function costCents(rate: ModelRate, inputTokens: number, outputTokens: number): number | null {
  if (rate.inputCentsPerMillion == null || rate.outputCentsPerMillion == null) return null;
  const raw = (inputTokens * rate.inputCentsPerMillion + outputTokens * rate.outputCentsPerMillion) / 1_000_000;
  return Math.ceil(raw * 10_000) / 10_000;
}

/** Keep only the most recent history that fits the owner's context limits. */
export function trimHistory<T extends { content: string }>(history: readonly T[], maxMessages: number, maxChars: number): T[] {
  const out: T[] = [];
  let chars = 0;
  for (let i = history.length - 1; i >= 0 && out.length < maxMessages; i--) {
    chars += history[i].content.length;
    if (chars > maxChars) break;
    out.unshift(history[i]);
  }
  return out;
}

// ─── The decision ───────────────────────────────────────────────────
export function decide(input: {
  settings: JourneySettings;
  tier: TierLimit | null;
  usage: Usage;
  promptChars: number;
  messageChars: number;
  hasAttachment?: boolean;
  /** Owner testing uses its own budget and never a member allowance. */
  ownerTest?: boolean;
}): Decision {
  const { settings: s, usage: u } = input;
  if (!s.enabled) return deny("Journey is switched off");
  if (!s.paidUsageAuthorized) return deny("Paid AI usage has not been authorized by the owner");
  if (input.hasAttachment && !s.attachmentsEnabled) return deny("Attachments are off", "Journey can't read attachments yet. Please describe what you'd like help with.");
  if (input.messageChars < 1) return deny("Empty message", "Please type a message.");
  if (input.messageChars > s.maxInputChars) return deny("Message too long", `Please keep your message under ${s.maxInputChars.toLocaleString("en-US")} characters.`);
  if (u.inFlight > 0) return deny("A request is already in progress", "Journey is still replying to your last message.");
  if (u.minuteRequests >= s.perMinuteRequests) return deny("Per-minute rate limit", "You're sending messages quickly. Please pause for a moment.");

  const tier = input.ownerTest ? null : input.tier;
  if (!input.ownerTest && !tier) return deny("No Journey allowance is set for this membership", "Journey isn't included in your membership.");

  const modelId = tier?.model ?? s.defaultModel;
  const rate = s.models.find((m) => m.id === modelId && m.enabled);
  if (!rate) return deny("No approved model is configured");
  // Owner tests get more room, so newer reasoning models can think and still reply in full.
  const maxOut = tier?.maxOutputTokens ?? (input.ownerTest ? 1600 : 700);
  const reserve = costCents(rate, estimateTokens(input.promptChars + input.messageChars), maxOut);
  if (reserve === null) return deny("The approved model has no rate entered");

  if (s.companyMonthlyLimitCents === null) return deny("The company monthly AI budget is not set");
  if (u.companyMonthCents + reserve > s.companyMonthlyLimitCents) return deny("Company spending limit reached");

  if (input.ownerTest) {
    if (s.ownerTestMonthlyLimitCents === null) return deny("The owner testing budget is not set");
    if (u.periodCents + reserve > s.ownerTestMonthlyLimitCents) return deny("Owner testing budget reached", "This month's testing budget has been used.");
    return { allowed: true, model: rate.id, maxOutputTokens: maxOut, reserveCents: reserve, usesPurchased: false };
  }

  const t = tier!;
  if (isAllowanceMode(t)) {
    const FAIR = "You've had a remarkable number of conversations with Journey today. To keep Journey attentive for every member, please continue a little later.";
    if (u.dayMessages >= (t.fairUseDaily ?? 300)) return deny("Fair-use daily limit", FAIR);
    const over = u.periodCents + reserve > t.memberMonthlyLimitCents! || (t.personMonthlyLimitCents != null && (u.personCents ?? 0) + reserve > t.personMonthlyLimitCents);
    if (over && u.purchasedRemaining <= 0)
      return deny("Allowance used", "You've used this month's included Journey allowance. Your conversations are saved, and your allowance renews on your next billing date.");
    if (t.tierMonthlyLimitCents != null && u.tierMonthCents + reserve > t.tierMonthlyLimitCents) return deny("Membership spending limit reached");
    return { allowed: true, model: rate.id, maxOutputTokens: t.maxOutputTokens, reserveCents: reserve, usesPurchased: over };
  }
  if (t.unlimited) {
    for (const [v, name] of [[t.memberMonthlyLimitCents, "member fair-use ceiling"], [t.tierMonthlyLimitCents, "membership spending limit"]] as const)
      if (v === null || v < 0) return deny(`The ${name} is not set`);
    const FAIR = "You've had a remarkable number of conversations with Journey today. To keep Journey fast and attentive for every member, please continue a little later.";
    if (u.dayMessages >= (t.fairUseDaily ?? 300)) return deny("Fair-use daily limit", FAIR);
    if (u.periodCents + reserve > t.memberMonthlyLimitCents!) return deny("Fair-use cost ceiling", FAIR);
    if (u.tierMonthCents + reserve > t.tierMonthlyLimitCents!) return deny("Membership spending limit reached");
    return { allowed: true, model: rate.id, maxOutputTokens: t.maxOutputTokens, reserveCents: reserve, usesPurchased: false };
  }
  for (const [v, name] of [[t.monthlyMessages, "monthly message allowance"], [t.dailyMessages, "daily message limit"], [t.memberMonthlyLimitCents, "member spending limit"], [t.tierMonthlyLimitCents, "membership spending limit"]] as const)
    if (v === null || v < 0) return deny(`The ${name} is not set`);

  const includedLeft = Math.max(0, t.monthlyMessages! - u.periodMessages);
  const usesPurchased = includedLeft === 0;
  if (usesPurchased && u.purchasedRemaining <= 0)
    return deny("Allowance used", "You've used this period's Journey messages. Your conversations are still here, and your allowance resets on your next billing date. You can also add a message package if you'd like.");
  if (u.dayMessages >= t.dailyMessages!) return deny("Daily limit reached", "You've reached today's Journey limit. Journey will be available again tomorrow.");
  // A member's own spending cap protects the company even within their message allowance.
  if (!usesPurchased && u.periodCents + reserve > t.memberMonthlyLimitCents!)
    return deny("Member spending cap reached", "You've reached this period's Journey usage. Your allowance resets on your next billing date.");
  if (u.tierMonthCents + reserve > t.tierMonthlyLimitCents!) return deny("Membership spending limit reached");

  return { allowed: true, model: rate.id, maxOutputTokens: t.maxOutputTokens, reserveCents: reserve, usesPurchased };
}

// ─── What the member sees ───────────────────────────────────────────
export type AllowanceView = {
  /** All-inclusive (Elite): unlimited text, fair use applies. `remaining` is then a large sentinel. */
  unlimited?: boolean;
  /** Directive 51 allowance mode: allowance, used and remaining are cents of actual AI cost. */
  cents?: boolean;
  /** Pay-as-you-go (no paid membership): only purchased Journey credits, one per reply. */
  creditsOnly?: boolean;
  allowance: number;
  used: number;
  remaining: number;
  purchasedRemaining: number;
  percentUsed: number;
  resetsOn: string;
  notice: (typeof USAGE_NOTICE_THRESHOLDS)[number] | null;
};

export const UNLIMITED_SENTINEL = 9999;

/** Directive 51: the included allowance in dollars at actual cost. allowance/used/remaining are cents. */
export function dollarView(limitCents: number, usedCents: number, purchasedRemaining: number, periodEnd: Date): AllowanceView {
  const used = Math.max(0, usedCents);
  const remaining = Math.max(0, limitCents - used);
  const percentUsed = limitCents > 0 ? Math.min(100, Math.floor((used / limitCents) * 100)) : 100;
  const notice = [...USAGE_NOTICE_THRESHOLDS].reverse().find((t) => percentUsed >= t) ?? null;
  return { cents: true, allowance: limitCents, used: Math.min(used, limitCents), remaining, purchasedRemaining, percentUsed, resetsOn: periodEnd.toISOString().slice(0, 10), notice };
}

const usd = (cents: number) => `$${(Math.floor(cents) / 100).toFixed(2)}`;
/** Pay-as-you-go balance: purchased Journey credits only (one credit per reply). */
export function creditsView(credits: number, periodEnd: Date): AllowanceView {
  return { creditsOnly: true, allowance: 0, used: 0, remaining: 0, purchasedRemaining: Math.max(0, credits), percentUsed: 0, resetsOn: periodEnd.toISOString().slice(0, 10), notice: null };
}

/** One wording for the balance everywhere: Home, Journey, membership settings and the Owner Portal. */
export function balanceLabel(v: AllowanceView | null | undefined): string | null {
  if (!v) return null;
  if (v.creditsOnly) return `${v.purchasedRemaining} Journey credit${v.purchasedRemaining === 1 ? "" : "s"} remaining`;
  if (v.cents) return `${usd(v.remaining)} of ${usd(v.allowance)} included this month`;
  if (v.unlimited) return "Included in your membership";
  return `${v.remaining} of ${v.allowance} messages left this month`;
}
/** Whether any included or purchased Journey usage remains. */
export const hasBalance = (v: AllowanceView | null | undefined) => Boolean(v && (v.unlimited || v.remaining >= 1 || v.purchasedRemaining > 0));
export function unlimitedView(used: number, periodEnd: Date): AllowanceView {
  return { unlimited: true, allowance: 0, used, remaining: UNLIMITED_SENTINEL, purchasedRemaining: 0, percentUsed: 0, resetsOn: periodEnd.toISOString().slice(0, 10), notice: null };
}
export function allowanceView(allowance: number, used: number, purchasedRemaining: number, periodEnd: Date): AllowanceView {
  const remaining = Math.max(0, allowance - used);
  const percentUsed = allowance > 0 ? Math.min(100, Math.floor((used / allowance) * 100)) : 100;
  const notice = [...USAGE_NOTICE_THRESHOLDS].reverse().find((t) => percentUsed >= t) ?? null;
  return { allowance, used: Math.min(used, allowance), remaining, purchasedRemaining, percentUsed, resetsOn: periodEnd.toISOString().slice(0, 10), notice };
}

/** Thresholds newly crossed by a change in company spend (owner alerts). */
export function crossedThresholds(limitCents: number | null, beforeCents: number, afterCents: number, thresholds: number[]): number[] {
  if (!limitCents || limitCents <= 0) return [];
  const pct = (c: number) => (c / limitCents) * 100;
  return thresholds.filter((t) => pct(beforeCents) < t && pct(afterCents) >= t).sort((a, b) => a - b);
}

/** Owner dashboard figures. */
export function unitEconomics(i: { aiCostCents: number; payingMembers: number; messagePackRevenueCents: number; membershipRevenueCents: number }) {
  return {
    costPerPayingMember: i.payingMembers > 0 ? i.aiCostCents / i.payingMembers : 0,
    aiNetCents: i.messagePackRevenueCents - i.aiCostCents,
    marginAfterAiCents: i.membershipRevenueCents + i.messagePackRevenueCents - i.aiCostCents,
  };
}
