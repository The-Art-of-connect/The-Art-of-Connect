import { test } from "node:test";
import assert from "node:assert/strict";
import { diffLines, diffStats } from "../src/lib/diff.ts";
import { REGISTRATION_DOCS, PROFESSIONAL_DOCS, acceptanceStatement, autoRenewalStatement, checkoutDocs } from "../src/lib/legal-requirements.ts";

test("version comparison marks added and removed lines", () => {
  const d = diffLines("a\nb\nc", "a\nc\nd");
  assert.deepEqual(d.map((l) => `${l.kind}:${l.text}`), ["same:a", "removed:b", "same:c", "added:d"]);
  assert.deepEqual(diffStats(d), { added: 1, removed: 1 });
});

test("registration requires terms, privacy, e-communications and community standards", () => {
  assert.deepEqual(REGISTRATION_DOCS, ["terms-of-service", "privacy-policy", "electronic-communications", "community-standards"]);
});

test("checkout documents follow the experiences chosen", () => {
  assert.deepEqual(checkoutDocs(["business"], false), ["membership-agreement", "subscription-auto-renewal", "refund-policy", "business-networking-disclaimer"]);
  const couples = checkoutDocs(["relationships"], true);
  assert.ok(couples.includes("matchmaking-disclaimer") && couples.includes("couples-agreement"));
  assert.ok(!checkoutDocs(["relationships"], false).includes("couples-agreement"));
});

test("providers accept their own agreement", () => {
  assert.ok(PROFESSIONAL_DOCS.includes("professional-agreement"));
});

test("acceptance and auto-renewal wording is explicit", () => {
  assert.equal(acceptanceStatement(["terms-of-service", "privacy-policy"]), "I have read and agree to the Terms of Service and Privacy Policy.");
  const s = autoRenewalStatement({ packageName: "Dual Society", amount: "$59.99", interval: "month" });
  assert.match(s, /renews automatically every month at \$59\.99/);
  assert.match(s, /cancel online at any time/);
});
