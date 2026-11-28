import { test } from "node:test";
import assert from "node:assert/strict";
import { daysUntil, deadlineLabel, matchOpportunities, mentions, parseChecklist, pipelineCounts, relatedFindings, type Opportunity } from "../src/lib/radar.ts";
import { route } from "../src/lib/concierge.ts";
import { MEMBER_PAGES, searchEntries } from "../src/lib/search-index.ts";
import { matchTerms } from "../src/lib/brand.ts";

const today = new Date(2026, 10, 28);
const o = (p: Partial<Opportunity>): Opportunity => ({ id: "x", title: "Fictional grant", organization: "Example Foundation", category: "grant", industries: [], region: null, summary: "A fictional opportunity.", requirements: null, deadline: null, ...p });

test("Opportunity Radar matches nothing without the member's consent (directive 32)", () => {
  assert.deepEqual(matchOpportunities([o({})], null, [], { today }), []);
  assert.deepEqual(matchOpportunities([o({})], { opted_in: false, categories: [], industries: [], keywords: null }, [], { today }), []);
});

test("matches follow the member's stated interests and industry, and never show a passed deadline", () => {
  const prefs = { opted_in: true, categories: ["casting"], industries: ["technology"], keywords: null };
  const items = [o({ id: "a", category: "casting" }), o({ id: "b", category: "grant" }), o({ id: "c", category: "casting", industries: ["healthcare"] }), o({ id: "d", category: "casting", deadline: "2026-11-01" })];
  assert.deepEqual(matchOpportunities(items, prefs, [], { today }).map((m) => m.item.id), ["a"]);
});

test("a funding project brings grant and funding opportunities into a member's matches", () => {
  const prefs = { opted_in: true, categories: ["board"], industries: [], keywords: null };
  assert.equal(matchOpportunities([o({ category: "grant" })], prefs, [], { today }).length, 0);
  assert.equal(matchOpportunities([o({ category: "grant" })], prefs, [], { today, fundingProjects: 1 }).length, 1);
});

test("watchlist names and keywords explain and rank matches", () => {
  const prefs = { opted_in: true, categories: [], industries: [], keywords: "film" };
  const m = matchOpportunities([o({ id: "a" }), o({ id: "b", organization: "Example Studio", summary: "Film casting call." })], prefs, [{ subject: "Example Studio", objective: "casting" }], { today });
  assert.equal(m[0].item.id, "b");
  assert.ok(m[0].reasons.some((r) => r.includes("Example Studio")));
});

test("watchlist findings match whole names only", () => {
  assert.ok(mentions("Example Studio announces auditions", "example studio"));
  assert.ok(!mentions("Examples Studios", "Example Studio"));
  const f = [{ title: "Example Studio opens a new stage", detail: null }, { title: "Unrelated", detail: "Nothing here" }];
  assert.equal(relatedFindings(f, { subject: "Example Studio", objective: "x" }).length, 1);
  assert.equal(relatedFindings(f, { subject: null, objective: "Example Studio" }).length, 0);
});

test("the documents checklist is text only, de-duplicated and keeps what was checked", () => {
  const c = parseChecklist("- Business plan\n• Budget\n\nbusiness plan\nHeadshot", [{ label: "Budget", done: true }]);
  assert.deepEqual(c, [{ label: "Business plan", done: false }, { label: "Budget", done: true }, { label: "Headshot", done: false }]);
});

test("deadline labels", () => {
  assert.equal(daysUntil("2026-11-30", today), 2);
  assert.equal(deadlineLabel("2026-11-28", today), "Due today");
  assert.equal(deadlineLabel("2026-11-01", today), "Deadline passed");
  assert.equal(deadlineLabel(null, today), null);
});

test("the Application Center pipeline counts each application once", () => {
  assert.deepEqual(pipelineCounts(["preparing", "submitted", "in_review", "accepted", "withdrawn"]).map((p) => p.count), [1, 2, 2]);
});

test("everyday language leads to the Opportunity Radar, the Application Center and My Global Watchlist", () => {
  assert.equal(route("show me casting opportunities", "executive")[0].id, "radar");
  assert.equal(route("where are my applications", "executive")[0].id, "applications");
  const w = route("add a company to my watchlist", "executive")[0];
  assert.equal(w.id, "watchlist");
  assert.equal(w.included, false);
  assert.equal(route("add a company to my watchlist", "elite")[0].included, true);
  assert.equal(searchEntries(MEMBER_PAGES, "opportunity radar")[0]?.title, "Opportunity Radar");
  assert.equal(searchEntries(MEMBER_PAGES, "application deadlines")[0]?.title, "Application Center");
  assert.equal(searchEntries(MEMBER_PAGES, "watchlist")[0]?.title, "My Global Watchlist");
  assert.ok(matchTerms("my applications").some((t) => t.name === "Application Center"));
});
