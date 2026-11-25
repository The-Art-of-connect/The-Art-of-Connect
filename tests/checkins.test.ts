import { test } from "node:test";
import assert from "node:assert/strict";
import { eveningReflection, inQuietHours, morningManifestation } from "../src/lib/checkins.ts";

test("quiet hours work across midnight and within a day", () => {
  assert.equal(inQuietHours("23:10", "21:30", "07:30"), true);
  assert.equal(inQuietHours("06:59", "21:30", "07:30"), true);
  assert.equal(inQuietHours("12:00", "21:30", "07:30"), false);
  assert.equal(inQuietHours("13:30", "13:00", "14:00"), true);
  assert.equal(inQuietHours("14:00", "13:00", "14:00"), false);
});

test("manifestations are stable for a day and personalized with the member's values", () => {
  const d = new Date("2027-01-05T12:00:00Z");
  assert.equal(morningManifestation("a", ["Peace"], d), morningManifestation("a", ["Peace"], d));
  assert.doesNotMatch(morningManifestation("a", [], d), /\{value\}/);
  const withValue = Array.from({ length: 12 }, (_, i) => morningManifestation("a", ["Peace"], new Date(d.getTime() + i * 86_400_000)));
  assert.ok(withValue.some((m) => m.includes("peace")));
});

test("evening reflections are questions", () => {
  assert.match(eveningReflection("member-1"), /\?$/);
});
