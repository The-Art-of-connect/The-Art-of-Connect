import { test } from "node:test";
import assert from "node:assert/strict";
import { CATEGORIES, FEATURES, included, whatsNew } from "../src/lib/features.ts";
import { levelOf } from "../src/lib/membership-level.ts";

test("membership levels follow the founder's progression", () => {
  assert.equal(levelOf({ packageSlug: null, status: null, experiences: ["counseling"], eliteBadge: false }), "free");
  assert.equal(levelOf({ packageSlug: "personal-society", status: "trialing", experiences: ["counseling", "relationships"], eliteBadge: false }), "one");
  assert.equal(levelOf({ packageSlug: "dual-society", status: "active", experiences: ["business", "counseling", "relationships"], eliteBadge: false }), "complete");
  assert.equal(levelOf({ packageSlug: "executive-private", status: "active", experiences: ["business", "counseling", "relationships"], eliteBadge: false }), "executive");
  assert.equal(levelOf({ packageSlug: "executive-private", status: "past_due", experiences: [], eliteBadge: false }), "free");
  assert.equal(levelOf({ packageSlug: "executive-private", status: "active", experiences: [], eliteBadge: true }), "elite");
});

test("every feature is in a known category and nothing unfinished links anywhere", () => {
  for (const f of FEATURES) {
    assert.ok((CATEGORIES as readonly string[]).includes(f.category), f.key);
    if (f.status !== "available") assert.equal(f.href, null, `${f.key} is not available yet and must not link to a page`);
  }
  assert.equal(new Set(FEATURES.map((f) => f.key)).size, FEATURES.length);
  assert.ok(whatsNew().every((f) => f.status === "available"));
});

test("inclusion follows membership: free, society, Executive and Elite", () => {
  const by = (k: string) => FEATURES.find((f) => f.key === k)!;
  const free = { level: "free" as const, experiences: ["counseling"], elite: false };
  const business = { level: "one" as const, experiences: ["counseling", "business"], elite: false };
  const exec = { level: "executive" as const, experiences: ["business", "counseling", "relationships"], elite: false };
  assert.ok(included(by("daily-sanctuary"), free));
  assert.ok(!included(by("journey"), free));
  assert.ok(included(by("business-board"), business));
  assert.ok(!included(by("singles"), business));
  assert.ok(included(by("private-meetings"), exec));
  assert.ok(!included(by("elite-dashboard"), exec));
  assert.ok(included(by("daily-sanctuary"), null));
  assert.ok(!included(by("journey"), null));
});
