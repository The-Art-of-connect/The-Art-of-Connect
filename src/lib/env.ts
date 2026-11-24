/**
 * Central access to environment configuration. Secrets are read only on the
 * server and are never hard-coded. Missing values degrade gracefully so the
 * site can be built and previewed before every service is connected.
 */
export const env = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  /** Master safety switch. Anything other than the exact string "false" keeps the platform locked. */
  launchLocked: process.env.LAUNCH_LOCK !== "false",
};

export const isSupabaseConfigured = () => Boolean(env.supabaseUrl && env.supabaseAnonKey);

export function serverSecret(name: "SUPABASE_SERVICE_ROLE_KEY" | "STRIPE_SECRET_KEY" | "STRIPE_WEBHOOK_SECRET") {
  if (typeof window !== "undefined") throw new Error(`${name} must never be read in the browser`);
  return process.env[name] ?? "";
}
