/**
 * Phased onboarding — the centralized question registry and the pure logic
 * that runs it. Used by the member onboarding screens (to decide what to ask
 * next and save progress) and by the Owner Portal (to validate edits before
 * they are published).
 *
 * Design rules from the founder's brief:
 *   • Short, independent stages with a clear purpose, estimated time and
 *     progress, that can be saved and resumed at any point.
 *   • Every question has a permanent unique id and a version. Editing the
 *     wording bumps the version; old answers stay linked to the version shown.
 *   • Each question "measures" exactly one piece of information. The registry
 *     rejects two questions that measure the same thing, so the same question
 *     is never asked twice in different words.
 *   • An answer already given (in an earlier stage, at registration or in a
 *     previous questionnaire) is reused, not asked again.
 *   • Optional questions are marked; the owner can make a question required or
 *     optional without a code change.
 *   • Income, net worth and similar financial disclosures are never asked.
 */

export type StageId = "welcome" | "understanding" | "readiness" | "compatibility";
export type Track = "single" | "couple" | "general";

export type AnswerValue = string | number | boolean | string[] | { min: number; max: number } | null;
export type Answers = Record<string, AnswerValue>;

export type QuestionKind = "text" | "long_text" | "date" | "single_choice" | "multi_choice" | "range" | "location";

export type Condition =
  | { question: string; equals: string | boolean }
  | { question: string; includes: string }
  | { track: Track };

export type Question = {
  /** Permanent identifier. Never reused for a different question. */
  id: string;
  version: number;
  stage: StageId;
  /** The single piece of information this question captures. Must be unique across the registry. */
  measures: string;
  prompt: string;
  kind: QuestionKind;
  options?: string[];
  /** Allow a written reflection alongside a selection. */
  reflection?: boolean;
  required: boolean;
  /** Private: shown to the member and to nobody else, including other members. */
  private?: boolean;
  /** Ask only when every condition holds. */
  when?: Condition[];
  /** Earlier sources whose answer satisfies this question (e.g. legacy questionnaire ids). */
  reuseFrom?: string[];
};

export type Stage = { id: StageId; order: number; title: string; purpose: string; minutes: [number, number] };

export const STAGES: readonly Stage[] = [
  { id: "welcome", order: 1, title: "Welcome & Authenticity", purpose: "The essentials we need to keep every member real, verified and safe.", minutes: [2, 3] },
  { id: "understanding", order: 2, title: "Understanding You", purpose: "Who you are today, what you value and the life you are building.", minutes: [3, 5] },
  { id: "readiness", order: 3, title: "Emotional & Relationship Readiness", purpose: "How you communicate, repair and care for yourself and others. A reflection, not a test.", minutes: [5, 7] },
  { id: "compatibility", order: 4, title: "Compatibility", purpose: "Only what we still need to introduce you to people who fit your life.", minutes: [4, 5] },
];

/** Information the platform must never require. The registry rejects any question that measures one of these. */
export const FORBIDDEN_MEASURES: readonly string[] = ["income", "net_worth", "assets", "credit_score", "bank_details"];

const RELATIONSHIP_STATUS = ["Single", "Separated", "Divorced", "Widowed", "In a relationship", "Married"];

export const DEFAULT_REGISTRY: readonly Question[] = [
  // ── Phase One — Welcome & Authenticity ─────────────────────────────
  { id: "q.legal_name", version: 1, stage: "welcome", measures: "legal_name", prompt: "Your legal name", kind: "text", required: true, private: true },
  { id: "q.date_of_birth", version: 1, stage: "welcome", measures: "date_of_birth", prompt: "Your date of birth", kind: "date", required: true, private: true, reuseFrom: ["registration.date_of_birth"] },
  { id: "q.location", version: 1, stage: "welcome", measures: "current_location", prompt: "Your current city and state", kind: "location", required: true },
  { id: "q.relationship_status", version: 1, stage: "welcome", measures: "relationship_status", prompt: "Your current relationship status", kind: "single_choice", options: RELATIONSHIP_STATUS, required: true, reuseFrom: ["membership.relationship_status"] },
  { id: "q.dating_preferences", version: 1, stage: "welcome", measures: "dating_preferences", prompt: "Who would you like to meet?", kind: "multi_choice", options: ["Men", "Women", "Open to all"], required: true, when: [{ track: "single" }] },
  { id: "q.relationship_intentions", version: 1, stage: "welcome", measures: "relationship_intentions", prompt: "What are you hoping to find?", kind: "single_choice", options: ["A committed relationship", "Marriage", "Companionship", "Taking it slowly and seeing what feels right"], required: true, when: [{ track: "single" }] },

  // ── Phase Two — Understanding You ──────────────────────────────────
  { id: "q.three_qualities", version: 1, stage: "understanding", measures: "self_description", prompt: "What three qualities best describe who you are today?", kind: "multi_choice", options: ["Compassionate", "Driven", "Loyal", "Curious", "Calm", "Funny", "Faithful", "Adventurous", "Thoughtful", "Generous", "Independent", "Creative"], reflection: true, required: true },
  { id: "q.core_values", version: 1, stage: "understanding", measures: "core_values", prompt: "What values are most important to you?", kind: "multi_choice", options: ["Honesty", "Family", "Faith", "Growth", "Respect", "Loyalty", "Freedom", "Service", "Stability", "Kindness"], reflection: true, required: true },
  { id: "q.ideal_lifestyle", version: 1, stage: "understanding", measures: "ideal_lifestyle", prompt: "What does your ideal lifestyle look like?", kind: "single_choice", options: ["Quiet and home-centered", "Social and active", "Career-focused with balance", "Travel and new experiences", "A mix of all of these"], reflection: true, required: true },
  { id: "q.proud_of_becoming", version: 1, stage: "understanding", measures: "proud_of_becoming", prompt: "What are you most proud of becoming?", kind: "long_text", required: false },
  { id: "q.working_on", version: 1, stage: "understanding", measures: "current_growth_focus", prompt: "What are you currently working on within yourself?", kind: "single_choice", options: ["Patience", "Communication", "Trust", "Confidence", "Balance", "Letting go of the past", "Something else"], reflection: true, required: false, private: true },

  // ── Phase Three — Emotional & Relationship Readiness (private) ─────
  { id: "q.disagreement", version: 1, stage: "readiness", measures: "conflict_response", prompt: "When someone disagrees with you, how do you typically respond?", kind: "single_choice", options: ["I listen and try to understand their view", "I explain my view and look for middle ground", "I need some time before I can talk it through", "I tend to avoid the conversation", "I often feel I need to win the point"], reflection: true, required: true, private: true },
  { id: "q.repair", version: 1, stage: "readiness", measures: "accountability_repair", prompt: "When you recognize that you've hurt someone, what do you do next?", kind: "single_choice", options: ["Apologize and ask how I can make it right", "Apologize once things have cooled down", "Show it through actions rather than words", "Wait for them to bring it up", "Explain why I did it"], reflection: true, required: true, private: true },
  { id: "q.partner_space", version: 1, stage: "readiness", measures: "boundaries_space", prompt: "Your partner wants to spend an evening alone. How would you most naturally respond?", kind: "single_choice", options: ["Respect their need for space and enjoy my own time", "Ask whether something is wrong before giving them space", "Feel rejected, but try to understand their perspective", "Expect them to change their plans and spend time with me", "It depends on the circumstances"], reflection: true, required: true, private: true },
  { id: "q.past_lessons", version: 1, stage: "readiness", measures: "past_relationship_lessons", prompt: "What did your previous relationships teach you about yourself?", kind: "long_text", required: false, private: true },
  { id: "q.unmet_needs", version: 1, stage: "readiness", measures: "needs_communication", prompt: "How do you communicate when your emotional needs aren't being met?", kind: "single_choice", options: ["I say so calmly and specifically", "I hint and hope they notice", "I pull back until I feel better", "I get frustrated before I say anything", "I'm still learning how"], reflection: true, required: true, private: true },
  { id: "q.jealousy", version: 1, stage: "readiness", measures: "emotional_regulation_jealousy", prompt: "How do you handle feelings of jealousy or insecurity?", kind: "single_choice", options: ["I notice the feeling and talk about it openly", "I reassure myself and let it pass", "I look for proof one way or the other", "I keep it to myself", "I'm still learning how"], reflection: true, required: true, private: true },
  { id: "q.healthy_partnership", version: 1, stage: "readiness", measures: "partnership_expectations", prompt: "What does a healthy partnership look like to you?", kind: "multi_choice", options: ["Trust", "Open communication", "Shared faith or values", "Independence within togetherness", "Teamwork", "Affection", "Shared goals"], reflection: true, required: true, private: true },

  // ── Phase Four — Compatibility (singles) ───────────────────────────
  { id: "q.age_range", version: 1, stage: "compatibility", measures: "preferred_age_range", prompt: "Preferred age range of a partner", kind: "range", required: true, when: [{ track: "single" }] },
  { id: "q.distance", version: 1, stage: "compatibility", measures: "geographic_preference", prompt: "How far are you willing to connect?", kind: "single_choice", options: ["My city", "Within 50 miles", "My state", "Anywhere, including long distance"], required: true, when: [{ track: "single" }] },
  { id: "q.marriage", version: 1, stage: "compatibility", measures: "long_term_intentions", prompt: "How do you feel about marriage and long-term commitment?", kind: "single_choice", options: ["I want to marry", "Open to marriage", "Committed partnership without marriage", "Not sure yet"], required: true, when: [{ track: "single" }] },
  { id: "q.children", version: 1, stage: "compatibility", measures: "children_family", prompt: "Children and family", kind: "single_choice", options: ["I have children", "I want children", "I don't want children", "Open to a partner with children", "Prefer not to say"], required: true, when: [{ track: "single" }] },
  { id: "q.lifestyle_travel", version: 1, stage: "compatibility", measures: "lifestyle_travel", prompt: "Lifestyle and travel", kind: "multi_choice", options: ["Homebody", "Weekend getaways", "International travel", "Outdoors", "Dining and culture", "Fitness"], required: false, when: [{ track: "single" }] },
  { id: "q.spiritual", version: 1, stage: "compatibility", measures: "spiritual_beliefs", prompt: "Spiritual beliefs (optional)", kind: "text", required: false, private: true, when: [{ track: "single" }] },
  { id: "q.financial_values", version: 1, stage: "compatibility", measures: "financial_values", prompt: "Financial values in a partnership", kind: "single_choice", options: ["Plan and save together", "Keep finances mostly separate", "Shared and separate accounts", "Talk it through as we go"], required: false, when: [{ track: "single" }] },
  { id: "q.affection", version: 1, stage: "compatibility", measures: "affection_communication", prompt: "How do you most like to give and receive affection?", kind: "multi_choice", options: ["Words", "Quality time", "Touch", "Thoughtful gestures", "Acts of service"], required: true, when: [{ track: "single" }] },
  { id: "q.dealbreakers", version: 1, stage: "compatibility", measures: "boundaries_dealbreakers", prompt: "Personal boundaries and dealbreakers", kind: "multi_choice", options: ["Smoking", "Heavy drinking", "Dishonesty", "Different faith", "Not wanting children", "Wanting children", "Long distance"], reflection: true, required: false, private: true, when: [{ track: "single" }] },
];

// ─── Registry validation (run before the owner publishes an edit) ───
export function validateRegistry(registry: readonly Question[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const measures = new Map<string, string>();
  for (const q of registry) {
    if (ids.has(q.id)) errors.push(`Duplicate question id: ${q.id}`);
    ids.add(q.id);
    const seen = measures.get(q.measures);
    if (seen) errors.push(`${q.id} asks for the same information as ${seen} (${q.measures})`);
    else measures.set(q.measures, q.id);
    if (FORBIDDEN_MEASURES.includes(q.measures)) errors.push(`${q.id} asks for ${q.measures}, which members are never required to disclose`);
    if ((q.kind === "single_choice" || q.kind === "multi_choice") && !q.options?.length) errors.push(`${q.id} needs answer options`);
    if (!STAGES.some((s) => s.id === q.stage)) errors.push(`${q.id} is in an unknown stage`);
    if (!Number.isInteger(q.version) || q.version < 1) errors.push(`${q.id} has an invalid version`);
  }
  for (const q of registry) for (const c of q.when ?? []) {
    if ("question" in c && !ids.has(c.question)) errors.push(`${q.id} depends on unknown question ${c.question}`);
  }
  return errors;
}

/** Apply the owner's required/optional choices without a code change. */
export function withOwnerSettings(registry: readonly Question[], required: Record<string, boolean>): Question[] {
  return registry.map((q) => (q.id in required ? { ...q, required: Boolean(required[q.id]) } : q));
}

// ─── Running the questionnaire ──────────────────────────────────────
export type Context = { track: Track; answers: Answers; /** Answers carried over from registration or legacy questionnaires, keyed by source id. */ prior?: Answers };

function meets(c: Condition, ctx: Context): boolean {
  if ("track" in c) return ctx.track === c.track;
  const v = ctx.answers[c.question];
  if ("equals" in c) return v === c.equals;
  return Array.isArray(v) && v.includes(c.includes);
}

export function isAnswered(v: AnswerValue | undefined): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

/** Fill in answers the member has already given elsewhere, so they are never asked twice. */
export function reuseAnswers(registry: readonly Question[], ctx: Context): Answers {
  const out: Answers = { ...ctx.answers };
  for (const q of registry) {
    if (isAnswered(out[q.id])) continue;
    for (const src of q.reuseFrom ?? []) {
      const v = ctx.prior?.[src];
      if (isAnswered(v)) { out[q.id] = v!; break; }
    }
  }
  return out;
}

export function applicableQuestions(registry: readonly Question[], stage: StageId, ctx: Context): Question[] {
  return registry.filter((q) => q.stage === stage && (q.when ?? []).every((c) => meets(c, ctx)));
}

/** Questions still to ask in a stage — skips anything answered or reusable. */
export function remainingQuestions(registry: readonly Question[], stage: StageId, ctx: Context): Question[] {
  const answers = reuseAnswers(registry, ctx);
  return applicableQuestions(registry, stage, ctx).filter((q) => !isAnswered(answers[q.id]));
}

export type StageProgress = { stage: Stage; answered: number; total: number; requiredLeft: number; complete: boolean; percent: number };

export function stageProgress(registry: readonly Question[], stageId: StageId, ctx: Context): StageProgress {
  const stage = STAGES.find((s) => s.id === stageId)!;
  const answers = reuseAnswers(registry, ctx);
  const qs = applicableQuestions(registry, stageId, ctx);
  const answered = qs.filter((q) => isAnswered(answers[q.id])).length;
  const requiredLeft = qs.filter((q) => q.required && !isAnswered(answers[q.id])).length;
  return { stage, answered, total: qs.length, requiredLeft, complete: requiredLeft === 0, percent: qs.length ? Math.round((answered / qs.length) * 100) : 100 };
}

/** Where a returning member resumes: the first stage with required questions left, or null when finished. */
export function resumePoint(registry: readonly Question[], ctx: Context): { stage: StageId; question: string | null } | null {
  for (const s of STAGES) {
    if (s.id === "compatibility" && ctx.track !== "single") continue;
    const p = stageProgress(registry, s.id, ctx);
    if (!p.complete) {
      const next = remainingQuestions(registry, s.id, ctx).find((q) => q.required) ?? null;
      return { stage: s.id, question: next?.id ?? null };
    }
  }
  return null;
}

/** Strip private answers before anything is shown to another member or used in a match card. */
export function shareableAnswers(registry: readonly Question[], answers: Answers): Answers {
  const priv = new Set(registry.filter((q) => q.private).map((q) => q.id));
  return Object.fromEntries(Object.entries(answers).filter(([id]) => !priv.has(id)));
}

// ─── Eligibility ────────────────────────────────────────────────────
export const MIN_AGE_SINGLES = 30;
export const MIN_AGE_MEMBERS = 21;

export function ageOn(dateOfBirth: string, today: Date): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dob = new Date(Date.UTC(y, mo - 1, d));
  if (dob.getUTCFullYear() !== y || dob.getUTCMonth() !== mo - 1 || dob.getUTCDate() !== d) return null;
  let age = today.getUTCFullYear() - y;
  const beforeBirthday = today.getUTCMonth() + 1 < mo || (today.getUTCMonth() + 1 === mo && today.getUTCDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}

export function ageEligibility(dateOfBirth: string, track: Track, today: Date = new Date()): { eligible: boolean; reason?: string } {
  const age = ageOn(dateOfBirth, today);
  if (age === null) return { eligible: false, reason: "Please enter a valid date of birth." };
  const min = track === "single" ? MIN_AGE_SINGLES : MIN_AGE_MEMBERS;
  if (age < min) return { eligible: false, reason: track === "single" ? `The Personal Society singles experience is for members ${MIN_AGE_SINGLES} and older.` : `Membership is for adults ${MIN_AGE_MEMBERS} and older.` };
  return { eligible: true };
}

// ─── Matchmaking activation ─────────────────────────────────────────
export type ActivationInput = {
  track: Track;
  dateOfBirth: string | null;
  emailConfirmed: boolean;
  identityVerified: boolean;
  /** Identity provider confirmed the age on the ID, not just the typed date of birth. */
  idAgeConfirmed: boolean;
  photoVerified: boolean;
  agreementsAccepted: boolean;
  openSafetyRestriction: boolean;
  welcomeStageComplete: boolean;
};

/**
 * Whether a single may be shown in matchmaking. Payment and membership level
 * are deliberately not inputs: they can never override a safety requirement.
 * Readiness assessment results are not inputs either — they are educational
 * and never decide who may date.
 */
export function matchmakingBlockers(i: ActivationInput, today: Date = new Date()): string[] {
  const out: string[] = [];
  if (i.track !== "single") out.push("Matchmaking is for members on the singles path.");
  if (!i.emailConfirmed) out.push("Confirm your email address.");
  if (!i.agreementsAccepted) out.push("Accept the membership agreements and community standards.");
  if (!i.welcomeStageComplete) out.push("Complete Welcome & Authenticity.");
  if (!i.dateOfBirth || !ageEligibility(i.dateOfBirth, "single", today).eligible) out.push(`Singles must be ${MIN_AGE_SINGLES} or older.`);
  if (!i.identityVerified || !i.idAgeConfirmed) out.push("Verify your identity and age.");
  if (!i.photoVerified) out.push("Verify a current photo.");
  if (i.openSafetyRestriction) out.push("Your account is under safety review.");
  return out;
}
