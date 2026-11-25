import { test } from "node:test";
import assert from "node:assert/strict";
import { assemblePortfolio, categoryStatuses, portfolioContext, portfolioInstructions, PORTFOLIO_SECTIONS, type PortfolioInput } from "../src/lib/portfolio.ts";
import { choiceKey } from "../src/lib/curricula/core.ts";
import { EMOTIONAL_INTELLIGENCE as EI } from "../src/lib/curricula/emotional-intelligence.ts";

const empty: PortfolioInput = { answers: {}, love: null, boundariesWritten: 0, journeySummaries: {}, activeSessions: [], skipped: [] };

test("an empty member gets an honest, empty portfolio (nothing invented)", () => {
  const s = assemblePortfolio(empty);
  assert.deepEqual(s.map((x) => x.title), PORTFOLIO_SECTIONS.map((x) => x.title));
  assert.ok(s.every((x) => x.lines.length === 0));
  assert.ok(Object.values(categoryStatuses(empty)).every((v) => v === "not_started"));
});

test("member words and reflections are labeled separately", () => {
  const p: PortfolioInput = {
    ...empty,
    answers: {
      beyond_titles: { answer: "A curious gardener and loyal friend.", choices: null },
      core_values: { answer: null, choices: ["Faith", "Kindness"] },
      [choiceKey(EI, "l2_silence")]: { answer: null, choices: ["rejection"] },
    },
    love: { receive_rank: ["time", "words"], express_rank: ["service"], feel_connected: "We talk without phones." },
  };
  const s = assemblePortfolio(p);
  const by = (k: string) => s.find((x) => x.key === k)!.lines;
  assert.ok(by("identity").some((l) => l.kind === "shared" && /curious gardener/.test(l.text)));
  assert.ok(by("emotional").some((l) => l.kind === "shared" && /quality time/i.test(l.text)));
  assert.ok(by("patterns").some((l) => l.kind === "reflection" && /rejection/.test(l.text)));
  assert.ok(by("manifestations").some((l) => /faith/.test(l.text)));
  const st = categoryStatuses(p);
  assert.equal(st["love-languages"], "completed");
  assert.equal(st["emotional-intelligence"], "in_progress");
  assert.equal(st.childhood, "not_started");
});

test("skipped and in-progress categories are distinguished", () => {
  const st = categoryStatuses({ ...empty, skipped: ["childhood"], activeSessions: ["dating"], journeySummaries: { marriage: "2026-11-01" } });
  assert.equal(st.childhood, "skipped");
  assert.equal(st.dating, "in_progress");
  assert.equal(st.marriage, "completed");
});

test("Journey is told never to invent, assume trauma or exceed the limit", () => {
  const ctx = portfolioContext(assemblePortfolio(empty), categoryStatuses(empty), [{ category: "dating", content: "x".repeat(5000) }], 3000);
  assert.ok(ctx.length <= 3000);
  const t = portfolioInstructions(ctx);
  for (const s of PORTFOLIO_SECTIONS) assert.ok(t.includes(s.title));
  assert.match(t, /Never invent information, assume trauma/);
  assert.match(t, /only if the member disclosed them/);
});
