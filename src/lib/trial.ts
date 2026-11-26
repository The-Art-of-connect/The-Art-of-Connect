/** The 15-day membership trial (founder directive 14). Pure helpers shared by checkout, pages and tests. */
export const TRIAL_DAYS = 15;

/** Every paid membership except Elite Concierge (which requires qualification and approval first). */
export const trialEligiblePackage = (slug: string | null | undefined) => Boolean(slug) && slug !== "elite-concierge";

/** The first charge date: the day after the 15 free days (trial ends at the same time of day it began). */
export function firstChargeDate(from: Date = new Date()) {
  return new Date(from.getTime() + TRIAL_DAYS * 86_400_000);
}

export const formatChargeDate = (d: Date) => d.toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" });
