import { test } from "node:test";
import assert from "node:assert/strict";
import { addRealtimeUsage, EMPTY_USAGE, isLiveModel, providerCostCents } from "../src/lib/journey-voice-models.ts";

test("GPT-Live is priced per second at $0.05 per minute", () => {
  assert.equal(providerCostCents("gpt-live-1.1", { seconds: 90 }), 7.5);
  assert.equal(providerCostCents("gpt-live-1", { seconds: 0 }), 0);
  assert.ok(isLiveModel("gpt-live-1.1") && !isLiveModel("gpt-realtime-2.1-mini"));
});

test("Realtime tokens are priced with cached input at the cached rate", () => {
  const u = addRealtimeUsage(EMPTY_USAGE, { input_token_details: { audio_tokens: 1_000_000, text_tokens: 0, cached_tokens_details: { audio_tokens: 500_000 } }, output_token_details: { audio_tokens: 0 } });
  // 500k audio at $10/M + 500k cached audio at $0.30/M = $5.15
  assert.equal(providerCostCents("gpt-realtime-2.1-mini", u), 515);
});

test("Unpublished prices return null instead of a guess", () => {
  assert.equal(providerCostCents("gpt-realtime-mini", { audioIn: 100 }), null);
  assert.equal(providerCostCents("unknown-model", { seconds: 10 }), null);
});
