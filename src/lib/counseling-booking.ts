import "server-only";
import { getLaunchState } from "@/lib/launch";
import { createClient } from "@/lib/supabase/server";
import { isInsidePreview, isStaff, type Viewer } from "@/lib/auth";
import { isQaAccount } from "@/lib/qa-access";

/**
 * Counseling appointment booking (directive 51, clarification 4). Clinical services stay restricted before launch: members
 * can request a time only when In Life is launched (counseling_live, both keys) and the owner has opened the center
 * (counseling_center_open). Until then staff and the owner-listed fictional QA account may test the flow with fictional
 * counselors only. The database enforces the same rules (public.counseling_booking_status). No payment is taken.
 */
export type BookingGate = { open: boolean; tester: boolean; canBrowse: boolean };

export async function bookingGate(viewer: Viewer): Promise<BookingGate> {
  const launch = await getLaunchState();
  const db = await createClient();
  const { data } = db ? await db.from("platform_settings").select("value").eq("key", "counseling_center_open").maybeSingle() : { data: null };
  const open = launch.counseling_live && data?.value === true;
  const tester = !open && !isInsidePreview(viewer) && !viewer.viewAs && (isStaff(viewer) || (await isQaAccount(viewer.id)));
  return { open, tester, canBrowse: open || tester };
}

export const SERVICE_LABEL: Record<string, string> = {
  individual: "Individual session", couples: "Couples session", family: "Family session", initial_consultation: "Initial consultation", specialized: "Specialized session",
};
export const FEE_FORMAT_LABEL: Record<string, string> = { virtual: "Virtual", in_person: "In person", any: "Virtual or in person" };
export const FORMAT_LABEL: Record<string, string> = { video: "Video", phone: "Phone", in_person: "In person" };
export const STATUS_LABEL: Record<string, string> = {
  requested: "Requested · waiting for the counselor", confirmed: "Confirmed", completed: "Completed", canceled: "Canceled", no_show: "Missed",
};
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const usd = (cents: number | null | undefined) =>
  typeof cents === "number" ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100) : "—";

/** A time shown in the counselor's own time zone, with the zone named so nobody is confused. */
export function when(iso: string, tz: string | null | undefined, withDay = true) {
  const zone = tz || "America/New_York";
  try {
    return new Intl.DateTimeFormat("en-US", { ...(withDay ? { weekday: "short", month: "short", day: "numeric" } : {}), hour: "numeric", minute: "2-digit", timeZone: zone, timeZoneName: "short" }).format(new Date(iso));
  } catch {
    return new Date(iso).toUTCString();
  }
}
export const dayKey = (iso: string, tz: string | null | undefined) =>
  new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: tz || "America/New_York" }).format(new Date(iso));

/** Plain-language messages for the database's booking refusals. */
export function bookingError(message: string | undefined): string {
  const m = message ?? "";
  if (m.includes("BOOKING_NOT_OPEN")) return "Appointment requests are not open yet. Clinical services open after legal, licensing and privacy review.";
  if (m.includes("FICTIONAL_ONLY")) return "Before launch, testing is limited to fictional counselors. This counselor is a real professional.";
  if (m.includes("SLOT_UNAVAILABLE") || m.includes("SLOT_TAKEN")) return "That time was just taken or is no longer available. Please choose another time.";
  if (m.includes("FEE_REQUIRED")) return "Choose one of this counselor's published services.";
  if (m.includes("FORMAT_UNAVAILABLE")) return "This counselor doesn't offer that format for the service you chose.";
  if (m.includes("NAME_REQUIRED")) return "Add the name you'd like your counselor to use.";
  if (m.includes("COUNSELOR_UNAVAILABLE")) return "This counselor isn't accepting requests right now.";
  if (m.includes("NOT_CANCELLABLE")) return "This appointment can no longer be canceled here.";
  if (m.includes("NOT_FOUND") || m.includes("NOT_PERMITTED")) return "That change isn't available for this appointment.";
  return "That couldn't be saved. Please try again.";
}
