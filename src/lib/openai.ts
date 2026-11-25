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

export type OpenAICheck = { configured: boolean; reachable: boolean; status: number | null; models: string[]; error?: string; checkedAt: string };

/** Verifies the key and lists the chat models it can use. Listing models is free — no tokens are used. */
export async function checkOpenAIConnection(): Promise<OpenAICheck> {
  const checkedAt = new Date().toISOString();
  const key = serverSecret("OPENAI_API_KEY");
  if (!key) return { configured: false, reachable: false, status: null, models: [], checkedAt };
  try {
    const res = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15_000), cache: "no-store" });
    const json = (await res.json().catch(() => null)) as { data?: { id: string }[]; error?: { message?: string } } | null;
    if (!res.ok) return { configured: true, reachable: false, status: res.status, models: [], error: res.status === 401 ? "OpenAI did not accept the key." : json?.error?.message?.slice(0, 200), checkedAt };
    const models = (json?.data ?? []).map((m) => m.id).filter((id) => /^(gpt-|o\d|chatgpt-)/.test(id) && !/(audio|realtime|transcribe|tts|search|image|instruct)/.test(id)).sort();
    return { configured: true, reachable: true, status: res.status, models, checkedAt };
  } catch (e) {
    return { configured: true, reachable: false, status: null, models: [], error: e instanceof Error ? e.message.slice(0, 200) : "Network error", checkedAt };
  }
}
