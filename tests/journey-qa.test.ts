import { test } from "node:test";
import assert from "node:assert/strict";
import { journeyAccessFor, modeAllowed, withQaException, type PaidMembership } from "../src/lib/journey.ts";

// Journey's QA account (owner request, November 28, 2026): the exception only treats its complimentary $0 price as paid.
// The tier it has selected must govern access, modes and allowances in both directions of a switch.
const tier = (packageSlug: string, experiences: string[], status = "active"): PaidMembership =>
  ({ kind: "member", status, packageSlug, experiences, amountCents: 0 } as PaidMembership);
const access = (m: PaidMembership | null, qa = true) => journeyAccessFor(m ? withQaException(m, qa) : null);

const ELITE = tier("elite-concierge", ["business", "relationships"]);
const PRO = tier("professional-society", ["business"]);
const SINGLES = tier("personal-society", ["relationships"]);

test("Elite → Free: Journey closes completely and no Elite privileges remain", () => {
  assert.equal(access(ELITE), "enhanced");
  assert.equal(modeAllowed("concierge", "enhanced", withQaException(ELITE, true)), true);
  // Free: the switcher removes the complimentary membership, so there is none.
  assert.equal(access(null), "none");
  assert.equal(modeAllowed("concierge", access(null), null), false);
  assert.equal(modeAllowed("life", access(null), null), false);
});

test("Free → Elite: Journey opens with Elite's permissions only after the switch", () => {
  assert.equal(access(null), "none");
  assert.equal(access(ELITE), "enhanced");
});

test("a paid tier gets only that tier's permissions", () => {
  assert.equal(access(PRO), "standard");
  assert.equal(modeAllowed("concierge", access(PRO), withQaException(PRO, true)), false);
  assert.equal(modeAllowed("love", access(PRO), withQaException(PRO, true)), false);
  assert.equal(modeAllowed("business", access(PRO), withQaException(PRO, true)), true);
  assert.equal(modeAllowed("love", access(SINGLES), withQaException(SINGLES, true)), true);
  assert.equal(modeAllowed("business", access(SINGLES), withQaException(SINGLES, true)), false);
});

test("the exception never applies to anyone but the QA account", () => {
  assert.equal(access(ELITE, false), "none");
  assert.equal(access(PRO, false), "none");
});

test("the exception never overrides status, package or experiences", () => {
  assert.equal(access(tier("elite-concierge", ["business"], "canceled")), "none");
  assert.equal(access(tier("elite-concierge", ["business"], "past_due")), "none");
  assert.equal(access(tier("executive-private", [])), "none");
  assert.equal(access({ ...ELITE, packageSlug: null } as PaidMembership), "none");
  assert.equal(access({ ...ELITE, kind: "professional" } as PaidMembership), "none");
});

test("the exception changes only the price, nothing else", () => {
  const out = withQaException(ELITE, true);
  assert.deepEqual({ ...out, amountCents: 0 }, ELITE);
  assert.equal(withQaException({ ...ELITE, amountCents: 9999 }, true).amountCents, 9999);
});
