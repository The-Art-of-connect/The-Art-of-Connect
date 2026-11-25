// Every database migration must have a marker so the secure migration tool knows whether it has been applied.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const files = readdirSync(new URL("../supabase/migrations/", import.meta.url)).filter((f) => f.endsWith(".sql")).sort();
const markers = readFileSync(new URL("../supabase/migration-signatures.tsv", import.meta.url), "utf8")
  .split("\n").filter((l) => l && !l.startsWith("#")).map((l) => l.split("\t"));

test("every migration has exactly one marker, in order", () => {
  assert.deepEqual(markers.map(([f]) => f), files);
  for (const [f, sql] of markers) assert.ok(sql && sql.trim().length > 10, `missing marker SQL for ${f}`);
});

test("markers are read-only checks", () => {
  for (const [, sql] of markers) assert.doesNotMatch(sql.replace(/'[^']*'/g, "''"), /\b(insert|update|delete|drop|alter|create|grant|revoke|truncate)\b/i);
});
