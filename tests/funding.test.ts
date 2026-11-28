import { test } from "node:test";
import assert from "node:assert/strict";
import { monthlyPayment, parseLines, summarize } from "../src/lib/funding.ts";

test("amortized payment matches the standard formula", () => {
  assert.equal(Math.round(monthlyPayment(100000, 6, 120) * 100) / 100, 1110.21);
  assert.equal(monthlyPayment(12000, 0, 12), 1000);
  assert.equal(monthlyPayment(0, 6, 12), 0);
});

test("sources and uses parse safely and summarize the gap and estimated payments", () => {
  const uses = parseLines("Equipment | $80,000\nWorking capital | 20000\nbad line\nNegative | -5");
  const sources = parseLines("Owner capital | 30000\nFictional bank term loan | 60,000 | 9 | 84");
  assert.equal(uses.length, 2);
  const s = summarize(uses, sources);
  assert.equal(s.totalUses, 100000);
  assert.equal(s.gap, 10000);
  assert.ok(s.monthly > 960 && s.monthly < 970);
  assert.ok(s.interest > 0);
});
