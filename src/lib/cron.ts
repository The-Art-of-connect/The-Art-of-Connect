import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { serverSecret } from "@/lib/env";

/** Scheduled jobs prove themselves with a signature derived from the server-only service key (never sent to browsers). */
export function cronSignature(job: string) {
  const key = serverSecret("SUPABASE_SERVICE_ROLE_KEY");
  return key ? createHash("sha256").update(`${key}:cron:${job}`).digest("hex") : null;
}
export function verifyCron(req: Request, job: string) {
  const expected = cronSignature(job);
  const got = req.headers.get("x-cron-signature") ?? "";
  if (!expected || got.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}
