import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeResume, resumeChecklist, sectionOrder } from "../src/lib/resume.ts";
import { parseEnhanced, stripContact, verifyAgainstSource } from "../src/lib/resume-ai.ts";

const SOURCE = `Jordan Example
jordan@example.com  (404) 555-0100
Operations Manager, Fictional Harbor Logistics, Atlanta GA, 2019 - Present
Managed a team of 12 and improved scheduling.
B.S. Business Administration, Fictional State University, 2012`;

test("contact details are removed before anything is sent to the AI provider", () => {
  const s = stripContact(SOURCE);
  assert.ok(!s.cleaned.includes("jordan@example.com"));
  assert.ok(!s.cleaned.includes("555-0100"));
  assert.equal(s.email, "jordan@example.com");
});

test("invented employers, schools and credentials are removed and become questions", () => {
  const reply = JSON.stringify({
    resume: {
      contact: { name: "Jordan Example", headline: "Operations Manager" },
      experience: [
        { title: "Operations Manager", organization: "Fictional Harbor Logistics", highlights: ["Led a team of 12."] },
        { title: "Director", organization: "Invented Corp", highlights: ["Grew revenue 300%."] },
      ],
      education: [{ school: "Fictional State University", credential: "B.S." }, { school: "Imaginary Business School", credential: "MBA" }],
      certifications: [{ name: "PMP" }],
    },
    questions: ["How many routes did you schedule?"], changes: ["Stronger verbs"],
  });
  const parsed = parseEnhanced(reply, { email: "jordan@example.com", phone: "" });
  assert.ok(parsed);
  const checked = verifyAgainstSource(parsed!, SOURCE);
  assert.deepEqual(checked.data.experience.map((e) => e.organization), ["Fictional Harbor Logistics"]);
  assert.deepEqual(checked.data.education.map((e) => e.school), ["Fictional State University"]);
  assert.equal(checked.data.certifications.length, 0);
  assert.ok(checked.questions.some((q) => q.includes("Invented Corp")));
  assert.equal(checked.data.contact.email, "jordan@example.com");
});

test("a reply that isn't JSON is rejected rather than guessed at", () => {
  assert.equal(parseEnhanced("I'm sorry, I can't.", { email: "", phone: "" }), null);
});

test("normalization caps sizes and drops unknown fields", () => {
  const r = normalizeResume({ summary: "x".repeat(5000), skills: Array(100).fill("a"), extra: "nope" });
  assert.equal(r.summary.length, 1500);
  assert.equal(r.skills.length, 40);
  assert.ok(!("extra" in r));
  assert.equal(resumeChecklist(r).find((c) => c.label.startsWith("Five"))?.done, true);
});

test("each template has every section exactly once", () => {
  for (const t of ["signature", "executive", "foundation", "transition"]) assert.equal(new Set(sectionOrder(t)).size, 6);
});
