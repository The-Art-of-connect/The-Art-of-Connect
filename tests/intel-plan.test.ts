import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePlan } from "../src/lib/intel-plan.ts";

test("a valid plan is parsed and limited by depth", () => {
  const reply = JSON.stringify({ summary: "Find franchise programs.", clarifying_questions: ["Which state?"], discovery_queries: ["a", "b", "c"], investigation: "What are the requirements?", fields: [{ name: "Fee Requirements!", description: "Published franchise fees" }, { name: "x", description: "" }] });
  const p = parsePlan(`Here you go: ${reply}`, "standard", "fallback objective");
  assert.equal(p.discovery.length, 2);
  assert.deepEqual(p.fields.map((f) => f.name), ["fee_requirements"]);
  assert.deepEqual(p.clarifying, ["Which state?"]);
});

test("an unusable reply falls back to the member's objective rather than inventing a plan", () => {
  const p = parsePlan("sorry", "deep", "Official requirements for opening a franchise in Georgia");
  assert.equal(p.discovery[0], "Official requirements for opening a franchise in Georgia");
  assert.equal(p.investigation, "Official requirements for opening a franchise in Georgia");
  assert.equal(p.fields[0].name, "key_findings");
});
