// Email privacy: sensitive fields can never be passed into a template.
import { test } from "node:test";
import assert from "node:assert/strict";
import { assertSafeFields, renderEmail, templates } from "../src/lib/email-templates.ts";

test("sensitive field names are rejected", () => {
  for (const k of ["journalEntry", "private_reflection", "assessmentAnswers", "session_notes", "dateOfBirth", "dob", "messageBody", "password", "apiKey"]) {
    assert.throws(() => assertSafeFields({ [k]: "x" }), new RegExp(k));
  }
  assert.doesNotThrow(() => assertSafeFields({ name: "Ann", amount: 100, tierName: "Elite" }));
});

test("templates escape HTML and include the privacy notice", () => {
  const c = templates.welcome({ name: "<script>alert(1)</script> Ann" });
  const { html, text } = renderEmail(c);
  assert.ok(!html.includes("<script>alert"));
  assert.ok(html.includes("never include journal entries"));
  assert.ok(text.includes("never include journal entries"));
});

test("appointment reminders never name the professional or topic", () => {
  const c = templates.appointmentReminder({ name: "Ann", when: "Tue Dec 2, 3:00 PM", format: "video" });
  assert.equal(Object.keys({ name: 1, when: 1, format: 1 }).length, 3);
  assert.ok(!/counsel(or|ing) note|topic|diagnos/i.test(c.paragraphs.join(" ")));
});
