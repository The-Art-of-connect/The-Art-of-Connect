import { createHash } from "node:crypto";

/** Every 15 minutes: asks the site to send any due Journey check-in emails. */
export default async () => {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const site = process.env.URL;
  if (!key || !site) return new Response("not configured", { status: 200 });
  const signature = createHash("sha256").update(`${key}:cron:checkins`).digest("hex");
  const res = await fetch(`${site}/api/cron/checkins`, { method: "POST", headers: { "x-cron-signature": signature } });
  return new Response(await res.text(), { status: 200 });
};

export const config = { schedule: "*/15 * * * *" };
