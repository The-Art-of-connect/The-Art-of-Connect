import { test } from "node:test";
import assert from "node:assert/strict";
import { moduleBySlug } from "../src/lib/who-am-i.ts";
import { analysisKey, composeReflection, excerpt, journeyDiscoveryPrompt, parseJourneyDiscovery } from "../src/lib/personal-discovery.ts";

const titles = moduleBySlug("beyond-my-titles")!;

test("no answers means no reflection", () => {
  assert.equal(composeReflection(titles, {}), null);
});

test("reflection is built from the member's own words, not a fixed text", () => {
  const a = composeReflection(titles, { beyond_titles: { answer: "Someone who loves caring for my family and friends.", choices: null } })!;
  const b = composeReflection(titles, { beyond_titles: { answer: "A quiet painter who loves nature.", choices: null } })!;
  assert.match(a.discovered[0], /caring for my family/);
  assert.notDeepEqual(a, b);
  assert.match(a.growth.join(" "), /independently of your relationships/);
  assert.match(b.growth.join(" "), /Quiet and space/);
  for (const r of [a, b]) for (const k of ["discovered", "qualities", "growth", "forward"] as const) assert.ok(r[k].length > 0);
});

test("values from an earlier chapter inform qualities", () => {
  const r = composeReflection(titles, { true_self: { answer: "On the beach", choices: null }, core_values: { answer: null, choices: ["Kindness", "Faith"] } })!;
  assert.match(r.qualities[0], /natural kindness and a life anchored in faith/);
});

test("never uses clinical or labelling language", () => {
  const r = composeReflection(titles, { beyond_titles: { answer: "anxious and worried, always helping others", choices: null } })!;
  assert.doesNotMatch(JSON.stringify(r), /diagnos|disorder|you are an? (introvert|extrovert|empath)/i);
});

test("excerpt keeps words whole", () => {
  const e = excerpt("word ".repeat(80));
  assert.ok(e.length <= 182 && e.endsWith("…"));
});

test("Journey prompt fits the input limit and only includes this chapter", () => {
  const long = "x".repeat(4000);
  const p = journeyDiscoveryPrompt(titles, { beyond_titles: { answer: long, choices: null }, true_self: { answer: long, choices: null }, others_see: { answer: long, choices: null }, legacy: { answer: "secret", choices: null } }, 2000);
  assert.ok(p.length <= 2000);
  assert.doesNotMatch(p, /secret/);
  assert.match(p, /Do not diagnose/);
});

test("Journey reply is split into the four sections", () => {
  const r = parseJourneyDiscovery("## What You Discovered About Yourself\nA\n**Your Personal Strengths**\nB\n### Areas for Personal Development\nC\nMoving Forward\nD");
  assert.deepEqual(r, { discovered: ["A"], qualities: ["B"], growth: ["C"], forward: ["D"] });
  assert.equal(parseJourneyDiscovery("just text"), null);
  assert.match(analysisKey("interests-and-aspirations"), /^[a-z0-9_]{2,60}$/);
});
