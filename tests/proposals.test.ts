import { test } from "node:test";
import assert from "node:assert/strict";
import { completeness, normalizeSections, SECTIONS } from "../src/lib/proposals.ts";

test("unknown sections and invalid bases are dropped; empty sections are not kept", () => {
  const s = normalizeSections({ executive_summary: { text: " Summary ", basis: "fact" }, bogus: { text: "x", basis: "fact" }, risks: { text: "", basis: "estimate" }, timeline: { text: "Q1", basis: "guaranteed" } });
  assert.deepEqual(Object.keys(s).sort(), ["executive_summary", "timeline"]);
  assert.equal(s.executive_summary.text, "Summary");
  assert.equal(s.timeline.basis, SECTIONS.find((x) => x.key === "timeline")!.defaultBasis);
});

test("completeness is administrative and flags financial figures marked as facts", () => {
  const c = completeness(normalizeSections({ financial_requirements: { text: "$250,000", basis: "fact" }, ownership: { text: "60/40 to discuss", basis: "proposed" } }));
  assert.ok(c.missing.includes("Executive summary"));
  assert.ok(c.flags.some((f) => f.includes("marked as facts")));
  assert.ok(c.flags.some((f) => f.includes("attorney")));
  assert.equal(c.total, SECTIONS.filter((x) => x.core).length);
});
