import "server-only";
import { serverSecret } from "@/lib/env";
import { parseResponse, type OpenAIResult } from "@/lib/openai-parse";
export type { OpenAIResult };

/**
 * The only connection to Journey's AI provider: OpenAI's Responses API.
 * Founder directive: Journey uses approved OpenAI models exclusively, with no
 * other provider and no fallback provider.
 *
 * This module never decides whether a request is allowed. Callers must run
 * the membership, switch and spending checks (journey-server.ts) first.
 * The key is read on the server only and never sent to the browser.
 */

export const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export const isOpenAIConfigured = () => Boolean(serverSecret("OPENAI_API_KEY"));

export async function createResponse(input: {
  model: string;
  instructions: string;
  history: ChatTurn[];
  message: string;
  maxOutputTokens: number;
  timeoutMs?: number;
}): Promise<OpenAIResult> {
  const key = serverSecret("OPENAI_API_KEY");
  if (!key) return { ok: false, error: "OPENAI_API_KEY is not set", inputTokens: 0, outputTokens: 0 };
  try {
    const res = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: input.model,
        instructions: input.instructions,
        input: [...input.history, { role: "user", content: input.message }],
        max_output_tokens: input.maxOutputTokens,
        // Member conversations are kept in our own private tables, not stored at OpenAI.
        store: false,
      }),
      signal: AbortSignal.timeout(input.timeoutMs ?? 60_000),
      cache: "no-store",
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const detail = (json as { error?: { message?: string } } | null)?.error?.message ?? "";
      return { ok: false, error: `OpenAI HTTP ${res.status}${detail ? `: ${detail}` : ""}`, inputTokens: 0, outputTokens: 0 };
    }
    return parseResponse(json);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error", inputTokens: 0, outputTokens: 0 };
  }
}
