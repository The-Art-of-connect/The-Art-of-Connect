import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { serverSecret } from "@/lib/env";

/**
 * Owner testing session: a signed, expiring cookie that the owner starts from the Owner Portal (owner role and
 * two-step verification required). While it is valid in THAT browser, the developed platform behaves as if launched
 * so the owner can test it end to end. It lives in the browser, not the account, so it survives signing in and out
 * of fictional test accounts. Public visitors are unaffected, live Stripe keys are refused, and accounts created
 * during it are permanently flagged as test accounts.
 */
export const OWNER_TEST_COOKIE = "aoc_owner_test";
export const OWNER_TEST_HOURS = 12;

function key() {
  const secret = serverSecret("SUPABASE_SERVICE_ROLE_KEY");
  return secret ? createHmac("sha256", "aoc-owner-test-session").update(secret).digest() : null;
}

/** "ownerId.expiresAtMs.signature" */
export function signOwnerTestSession(ownerId: string, hours = OWNER_TEST_HOURS): { value: string; expires: Date } | null {
  const k = key();
  if (!k) return null;
  const exp = Date.now() + hours * 3_600_000;
  const body = `${ownerId}.${exp}`;
  return { value: `${body}.${createHmac("sha256", k).update(body).digest("base64url")}`, expires: new Date(exp) };
}

export function verifyOwnerTestSession(value: string | undefined | null): { ownerId: string; expires: Date } | null {
  const k = key();
  if (!k || !value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [ownerId, exp, sig] = parts;
  if (!/^[0-9a-f-]{36}$/.test(ownerId) || !/^\d{13}$/.test(exp) || Number(exp) < Date.now()) return null;
  const expected = createHmac("sha256", k).update(`${ownerId}.${exp}`).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return { ownerId, expires: new Date(Number(exp)) };
}

/** The current browser's owner testing session, if any (once per request). */
export const getOwnerTestSession = cache(async () => {
  try {
    return verifyOwnerTestSession((await cookies()).get(OWNER_TEST_COOKIE)?.value);
  } catch {
    return null; // outside a request (e.g. build), there is no session
  }
});
