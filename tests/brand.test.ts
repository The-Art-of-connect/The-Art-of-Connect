import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { BRAND_TERMS, brandInstructions, findMisnamings, matchTerms } from "../src/lib/brand.ts";
import { FEATURES } from "../src/lib/features.ts";

// Founder directive 37: one official name everywhere. This scans the whole site (pages, components, emails, Journey,
// Owner Portal, reports) for incorrect variants. Routes, file names and import paths are code, not names: skipped.
const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? files(p) : /\.(tsx?|md)$/.test(p) ? [p] : []; });
const visibleText = (src: string) => src
  .replace(/(["'`])\/[^"'`\s]*\1/g, "''")           // paths like "/app/connect360/..."
  .replace(/import[^;]+;/g, "")                       // imports
  .replace(/\b[a-z]+[A-Z]\w*\b/g, "")                 // camelCase identifiers (Connect360 component names stay code)
  .replace(/\bfunction \w+|\bconst \w+|\btype \w+/g, "");

test("no incorrect feature names anywhere in the site", () => {
  const problems = files("src").filter((f) => !f.endsWith("src/lib/brand.ts")).flatMap((f) =>
    findMisnamings(visibleText(readFileSync(f, "utf8"))).map((m) => `${f}: "${m.found}" → "${m.official}"`));
  assert.deepEqual(problems, []);
});

test("every official name is unique and every key is unique", () => {
  const names = BRAND_TERMS.map((t) => t.name), keys = BRAND_TERMS.map((t) => t.key);
  assert.equal(new Set(names).size, names.length);
  assert.equal(new Set(keys).size, keys.length);
});

test("everyday language resolves to the official name", () => {
  assert.equal(matchTerms("where is my research")[0]?.name, "My Intelligence Office");
  assert.ok(matchTerms("connect 360").some((t) => t.name === "CONNECT 360"));
  assert.ok(matchTerms("I need a loan").some((t) => t.name === "Capital & Funding Intelligence Center"));
  assert.ok(matchTerms("build my resume").some((t) => t.name === "Professional Résumé Builder"));
});

test("The Art of Knowing Yourself is the only name (founder decision, final)", () => {
  assert.equal(findMisnamings("Begin The Art of Self today").length, 1);
  assert.equal(findMisnamings("Identity & Self-Love in The Art of Knowing Yourself").length, 0);
  assert.equal(matchTerms("art of self")[0]?.name, "The Art of Knowing Yourself");
});

test("the naming check catches variants", () => {
  assert.equal(findMisnamings("Open Connect 360 and the Intelligence Office").length, 2);
  assert.equal(findMisnamings("Open CONNECT 360 and My Intelligence Office").length, 0);
});

test("Journey is told the official names", () => {
  const s = brandInstructions();
  for (const n of ["CONNECT 360", "My Intelligence Office", "Elite Concierge"]) assert.ok(s.includes(n));
});

test("feature registry entries for CONNECT 360 use the official names", () => {
  for (const f of FEATURES) assert.deepEqual(findMisnamings(`${f.name} ${f.what} ${f.provides} ${f.how}`), [], f.key);
});

// Every link to a registered page carries that page's official name: menus, search results and the feature directory.
import { NAV, PROFILE_LINKS } from "../src/lib/nav.ts";
import { MEMBER_PAGES, SITE_PAGES } from "../src/lib/search-index.ts";
const SEARCH_INDEX = [...SITE_PAGES, ...MEMBER_PAGES];
const OFFICIAL = new Map(BRAND_TERMS.filter((t) => "href" in t && t.href && t.kind !== "destination" && t.kind !== "experience").map((t) => [(t as { href: string }).href, t.name]));
// Pages whose name awaits the founder (see PENDING_DECISIONS in src/lib/brand.ts).
const PENDING_PAGES: string[] = [];
const nameOk = (label: string, official: string) => label === official || label.endsWith(` ${official}`) || label.startsWith(`${official} `);

test("menus use the official name for every registered page", () => {
  // Section headings ("Counseling", "In Business") group several features, so only the links themselves are checked.
  const links = [...NAV.flatMap((g) => g.links), ...PROFILE_LINKS];
  const wrong = links.filter((l) => OFFICIAL.has(l.href) && !nameOk(l.label, OFFICIAL.get(l.href)!)).map((l) => `${l.href}: "${l.label}" → "${OFFICIAL.get(l.href)}"`);
  assert.deepEqual(wrong, []);
});

test("search results use the official name for every registered page", () => {
  const wrong = SEARCH_INDEX.filter((e) => OFFICIAL.has(e.href) && !nameOk(e.title, OFFICIAL.get(e.href)!)).map((e) => `${e.href}: "${e.title}" → "${OFFICIAL.get(e.href)}"`);
  assert.deepEqual(wrong, []);
});

test("the feature directory lists every registered page under its official name", () => {
  // Several directory entries can share a page (e.g. kinds of circles); the main entry for the page must carry the name.
  const hrefs = [...new Set(FEATURES.filter((f) => f.href && OFFICIAL.has(f.href)).map((f) => f.href!))];
  const wrong = hrefs.filter((h) => !PENDING_PAGES.includes(h)).filter((h) => !FEATURES.some((f) => f.href === h && nameOk(f.name, OFFICIAL.get(h)!))).map((h) => `${h}: ${FEATURES.filter((f) => f.href === h).map((f) => `"${f.name}"`).join(", ")} → "${OFFICIAL.get(h)}"`);
  assert.deepEqual(wrong, []);
});

import { searchEntries } from "../src/lib/search-index.ts";
test("search returns the official feature first for everyday language", () => {
  assert.equal(searchEntries(SEARCH_INDEX, "research")[0]?.title, "My Intelligence Office");
  assert.equal(searchEntries(SEARCH_INDEX, "loan")[0]?.title, "Capital & Funding Intelligence Center");
  assert.equal(searchEntries(SEARCH_INDEX, "connect 360")[0]?.title, "CONNECT 360");
  assert.equal(searchEntries(SEARCH_INDEX, "intelligence office")[0]?.title, "My Intelligence Office");
});
