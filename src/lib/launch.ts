import "server-only";
import { cache } from "react";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const LAUNCH_KEYS = [
  "registrations_open",
  "payments_live",
  "relationships_live",
  "business_live",
  "counseling_live",
  "counselor_applications_open",
  "identity_verification_live",
  "maintenance_mode",
] as const;
export type LaunchKey = (typeof LAUNCH_KEYS)[number];
export type LaunchState = Record<LaunchKey, boolean> & { locked: boolean };

const CLOSED: LaunchState = {
  locked: true,
  registrations_open: false,
  payments_live: false,
  relationships_live: false,
  business_live: false,
  counseling_live: false,
  counselor_applications_open: false,
  identity_verification_live: false,
  maintenance_mode: false,
};

/**
 * Two keys are required to open anything to the public:
 *   1. LAUNCH_LOCK=false in the hosting environment, and
 *   2. the individual switch turned on in Owner Portal → Launch Controls.
 * The database enforces the same switches independently (see migrations).
 */
export const getLaunchState = cache(async (): Promise<LaunchState> => {
  const supabase = await createClient();
  if (!supabase) return CLOSED;
  const { data } = await supabase.from("platform_settings").select("key, value");
  const db = Object.fromEntries((data ?? []).map((r) => [r.key, r.value === true]));
  const state = { ...CLOSED, locked: env.launchLocked } as LaunchState;
  for (const key of LAUNCH_KEYS) {
    // Maintenance mode can always be switched on; everything else needs both keys.
    state[key] = key === "maintenance_mode" ? Boolean(db[key]) : !env.launchLocked && Boolean(db[key]);
  }
  return state;
});

/** The raw owner-portal switch values, regardless of the env lock. */
export async function getLaunchSettings() {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("platform_settings")
    .select("key, value, description, updated_at")
    .in("key", LAUNCH_KEYS as unknown as string[]);
  return data ?? [];
}
