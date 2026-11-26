import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Downloads a visible event as a calendar file for the member's own calendar (Apple, Google, Outlook). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer || !/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const db = await createClient();
  const { data: e } = db ? await db.from("social_events").select("id, title, description, starts_at, ends_at, venue, city, region, country, url, mode").eq("id", id).maybeSingle() : { data: null };
  if (!e) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const start = new Date(e.starts_at); const end = e.ends_at ? new Date(e.ends_at) : new Date(start.getTime() + 2 * 3600_000);
  const location = e.mode === "virtual" ? "Virtual" : [e.venue, e.city, e.region, e.country].filter(Boolean).join(", ");
  const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//The Art of Connect//Connect Calendar//EN", "BEGIN:VEVENT",
    `UID:${e.id}@theartofconnect.com`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(e.title)}`, location ? `LOCATION:${esc(location)}` : "", `DESCRIPTION:${esc([(e.description ?? "").slice(0, 1500), e.url ?? "", "Shared on The Connect Calendar"].filter(Boolean).join("\n\n"))}`,
    "END:VEVENT", "END:VCALENDAR"].filter(Boolean).join("\r\n");
  return new NextResponse(body, { headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": `attachment; filename="event.ics"`, "cache-control": "no-store" } });
}
