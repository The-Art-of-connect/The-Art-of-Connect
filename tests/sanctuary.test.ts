import { test } from "node:test";
import assert from "node:assert/strict";
import { dailyPick, itemFor, nextScenario, opportunities, readiness, reminderDue, summarize, weekStart } from "../src/lib/sanctuary.ts";

const c = (id: string, kind: string, publish_on: string | null = null) => ({ id, kind, topic: null, title: null, body: id, example: null, reflection: null, activity: null, options: null, course: null, course_order: null, publish_on });

test("daily content is stable for the day and prefers what the owner scheduled", () => {
  const all = [c("a", "affirmation"), c("b", "affirmation"), c("s", "affirmation", "2026-12-01")];
  assert.equal(itemFor(all, "affirmation", "2026-12-01", "m1")?.id, "s");
  const x = itemFor(all, "affirmation", "2026-12-02", "m1")?.id;
  assert.equal(itemFor(all, "affirmation", "2026-12-02", "m1")?.id, x);
  assert.notEqual(x, "s");
  assert.equal(dailyPick([], "x"), undefined);
});

test("scenarios are never repeated unless the member revisits them", () => {
  const all = [c("1", "scenario"), c("2", "scenario")];
  assert.equal(nextScenario(all, new Set(["1"]))?.id, "2");
  assert.equal(nextScenario(all, new Set(["1", "2"])), undefined);
});

test("summaries count only the member's own entries, without judgments", () => {
  const s = summarize([{ kind: "checkin", mood: "calm", day: "a" }, { kind: "checkin", mood: "calm", day: "b" }, { kind: "gratitude", mood: null, day: "b" }]);
  assert.deepEqual([s.daysPresent, s.checkins, s.gratitude, s.topMood], [2, 2, 1, "calm"]);
  assert.equal(weekStart(new Date("2026-11-26T12:00:00Z")), "2026-11-23");
});

test("Connection Readiness measures information completeness and respects consent", () => {
  assert.equal(readiness({ interests: 3, scenariosAnswered: 6, discoveryPercent: 100, consent: false }).percent, 30);
  const r = readiness({ interests: 3, scenariosAnswered: 2, discoveryPercent: 0, consent: true });
  assert.equal(r.percent, 44);
  assert.ok(r.sufficient);
  assert.equal(readiness({ interests: 0, scenariosAnswered: 0, discoveryPercent: 0, consent: true }).sufficient, false);
});

test("invitations follow the member's own choices; singles never under 30; Elite only with business interest", () => {
  const o = opportunities({ interests: ["travel", "business"], signals: ["explore:singles"], society: null, age: 28 });
  const keys = o.map((x) => x.key);
  assert.ok(keys.includes("travel") && keys.includes("business") && keys.includes("elite"));
  assert.ok(!keys.includes("singles"));
  assert.ok(!opportunities({ interests: ["travel"], signals: [], society: null, age: 40 }).some((x) => x.key === "elite"));
  assert.deepEqual(opportunities({ interests: [], signals: [], society: null, age: 40 }), []);
});

test("reminders arrive at the member's chosen local time, at most once per period", () => {
  const s = { reminder_frequency: "daily", reminder_time: "08:00", reminder_weekday: 1, time_zone: "America/New_York", last_reminded_at: null };
  assert.equal(reminderDue(s, new Date("2026-11-26T12:30:00Z")), false); // 7:30 New York
  assert.equal(reminderDue(s, new Date("2026-11-26T13:30:00Z")), true);
  assert.equal(reminderDue({ ...s, last_reminded_at: "2026-11-26T13:15:00Z" }, new Date("2026-11-26T15:00:00Z")), false);
  assert.equal(reminderDue({ ...s, reminder_frequency: "off" }, new Date("2026-11-26T13:30:00Z")), false);
});
