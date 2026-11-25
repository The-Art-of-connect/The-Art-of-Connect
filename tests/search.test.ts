import { test } from "node:test";
import assert from "node:assert/strict";
import { MEMBER_PAGES, SITE_PAGES, searchEntries } from "../src/lib/search-index.ts";

const all = [...MEMBER_PAGES, ...SITE_PAGES];
const top = (q: string, entries = all) => searchEntries(entries, q)[0]?.href;

test("everyday words find the right page", () => {
  assert.equal(top("price"), "/membership");
  assert.equal(top("webinar", SITE_PAGES), "/webinars");
  assert.equal(top("cancel"), "/app/membership");
  assert.equal(top("journal"), "/app/counseling/journal");
  assert.equal(top("login"), "/sign-in");
  assert.equal(top("forgot password"), "/forgot-password");
  assert.equal(top("home", SITE_PAGES), "/");
  assert.equal(top("calendar"), "/app/relationships/calendar");
});

test("case, punctuation and extra spaces don't matter", () => {
  assert.equal(top("  PRIVACY!! ", SITE_PAGES), "/legal");
});

test("unknown words return nothing and empty searches return nothing", () => {
  assert.deepEqual(searchEntries(all, "zzzqqq"), []);
  assert.deepEqual(searchEntries(all, "   "), []);
});

test("the public index never lists member or owner pages", () => {
  for (const e of SITE_PAGES) assert.ok(!e.href.startsWith("/app") && !e.href.startsWith("/admin"), e.href);
});

test("every page in the index is unique", () => {
  const hrefs = all.map((e) => e.href);
  assert.equal(new Set(hrefs).size, hrefs.length);
});
