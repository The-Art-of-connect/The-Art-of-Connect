import { test } from "node:test";
import assert from "node:assert/strict";
import { MINUTES_SECTIONS, NOT_BINDING, minutesText, parseSection } from "../src/lib/meetings.ts";

test("directive 48: proposals are a separate section from decisions", () => {
  const keys = MINUTES_SECTIONS.map((s) => s.key);
  assert.ok(keys.includes("decisions") && keys.includes("proposals"));
  assert.match(MINUTES_SECTIONS.find((s) => s.key === "proposals")!.label, /not decisions/);
});

test("directive 48: action items keep who and when; invalid dates are dropped, never guessed", () => {
  const [a, b] = parseSection("actions", "- Send the term sheet | Marcus | 2026-12-15\nCall the bank | | next week");
  assert.deepEqual(a, { text: "Send the term sheet", owner: "Marcus", due: "2026-12-15" });
  assert.deepEqual(b, { text: "Call the bank", owner: null, due: null });
});

test("directive 48: the typed copy says minutes are not a binding agreement", () => {
  const t = minutesText("Quarterly planning", "2026-11-28T15:00:00Z", "Plan Q1", { decisions: [{ text: "Meet monthly" }], proposals: ["Split costs 50/50"] });
  assert.match(t, /DECISIONS REACHED\n- Meet monthly/);
  assert.match(t, /PROPOSED ARRANGEMENTS \(NOT DECISIONS\)\n- Split costs 50\/50/);
  assert.ok(t.endsWith(NOT_BINDING));
});
