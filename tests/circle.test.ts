import { test } from "node:test";
import assert from "node:assert/strict";
import { nextSlot, screen, shieldMessage, slotStart, topicOpen } from "../src/lib/circle.ts";

test("a new featured topic every four hours, six a day", () => {
  const d = new Date("2026-11-26T13:15:00Z");
  assert.equal(slotStart(d).toISOString(), "2026-11-26T12:00:00.000Z");
  assert.equal(nextSlot(d).toISOString(), "2026-11-26T16:00:00.000Z");
});

test("earlier discussions stay open after the next topic begins, until their window ends", () => {
  const t = { id: "1", title: "t", prompt: "p", category: "family", slot_start: "2026-11-26T08:00:00Z", open_hours: 24, paused: false, closed_at: null, room: "becoming", status: "scheduled" };
  assert.ok(topicOpen(t, new Date("2026-11-26T13:00:00Z")));
  assert.ok(!topicOpen(t, new Date("2026-11-27T09:00:00Z")));
  assert.ok(!topicOpen({ ...t, paused: true }, new Date("2026-11-26T13:00:00Z")));
  assert.ok(!topicOpen(t, new Date("2026-11-26T07:00:00Z")));
});

test("the Safety Shield refuses personal information but allows websites", () => {
  for (const s of ["call 404-555-1212", "me@gmail.com", "SSN 123-45-6789", "4242 4242 4242 4242", "my password is hunter2", "I live at 42 Peachtree Street"]) {
    const r = screen(s);
    assert.ok(!r.ok && r.kind === "personal", s);
  }
  assert.ok(screen("Visit theartofconnect.com and our event page").ok);
  assert.ok(screen("I grew in 2019-2024 more than ever").ok);
});

test("threats and money requests are blocked; disrespect asks to revise", () => {
  const t = screen("I will find you");
  assert.ok(!t.ok && t.kind === "threat");
  const f = screen("Send me money on Cash App and I'll double your money");
  assert.ok(!f.ok && f.kind === "fraud");
  const d = screen("You're an idiot if you believe that");
  assert.ok(!d.ok && d.kind === "disrespect");
  assert.ok(screen("You're an idiot if you believe that", { confirmedRespectful: true }).ok);
  assert.ok(screen("I respectfully see this differently, and here's why.").ok);
  assert.ok(shieldMessage("SAFETY_SHIELD:phone"));
  assert.equal(shieldMessage("other"), null);
});
