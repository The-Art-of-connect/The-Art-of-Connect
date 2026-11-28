/**
 * Journey as Director of Intelligence (founder directive 26 §1): turns a member's objective into a research plan.
 * Pure helpers (unit-tested): the instructions Journey follows and a strict parser for its JSON reply.
 */
export const PLAN_REQUEST = "Please prepare the research plan for my objective, following your research-planning instructions exactly.";

export function planInstructions(depth: "standard" | "deep") {
  return `# Research planning (this request only)
You are Journey, Director of Intelligence for The Art of Connect. Prepare a plan our research partners will carry out:
an investigative partner (detailed, cited answers to specific questions) and a discovery partner (finding organizations, programs, opportunities and resources).

Rules:
- Research only legitimate, publicly available information. Never search for private contact details, home addresses, personal finances or other private information about individuals.
- Never use protected characteristics, wealth or personality to evaluate people for employment or opportunities; use only job-related, published requirements.
- Prefer official and authoritative sources (government, regulators, official organization websites).
- Do not include the member's name or any personal details in queries.
- If the objective is too vague to research well, ask up to three clarifying questions and still provide a best-effort plan.
- ${depth === "deep" ? "Up to 4 discovery queries and up to 6 investigation fields." : "Up to 2 discovery queries and up to 4 investigation fields."}

Reply with ONLY a JSON object, no commentary:
{"summary":"one sentence restating the objective","clarifying_questions":["..."],"discovery_queries":["short web search queries"],"investigation":"one clear research question for the investigative partner","fields":[{"name":"snake_case_name","description":"what to find, with official sources"}]}`;
}

export type Plan = { summary: string; clarifying: string[]; discovery: string[]; investigation: string; fields: { name: string; description: string }[] };

export function parsePlan(reply: string, depth: "standard" | "deep", fallbackObjective: string): Plan {
  const maxQ = depth === "deep" ? 4 : 2, maxF = depth === "deep" ? 6 : 4;
  const strs = (v: unknown, n: number, len: number) => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).slice(0, n).map((x) => String(x).trim().slice(0, len)) : []);
  let o: Record<string, unknown> = {};
  const a = reply.indexOf("{"), b = reply.lastIndexOf("}");
  if (a >= 0 && b > a) { try { o = JSON.parse(reply.slice(a, b + 1)); } catch { o = {}; } }
  const fields = (Array.isArray(o.fields) ? o.fields : []).slice(0, maxF).map((f) => {
    const x = (f ?? {}) as Record<string, unknown>;
    const name = String(x.name ?? "").toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
    return { name, description: String(x.description ?? "").trim().slice(0, 300) };
  }).filter((f) => f.name && f.description);
  const objective = fallbackObjective.trim().slice(0, 300);
  return {
    summary: typeof o.summary === "string" ? o.summary.trim().slice(0, 400) : objective,
    clarifying: strs(o.clarifying_questions, 3, 300),
    discovery: strs(o.discovery_queries, maxQ, 200).length ? strs(o.discovery_queries, maxQ, 200) : [objective.slice(0, 200)],
    investigation: typeof o.investigation === "string" && o.investigation.trim() ? o.investigation.trim().slice(0, 1000) : objective,
    fields: fields.length ? fields : [{ name: "key_findings", description: "The most important facts, requirements and official sources for this objective." }],
  };
}
