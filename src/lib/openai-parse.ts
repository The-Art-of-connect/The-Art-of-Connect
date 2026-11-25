/** Pure parsing of OpenAI Responses API results (kept separate so it can be unit tested). */
export type OpenAIResult =
  | { ok: true; text: string; inputTokens: number; outputTokens: number }
  | { ok: false; error: string; inputTokens: number; outputTokens: number };

/** Pulls the reply text and token usage out of a Responses API result. */
export function parseResponse(json: unknown): OpenAIResult {
  const j = json as {
    output?: { type?: string; content?: { type?: string; text?: string }[] }[];
    usage?: { input_tokens?: number; output_tokens?: number };
    error?: { message?: string } | null;
    status?: string;
  };
  const inputTokens = j?.usage?.input_tokens ?? 0;
  const outputTokens = j?.usage?.output_tokens ?? 0;
  if (j?.error) return { ok: false, error: j.error.message ?? "OpenAI error", inputTokens, outputTokens };
  const text = (j?.output ?? [])
    .filter((o) => o.type === "message")
    .flatMap((o) => o.content ?? [])
    .filter((c) => c.type === "output_text" && typeof c.text === "string")
    .map((c) => c.text)
    .join("")
    .trim();
  if (!text) return { ok: false, error: `No reply text (status ${j?.status ?? "unknown"})`, inputTokens, outputTokens };
  return { ok: true, text, inputTokens, outputTokens };
}
