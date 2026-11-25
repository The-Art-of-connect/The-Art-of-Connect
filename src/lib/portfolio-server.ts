import "server-only";
import type { PortfolioInput } from "@/lib/portfolio";

type Db = { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export const SKIP_PREFIX = "skip_";

/** Loads ONE member's own discovery data. Callers must pass that member's id (and, for the user client, RLS enforces it too). */
export async function loadPortfolioInput(db: Db, userId: string): Promise<PortfolioInput & { summaries: { category: string; content: string; created_at: string }[] }> {
  const [{ data: rows }, { data: love }, { data: bounds }, { data: analyses }, { data: sessions }] = await Promise.all([
    db.from("discovery_answers").select("question_key, answer, choices").eq("user_id", userId),
    db.from("love_language_profiles").select("receive_rank, express_rank, feel_connected").eq("user_id", userId).maybeSingle(),
    db.from("self_discovery").select("will_do, wont_do").eq("user_id", userId),
    db.from("discovery_analyses").select("scope, content, created_at").eq("user_id", userId).like("scope", "category:%").order("created_at", { ascending: false }),
    db.from("journey_discovery_sessions").select("category").eq("user_id", userId).eq("status", "active"),
  ]);
  const answers = Object.fromEntries(((rows ?? []) as { question_key: string; answer: string | null; choices: string[] | null }[]).map((r) => [r.question_key, r]));
  const latest: Record<string, { content: string; created_at: string }> = {};
  for (const a of (analyses ?? []) as { scope: string; content: string; created_at: string }[]) {
    const k = a.scope.slice("category:".length);
    if (!latest[k]) latest[k] = a;
  }
  return {
    answers,
    love: love ?? null,
    boundariesWritten: ((bounds ?? []) as { will_do: string | null; wont_do: string | null }[]).filter((r) => r.will_do || r.wont_do).length,
    journeySummaries: Object.fromEntries(Object.entries(latest).map(([k, v]) => [k, v.created_at])),
    activeSessions: ((sessions ?? []) as { category: string }[]).map((s) => s.category),
    skipped: Object.keys(answers).filter((k) => k.startsWith(SKIP_PREFIX) && answers[k]?.answer === "skipped").map((k) => k.slice(SKIP_PREFIX.length).replace(/_/g, "-")),
    summaries: Object.entries(latest).map(([category, v]) => ({ category, ...v })),
  };
}
