// A mistyped Supabase address must never take the site down.
import { test } from "node:test";
import assert from "node:assert/strict";
import { validUrl } from "../src/lib/env.ts";

test("valid project URLs are accepted and normalized", () => {
  assert.equal(validUrl("https://abc.supabase.co"), "https://abc.supabase.co");
  assert.equal(validUrl("  https://abc.supabase.co/  "), "https://abc.supabase.co");
  assert.equal(validUrl('"https://abc.supabase.co"'), "https://abc.supabase.co");
});

test("invalid values become empty (treated as not configured)", () => {
  for (const bad of ["", "abc.supabase.co", "pjuekybzxgqxqdqchcmw", "ftp://x", undefined]) assert.equal(validUrl(bad), "");
});
