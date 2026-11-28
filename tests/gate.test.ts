import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, needForHref, packageFor, safeReturn, type GateFacts } from "../src/lib/gate.ts";

// Founder directive 36: one membership-aware decision for every restricted feature.
const base: GateFacts = { signedIn: true, level: "free", experiences: ["counseling"], society: null, live: { business: true, relationships: true }, preview: false };
const at = (o: Partial<GateFacts>) => ({ ...base, ...o });

test("a free member selecting In Love is offered The Personal Society", () => {
  assert.deepEqual(decide({ experience: "relationships" }, base), { kind: "membership", packageSlug: "personal-society" });
  assert.deepEqual(decide({ experience: "relationships" }, at({ society: "couples" })), { kind: "membership", packageSlug: "couples-membership" });
  assert.deepEqual(decide({ experience: "business" }, base), { kind: "membership", packageSlug: "professional-society" });
});

test("a one-society member selecting the other society is offered the bundle", () => {
  assert.deepEqual(decide({ experience: "business" }, at({ level: "one", experiences: ["counseling", "relationships"] })), { kind: "membership", packageSlug: "dual-society" });
});

test("CONNECT 360 needs Executive Private", () => {
  assert.deepEqual(decide(needForHref("/app/connect360/rooms")!, at({ level: "complete", experiences: ["business", "relationships"] })), { kind: "membership", packageSlug: "executive-private" });
  assert.deepEqual(decide(needForHref("/app/connect360")!, at({ level: "executive", experiences: ["business", "relationships"] })), { kind: "allowed" });
});

test("Elite Members are never shown an upgrade", () => {
  const elite = at({ level: "elite", experiences: ["business", "relationships", "counseling"] });
  for (const need of [{ experience: "relationships" as const }, { experience: "business" as const }, { level: "executive" as const }, { level: "complete" as const }, { elite: true }]) {
    const d = decide(need, elite);
    assert.ok(d.kind !== "membership" && d.kind !== "verification", JSON.stringify(need));
  }
  // An Elite Member's missing experience row still never produces an upsell.
  assert.equal(decide({ experience: "relationships" }, at({ level: "elite", experiences: [] })).kind, "allowed");
});

test("Elite Concierge is a verification step, not a purchase", () => {
  assert.deepEqual(decide({ elite: true }, at({ level: "executive", experiences: ["business"] })), { kind: "verification", packageSlug: "elite-concierge" });
});

test("unfinished features and closed areas are never shown as an upsell", () => {
  assert.deepEqual(decide({ status: "in-development" }, base), { kind: "in_development" });
  assert.deepEqual(decide({ experience: "relationships" }, at({ level: "one", experiences: ["relationships"], live: { business: true, relationships: false } })), { kind: "opening_soon", experience: "relationships" });
  assert.equal(decide({ experience: "relationships" }, at({ level: "one", experiences: ["relationships"], live: { business: true, relationships: false }, preview: true })).kind, "allowed");
  assert.deepEqual(decide({ experience: "relationships" }, at({ signedIn: false })), { kind: "error" });
});

test("packages resolve to the lowest membership that includes the need", () => {
  assert.equal(packageFor({ level: "complete" }, base), "complete-society");
  assert.equal(packageFor({ level: "one" }, at({ society: "business" })), "professional-society");
});

test("checkout only ever returns to a member page", () => {
  assert.equal(safeReturn("/app/relationships"), "/app/relationships");
  assert.equal(safeReturn("/app/connect360/rooms"), "/app/connect360/rooms");
  for (const bad of ["https://evil.example", "//evil.example", "/app//evil", "/admin", "/app/x?y=1", "javascript:alert(1)", null, 5]) assert.equal(safeReturn(bad), null, String(bad));
});
