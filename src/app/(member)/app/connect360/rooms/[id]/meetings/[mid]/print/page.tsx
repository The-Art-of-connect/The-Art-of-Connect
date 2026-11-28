import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/PrintButton";
import { minutesText, type Minutes } from "@/lib/meetings";

export const metadata = { title: "Meeting minutes · typed copy" };
export const dynamic = "force-dynamic";

/** The typed copy of approved minutes (directive 48): print, save as PDF, or copy into an email or text. */
export default async function MinutesPrint({ params }: { params: Promise<{ id: string; mid: string }> }) {
  const { id, mid } = await params;
  const b = (await createClient())!.schema("business");
  const [{ data: m }, { data: mm }] = await Promise.all([
    b.from("room_meetings").select("title, purpose, started_at").eq("id", mid).eq("room_id", id).maybeSingle(),
    b.from("meeting_minutes").select("sections, version").eq("meeting_id", mid).eq("status", "approved").order("version", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!m || !mm) notFound();
  return (
    <article className="mx-auto max-w-3xl bg-white p-8 text-black print:p-0">
      <div className="mb-6 flex justify-end print:hidden"><PrintButton /></div>
      <pre className="whitespace-pre-wrap font-serif text-[15px] leading-relaxed">{minutesText(m.title, m.started_at, m.purpose, mm.sections as Minutes)}</pre>
      <p className="mt-6 text-xs text-gray-600">The Art of Connect · Business Deal Room · approved minutes, version {mm.version}. Confidential to the room&apos;s participants.</p>
    </article>
  );
}
