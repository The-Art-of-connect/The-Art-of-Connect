import "server-only";
import { guideDraftRequest, guideInstructions, pageContext } from "@/lib/journey-guide";
import { loadGuideAnswers, resolveGuide } from "@/lib/journey-guide-server";
import { teachingGuidance } from "@/lib/curricula";
import { PERSONAS, personaIsPaid } from "@/lib/view-as";
import { cleanPrefs, styleInstructions } from "@/lib/journey-customize";
import { formatTraining, selectTraining, type TrainingEntry } from "@/lib/journey-training";
import { FOUNDER_PRINCIPLES, RESPONSE_STANDARDS } from "@/lib/journey-training-seed";
import { discoveryCategory, discoveryInstructions } from "@/lib/journey-discovery";
import { assemblePortfolio, categoryStatuses, portfolioContext, portfolioInstructions, PORTFOLIO_REQUEST } from "@/lib/portfolio";
import { loadPortfolioInput } from "@/lib/portfolio-server";
import { getMfaStatus, getViewer } from "@/lib/auth";
import { getLaunchState } from "@/lib/launch";
import { createAdminClient } from "@/lib/supabase/admin";
import { createResponse, isOpenAIConfigured, type ChatTurn } from "@/lib/openai";
import { maybeAutoReload } from "@/lib/journey-commerce";
import { JOURNEY_EI_GUIDANCE } from "@/lib/emotional-intelligence";
import { JOURNEY_LOVE_LANGUAGE_GUIDANCE, LOVE_LANGUAGES, isLanguage } from "@/lib/love-languages";
import {
  buildJourneyInstructions, DEFAULT_ENHANCED_PACKAGES, effectiveMode, journeyAccessFor, modeAllowed, ownerTestAccess,
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
  | { ok: true; reply: string; conversationId: string | null; allowance: AllowanceView | null; test?: { id: string | null; model: string; latencyMs: number; inputTokens: number; outputTokens: number; costCents: number; instructionVersion: number | null } }
  | { ok: false; status: number; message: string; allowance?: AllowanceView | null; safety: string };

const refuse = (status: number, message: string, allowance?: AllowanceView | null): JourneyReply => ({ ok: false, status, message, allowance, safety: SAFETY_NOTE });

export type Db = NonNullable<ReturnType<typeof createAdminClient>>;

export async function loadSettings(db: Db) {
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
    memoryEnabled: s.memory_enabled !== false,
    voice: {
      enabled: Boolean(s.voice_enabled), model: (s.voice_model as string | null) ?? null,
      centsPerMinute: s.voice_cents_per_minute === null || s.voice_cents_per_minute === undefined ? null : Number(s.voice_cents_per_minute),
      inactivitySeconds: Number(s.voice_inactivity_seconds ?? 120), maxSessionMinutes: Number(s.voice_max_session_minutes ?? 30),
    },
  };
}

/** The paying membership behind this member, and whose allowance they draw from (a couple shares the subscriber's). */
export async function membershipFor(db: Db, userId: string) {
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
  /** A purchased Journey Private Session (time- and message-limited; doesn't use the monthly allowance). */
  sessionId?: string | null;
  /** Owner tests only: try an approved model and/or a specific personality version (draft or published). */
  model?: string | null;
  instructionVersion?: number | null;
  comparisonId?: string | null;
  /** A curriculum reference ("section" or "section/lesson"): Journey follows the founder's teaching instructions for it. */
  lesson?: string | null;
  /** An adaptive Discovery Session (paid). The session decides the conversation; the client cannot choose another. */
  discovery?: { sessionId: string; summarize?: boolean; skip?: boolean } | null;
  /** The member asked Journey to write their Personal Discovery Portfolio (their own data only, loaded here on the server). */
  portfolio?: boolean;
  /**
   * Universal integration: Journey guides a whole lesson or questionnaire ("who-am-i/beyond-my-titles", "boundaries/self", ...).
   * `draft` asks Journey to document the member's answers (from this conversation, or a spoken transcript) for them to review;
   * drafts are never stored as conversation messages and nothing is saved until the member approves.
   */
  guide?: { ref: string; draft?: boolean; transcript?: string | null; assist?: boolean } | null;
  /** The page the member opened Journey from (the persistent Journey button): a path, described from an allowlist. */
  page?: string | null;
}): Promise<JourneyReply> {
  const viewer = await getViewer();
  // Owner "View as": free personas are refused like any free member; paid personas use the owner's private test budget.
  if (viewer?.viewAs) {
    if (!personaIsPaid(viewer.viewAs)) return refuse(403, "Journey is a benefit of paid memberships.");
    input = { ...input, ownerTest: true };
  }
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

  if (input.sessionId && !input.ownerTest) {
    const m = await membershipFor(db, viewer.id);
    const level = journeyAccessFor(m?.membership, { enhancedPackages: cfg.enhancedPackages, entitledStatuses: cfg.entitledStatuses });
    if (!m || level === "none") return refuse(403, "Journey is a benefit of paid memberships.");
    const { data: js } = await db.from("journey_sessions").select("id, status, ends_at, objective, product_slug").eq("id", input.sessionId).eq("user_id", viewer.id).maybeSingle();
    if (!js || ["completed", "expired", "refunded"].includes(js.status)) return refuse(403, "This session has ended. Your private summary is on the Sessions page.");
    access = level;
  } else if (input.ownerTest) {
    const mfa = await getMfaStatus();
    if (!ownerTestAccess({ roles: viewer.roles, mfaVerified: mfa.verified, ownerTestingEnabled: cfg.ownerTestingEnabled }))
      return refuse(403, "Owner testing isn't authorized for this session.");
    periodStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  } else {
    const m = await membershipFor(db, viewer.id);
    const level = journeyAccessFor(m?.membership, { enhancedPackages: cfg.enhancedPackages, entitledStatuses: cfg.entitledStatuses });
    if (!m || level === "none") return refuse(403, "Journey is a benefit of paid memberships.");
    // Lessons, discovery and the portfolio belong to every paid plan: use an experience the plan includes.
    if ((input.lesson || input.discovery || input.portfolio || input.guide || input.page) && input.mode !== "concierge") {
      const em = effectiveMode(input.mode, level, m.membership);
      if (em) input = { ...input, mode: em };
    }
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
  // Owner tests may choose any approved model (it must have rates entered, so cost is tracked).
  if (input.ownerTest && input.model) cfg.settings = { ...cfg.settings, defaultModel: input.model };

  const { data: u } = await db.rpc("journey_holder_usage", { p_holder: holderId, p_period_start: periodStart.toISOString() });
  const usage = u as Record<string, number | string> | null;
  const view = tier?.monthlyMessages != null && usage
    ? allowanceView(tier.monthlyMessages, Number(usage.period_messages), Number(usage.purchased_remaining), periodEnd)
    : null;

  // Instructions: founder's philosophy and guardrails first, then the owner's published version.
  const [{ data: published }, { data: knowledge }, { data: examples }] = await Promise.all([
    input.ownerTest && input.instructionVersion
      ? db.from("journey_instruction_versions").select("version, body").eq("version", input.instructionVersion).maybeSingle()
      : db.from("journey_instruction_versions").select("version, body").eq("status", "published").maybeSingle(),
    db.from("journey_knowledge").select("title, body").eq("status", "approved").in("mode", ["all", input.mode]).order("updated_at", { ascending: false }).limit(20),
    db.from("journey_examples").select("member_message, ideal_reply").eq("status", "approved").eq("mode", input.mode).order("updated_at", { ascending: false }).limit(5),
  ]);
  let knowledgeText = "";
  for (const k of knowledge ?? []) {
    const block = `## ${k.title}\n${k.body}\n\n`;
    if (knowledgeText.length + block.length > 8000) break;
    knowledgeText += block;
  }
  const exampleText = (examples ?? []).map((e) => `Member: ${e.member_message.slice(0, 600)}\nJourney: ${e.ideal_reply.slice(0, 1200)}`).join("\n\n");
  let memoryText = "";
  if (cfg.memoryEnabled) {
    const [{ data: ms }, { data: mem }] = await Promise.all([
      db.from("journey_memory_settings").select("enabled, approach").eq("user_id", viewer.id).maybeSingle(),
      db.from("journey_memories").select("kind, content").eq("user_id", viewer.id).order("created_at", { ascending: false }).limit(30),
    ]);
    if (ms?.approach) memoryText += `The member prefers a ${ms.approach === "blend" ? "blended spiritual, secular and practical" : ms.approach} approach.\n`;
    if (ms?.enabled && mem?.length) memoryText += mem.map((x) => `- (${x.kind}) ${x.content}`).join("\n");
  }
  const ownerText = [
    published?.body ?? "",
    memoryText && `# What this member has asked Journey to remember (use naturally; never reveal it to anyone else)\n${memoryText}`,
    knowledgeText && `# Approved knowledge from The Art of Connect\n${knowledgeText}`,
    exampleText && `# Approved example conversations (match their spirit and quality, not their exact words)\n${exampleText}`,
  ].filter(Boolean).join("\n\n");
  let instructions = buildJourneyInstructions({ mode: input.mode, access, ownerInstructions: ownerText || null, disabledCapabilities: cfg.disabled });
  instructions += `\n\n${JOURNEY_EI_GUIDANCE}`;
  if (input.lesson) instructions += `\n\n${await teachingGuidance(db, input.lesson)}`;
  const { data: prefRow } = await db.from("journey_voice_preferences").select("presentation, voice, age_style, language, accent, personality, pace, avatar").eq("user_id", viewer.id).maybeSingle();
  if (prefRow) instructions += `\n\n${styleInstructions(cleanPrefs({ ...prefRow, age: prefRow.age_style }), false)}`;
  instructions += "\n\n# Professional support\nWhen qualified human support could genuinely help, you may gently offer the Counseling & Wellness Center (Counseling in the member menu), open to every member, as an option they are free to decline. Never present it as a diagnosis or a requirement. If anyone may be in danger, give emergency resources first (911 in the U.S.; call or text 988).";
  instructions += `\n\n# Response standards\n${RESPONSE_STANDARDS.map((x) => `- ${x}`).join("\n")}`;
  // Founder-approved training: only APPROVED entries, only the few most relevant to this message.
  const [{ data: trained }, { data: tcats }] = await Promise.all([
    db.from("journey_training_entries").select("category, topic, scenario, founder_principles, interpretation, approach, example_response, follow_ups, safety").eq("status", "approved").limit(600),
    db.from("journey_training_categories").select("key, title, founder_decisions"),
  ]);
  const picked = selectTraining((trained ?? []) as TrainingEntry[], input.message, { lesson: input.lesson ?? input.guide?.ref ?? null, mode: input.mode });
  const pickedCats = new Set(picked.map((e) => e.category));
  const training = formatTraining(picked, (tcats ?? []).filter((c) => pickedCats.has(c.key)).map((c) => ({ title: c.title, decisions: c.founder_decisions ?? [] })));
  if (training) instructions += `\n\n${training}`;

  if (input.portfolio) {
    const pin = await loadPortfolioInput(db, viewer.id);
    const statuses = categoryStatuses(pin);
    instructions += `\n\n${portfolioInstructions(portfolioContext(assemblePortfolio(pin), statuses, pin.summaries))}`;
    input = { ...input, conversationId: null, comparisonId: null, message: PORTFOLIO_REQUEST };
  }

  // Guided module: Journey knows the lesson, its objectives, what's answered and what's left (the member's own answers only).
  let draftOnly = false;
  if (input.guide) {
    const gm = await resolveGuide(db, input.guide.ref);
    if (!gm) return refuse(404, "That lesson wasn't found.");
    const answered = await loadGuideAnswers(db, viewer.id, gm);
    if (!input.lesson) instructions += `\n\n${await teachingGuidance(db, input.guide.ref)}`;
    instructions += `\n\n${guideInstructions(gm, answered, false, Boolean(input.guide.assist && !input.guide.draft))}`;
    if (input.guide.draft) {
      draftOnly = true;
      const transcript = input.guide.transcript?.trim() || null;
      input = { ...input, comparisonId: null, message: guideDraftRequest(gm, transcript ?? undefined), ...(transcript ? { conversationId: null } : {}) };
    }
  }

  const where = !input.guide && input.page ? pageContext(input.page) : null;
  if (where) instructions += `\n\n# Where the member is\nThe member opened Journey from ${where}. Help in that context. Speak only about features and information their membership includes, and never reveal anyone else's information.`;

  // Adaptive Discovery Session: only the member's own ACTIVE session, continuing its own conversation.
  let discovery: { id: string; category: string; conversation_id: string | null; exchanges: number; skipped: number } | null = null;
  if (input.discovery) {
    const { data: ds } = await db.from("journey_discovery_sessions").select("id, category, conversation_id, exchanges, skipped")
      .eq("id", input.discovery.sessionId).eq("user_id", viewer.id).eq("status", "active").maybeSingle();
    const dc = ds ? discoveryCategory(ds.category) : null;
    if (!ds || !dc) return refuse(404, "That discovery session has ended. You can begin a new one anytime.");
    discovery = ds;
    input = { ...input, conversationId: ds.conversation_id, comparisonId: null };
    const { data: tc } = await db.from("journey_training_categories").select("learning_objectives").eq("key", ds.category).maybeSingle();
    instructions += `\n\n${discoveryInstructions(dc, tc?.learning_objectives ?? [], FOUNDER_PRINCIPLES[ds.category] ?? [], Boolean(input.discovery?.summarize))}`;
  }
  if (input.mode === "life" || input.mode === "love") instructions += await loveLanguageContext(db, viewer.id);

  // Context: only this member's own conversation, trimmed to the owner's limits.
  let history: ChatTurn[] = [];
  if (input.conversationId) {
    const { data: conv } = await db.from("journey_conversations").select("id").eq("id", input.conversationId).eq("user_id", viewer.id).maybeSingle();
    if (!conv) return refuse(404, "That conversation wasn't found.");
    const { data: msgs } = await db.from("journey_messages").select("role, content").eq("conversation_id", conv.id).order("created_at", { ascending: true }).limit(200);
    history = trimHistory((msgs ?? []).map((r) => ({ role: r.role === "journey" ? "assistant" : "user", content: r.content }) as ChatTurn), cfg.settings.maxHistoryMessages, cfg.settings.maxHistoryChars);
  }
  const promptChars = instructions.length + history.reduce((n, h) => n + h.content.length, 0);

  if (input.sessionId && !input.ownerTest) {
    return runSession(db, cfg.settings, viewer.id, input, instructions, history);
  }
  const d = decide({
    settings: cfg.settings, tier, ownerTest: input.ownerTest, promptChars, messageChars: input.message.length, hasAttachment: input.hasAttachment,
    usage: {
      inFlight: Number(usage?.in_flight ?? 0), minuteRequests: Number(usage?.minute ?? 0), dayMessages: Number(usage?.day ?? 0),
      periodMessages: Number(usage?.period_messages ?? 0), periodCents: Number(usage?.period_cents ?? 0),
      purchasedRemaining: Number(usage?.purchased_remaining ?? 0), tierMonthCents: 0, companyMonthCents: 0,
    },
  });
  if (!d.allowed) {
    // Allowance used: if the member turned on Auto-Reload, try it (company safeguards apply; access arrives after payment).
    if (d.reason === "Allowance used" && !input.ownerTest) {
      const r = await maybeAutoReload(viewer.id, holderId);
      if (r === "started") return refuse(402, "Your Auto-Reload is being processed. Your new messages will be ready in a moment — nothing else is charged.", view);
    }
    return refuse(429, d.memberMessage, view);
  }

  const { data: reserved } = await db.rpc("journey_reserve", {
    p_user: viewer.id, p_holder: holderId, p_request_key: input.requestKey, p_package: packageSlug, p_mode: input.mode,
    p_model: d.model, p_reserve: d.reserveCents, p_period_start: periodStart.toISOString(), p_owner_test: Boolean(input.ownerTest),
  });
  if (typeof reserved !== "string" || reserved.startsWith("refused:")) {
    const why = String(reserved ?? "");
    return refuse(429, why === "refused:in_flight" ? "Journey is still replying to your last message." : why === "refused:duplicate" ? "That message was already sent." : "Journey is resting right now. Please try again a little later.", view);
  }
  const usageId = Number(reserved);

  const started = Date.now();
  const result = await createResponse({ model: d.model, instructions, history, message: input.message, maxOutputTokens: d.maxOutputTokens });
  const latencyMs = Date.now() - started;
  const rate = cfg.settings.models.find((m) => m.id === d.model)!;
  const actual = costCents(rate, result.inputTokens, result.outputTokens) ?? d.reserveCents;
  await db.rpc("journey_complete", { p_id: usageId, p_ok: result.ok, p_in: result.inputTokens, p_out: result.outputTokens, p_cost: actual });
  if (!result.ok) return refuse(502, "Journey couldn't reply just now. This message didn't count toward your allowance.", view);

  let testRunId: string | null = null;
  if (input.ownerTest) {
    const { data: run } = await db.from("journey_test_runs").insert({
      mode: input.mode, instruction_version: published?.version ?? null, prompt: input.message.slice(0, 4000), reply: result.text, created_by: viewer.id,
      model: d.model, latency_ms: latencyMs, input_tokens: result.inputTokens, output_tokens: result.outputTokens, cost_cents: actual, comparison_id: input.comparisonId ?? null,
    }).select("id").single();
    testRunId = run?.id ?? null;
  }

  let conversationId = input.conversationId ?? null;
  if (!conversationId && !input.comparisonId && !draftOnly) {
    const { data: c } = await db.from("journey_conversations").insert({ user_id: viewer.id, mode: input.mode, title: `${input.ownerTest ? "[Owner test] " : ""}${discovery ? `Discovery · ${discoveryCategory(discovery.category)?.title}` : input.message}`.slice(0, 80) }).select("id").single();
    conversationId = c?.id ?? null;
  }
  if (conversationId && !input.comparisonId && !draftOnly) {
    await db.from("journey_messages").insert([
      { conversation_id: conversationId, user_id: viewer.id, role: "member", content: input.message },
      { conversation_id: conversationId, user_id: viewer.id, role: "journey", content: result.text },
    ]);
  }
  if (input.portfolio) await db.from("discovery_analyses").insert({ user_id: viewer.id, scope: "portfolio", source: "journey", content: result.text.slice(0, 20000) });
  if (discovery) {
    const summarize = Boolean(input.discovery?.summarize);
    await db.from("journey_discovery_sessions").update({
      conversation_id: conversationId, exchanges: discovery.exchanges + 1, skipped: discovery.skipped + (input.discovery?.skip ? 1 : 0),
      ...(summarize ? { status: "completed", completed_at: new Date().toISOString() } : {}),
    }).eq("id", discovery.id);
    if (summarize) await db.from("discovery_analyses").insert({ user_id: viewer.id, scope: `category:${discovery.category}`, source: "journey", content: result.text.slice(0, 20000) });
  }
  if (input.ownerTest) return { ok: true, reply: result.text, conversationId, allowance: null, test: { id: testRunId, model: d.model, latencyMs, inputTokens: result.inputTokens, outputTokens: result.outputTokens, costCents: actual, instructionVersion: published?.version ?? null } };
  const after = view && !d.usesPurchased
    ? allowanceView(view.allowance, view.used + 1, view.purchasedRemaining, periodEnd)
    : view && { ...view, purchasedRemaining: Math.max(0, view.purchasedRemaining - 1) };
  return { ok: true, reply: result.text, conversationId, allowance: after };
}

/** What a Journey page needs to show: access level, the allowance meter and whether Journey is switched on. */
export async function getJourneyStatus(): Promise<{
  access: "none" | "standard" | "enhanced" | "staff";
  enabled: boolean;
  allowance: AllowanceView | null;
  packageSlug: string | null;
}> {
  const viewer = await getViewer();
  const none = { access: "none" as const, enabled: false, allowance: null, packageSlug: null };
  if (!viewer) return none;
  const db = createAdminClient();
  const cfg = db ? await loadSettings(db) : null;
  const enabled = Boolean(cfg?.settings.enabled && cfg.settings.paidUsageAuthorized);
  if (viewer.viewAs) {
    // Owner "View as": show exactly what this membership would see (a full, unused allowance).
    const pkg = PERSONAS[viewer.viewAs]?.packageSlug;
    if (!pkg || !db) return { ...none, enabled };
    const { data: t } = await db.from("journey_tier_limits").select("monthly_messages").eq("package_slug", pkg).maybeSingle();
    const access = (cfg?.enhancedPackages ?? DEFAULT_ENHANCED_PACKAGES).includes(pkg) ? "enhanced" : "standard";
    return { access, enabled, packageSlug: pkg, allowance: t?.monthly_messages != null ? allowanceView(t.monthly_messages, 0, 0, new Date(Date.now() + 30 * 86_400_000)) : null };
  }
  if (viewer.roles.length) return { access: "staff", enabled, allowance: null, packageSlug: null };
  if (!db || !cfg) return none;
  const m = await membershipFor(db, viewer.id);
  const access = journeyAccessFor(m?.membership, { enhancedPackages: cfg.enhancedPackages, entitledStatuses: cfg.entitledStatuses });
  if (!m || access === "none") return { ...none, enabled };
  const [{ data: t }, { data: u }] = await Promise.all([
    db.from("journey_tier_limits").select("monthly_messages").eq("package_slug", m.membership.packageSlug ?? "").maybeSingle(),
    db.rpc("journey_holder_usage", { p_holder: m.holderId, p_period_start: m.periodStart.toISOString() }),
  ]);
  const usage = u as Record<string, number | string> | null;
  const allowance = t?.monthly_messages != null && usage
    ? allowanceView(t.monthly_messages, Number(usage.period_messages), Number(usage.purchased_remaining), m.periodEnd)
    : null;
  return { access, enabled, allowance, packageSlug: m.membership.packageSlug };
}

/** A message inside a purchased Private Session. */
async function runSession(db: Db, settings: JourneySettings, userId: string, input: { sessionId?: string | null; message: string; requestKey: string; mode: JourneyMode }, instructions: string, history: ChatTurn[]): Promise<JourneyReply> {
  if (!settings.enabled || !settings.paidUsageAuthorized) return refuse(503, "Journey is resting right now. Your session time hasn't started.");
  if (input.message.length > settings.maxInputChars) return refuse(400, `Please keep your message under ${settings.maxInputChars} characters.`);
  const rate = settings.models.find((m) => m.id === settings.defaultModel && m.enabled);
  if (!rate) return refuse(503, "Journey is resting right now. Your session time hasn't started.");
  const { data: js } = await db.from("journey_sessions").select("objective, product_slug").eq("id", input.sessionId!).maybeSingle();
  const { data: prod } = await db.from("journey_session_products").select("name, minutes, objective").eq("slug", js?.product_slug ?? "").maybeSingle();
  const sessionInstructions = `${instructions}\n\n# This is a Journey Private Session: ${prod?.name ?? "Private Session"} (${prod?.minutes ?? ""} minutes)\nPurpose: ${prod?.objective ?? ""}\nThe member's objective: ${js?.objective ?? "to be explored together"}.\nStructure: clarify the objective, guide the conversation, invite reflection, agree practical next steps. This is AI-guided personal development, not therapy.`;
  const reserve = costCents(rate, Math.ceil((sessionInstructions.length + input.message.length) / 4) + 16, 900) ?? 0;
  const { data: reserved } = await db.rpc("journey_reserve_session", { p_user: userId, p_session: input.sessionId, p_request_key: input.requestKey, p_model: rate.id, p_reserve: reserve });
  if (typeof reserved !== "string" || reserved.startsWith("refused:")) {
    const why = String(reserved);
    return refuse(429, why === "refused:session_ended" ? "This session has reached its time limit. You can create your private summary now." : why === "refused:session_limit" ? "This session has reached its message limit. You can create your private summary now." : "Journey is resting right now.");
  }
  const result = await createResponse({ model: rate.id, instructions: sessionInstructions, history, message: input.message, maxOutputTokens: 900 });
  await db.rpc("journey_complete", { p_id: Number(reserved), p_ok: result.ok, p_in: result.inputTokens, p_out: result.outputTokens, p_cost: costCents(rate, result.inputTokens, result.outputTokens) ?? reserve });
  if (!result.ok) {
    // A failed reply gives the session message back.
    const { data: cur } = await db.from("journey_sessions").select("messages_used").eq("id", input.sessionId!).maybeSingle();
    if (cur && cur.messages_used > 0) await db.from("journey_sessions").update({ messages_used: cur.messages_used - 1 }).eq("id", input.sessionId!);
    return refuse(502, "Journey couldn't reply just now. Please try again.");
  }
  return { ok: true, reply: result.text, conversationId: null, allowance: null };
}

/** Love-language guidance for Life and Love conversations, plus the member's own profile when they allow Journey to use it. */
export async function loveLanguageContext(db: Db, userId: string) {
  let out = `\n\n${JOURNEY_LOVE_LANGUAGE_GUIDANCE}`;
  const { data: ll } = await db.from("love_language_profiles").select("receive_rank, express_rank, feel_connected, feel_unappreciated, use_in_journey").eq("user_id", userId).maybeSingle();
  if (ll?.use_in_journey && (ll.receive_rank?.length || ll.express_rank?.length)) {
    const names = (r: string[] | null) => (r ?? []).filter(isLanguage).map((k) => LOVE_LANGUAGES[k].name).join(", ");
    out += `\n\n# This member's Love Language Profile (their own words; preferences, not a label — never reveal to anyone else)\nReceives love most through: ${names(ll.receive_rank)}\nNaturally expresses love through: ${names(ll.express_rank)}`;
    if (ll.feel_connected) out += `\nFeels connected when: ${String(ll.feel_connected).slice(0, 600)}`;
    if (ll.feel_unappreciated) out += `\nFeels unappreciated when: ${String(ll.feel_unappreciated).slice(0, 600)}`;
  }
  return out;
}
