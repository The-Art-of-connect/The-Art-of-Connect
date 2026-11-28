import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FEE_FORMAT_LABEL, SERVICE_LABEL, WEEKDAYS, bookingGate, dayKey, usd, when } from "@/lib/counseling-booking";
import { MemberForm } from "@/components/MemberForm";
import { NotOpenYet, TestingNotice } from "@/components/CounselingBooking";
import { requestAppointment } from "@/app/actions/counseling-booking";

export const dynamic = "force-dynamic";
export const metadata = { title: "Request a counseling appointment" };

type Fee = { id: string; service: string; service_label: string | null; format: string; duration_minutes: number; fee_cents: number; notes: string | null };

/** One verified counselor: their own fees and published weekly availability, and a request form (no payment is taken). */
export default async function Counselor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ fee?: string }> }) {
  const viewer = (await getViewer())!;
  const gate = await bookingGate(viewer);
  if (!gate.canBrowse) return <NotOpenYet />;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = (await createClient())!;
  const c = db.schema("counseling");
  const { data: x } = await c.from("counselors")
    .select("user_id, professional_name, credentials, bio, specialties, languages, licensed_states, offers_virtual, offers_in_person, accepts_insurance, insurance_notes, cancellation_policy")
    .eq("user_id", id).eq("is_verified", true).eq("is_listed", true).maybeSingle();
  if (!x) notFound();
  const [{ data: feeRows }, { data: avail }, { data: status }, { data: client }] = await Promise.all([
    c.from("fees").select("id, service, service_label, format, duration_minutes, fee_cents, notes").eq("counselor_id", id).order("fee_cents"),
    c.from("availability").select("weekday, start_time, end_time, timezone").eq("counselor_id", id).order("weekday").order("start_time"),
    db.rpc("counseling_booking_status", { p_counselor: id }),
    c.from("clients").select("preferred_name").eq("user_id", viewer.id).maybeSingle(),
  ]);
  const fees = (feeRows ?? []) as Fee[];
  const tz = avail?.[0]?.timezone ?? null;
  const feeParam = (await searchParams).fee;
  const pickedFee = fees.find((f) => f.id === feeParam) ?? fees[0] ?? null;
  const { data: slotRows } = pickedFee ? await db.rpc("counseling_open_slots", { p_counselor: id, p_minutes: pickedFee.duration_minutes, p_days: 21 }) : { data: [] };
  const slots = ((slotRows ?? []) as { starts_at: string; ends_at: string }[]);
  const byDay = new Map<string, typeof slots>();
  for (const s of slots) { const k = dayKey(s.starts_at, tz); byDay.set(k, [...(byDay.get(k) ?? []), s]); }
  const formats = pickedFee ? [
    ...(x.offers_virtual && pickedFee.format !== "in_person" ? [["video", "Video"], ["phone", "Phone"]] : []),
    ...(x.offers_in_person && pickedFee.format !== "virtual" ? [["in_person", "In person"]] : []),
  ] : [];
  const fictionalOnly = status === "fictional_only";

  return (
    <>
      <Link href="/app/wellness/counselors" className="text-sm font-semibold text-gold">← Find a counselor</Link>
      {gate.tester && <TestingNotice />}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section className="glass p-6 sm:p-8" aria-labelledby="who">
          <p className="eyebrow">Verified counselor</p>
          <h1 id="who" className="display mt-2 text-4xl">{x.professional_name}</h1>
          {x.credentials && <p className="mt-1 text-muted">{x.credentials}</p>}
          {x.bio && <p className="mt-4 whitespace-pre-line text-sm">{x.bio}</p>}
          <dl className="mt-4 space-y-1.5 text-sm">
            {x.specialties?.length > 0 && <div><dt className="inline font-semibold">Specialties: </dt><dd className="inline text-muted">{x.specialties.join(", ")}</dd></div>}
            {x.licensed_states?.length > 0 && <div><dt className="inline font-semibold">Licensed in: </dt><dd className="inline text-muted">{x.licensed_states.join(", ")}</dd></div>}
            {x.languages?.length > 0 && <div><dt className="inline font-semibold">Languages: </dt><dd className="inline text-muted">{x.languages.join(", ")}</dd></div>}
            <div><dt className="inline font-semibold">Insurance: </dt><dd className="inline text-muted">{x.accepts_insurance ? x.insurance_notes || "Accepted (ask your counselor for details)" : "Not stated as accepted"}</dd></div>
          </dl>
          {x.cancellation_policy && <div className="mt-4 rounded-xl border border-line p-4 text-sm"><p className="font-semibold">This counselor&apos;s cancellation policy</p><p className="mt-1 whitespace-pre-line text-muted">{x.cancellation_policy}</p></div>}

          <h2 className="display mt-6 text-2xl">Fees set by {x.professional_name}</h2>
          <p className="text-xs text-muted">Each counselor sets their own fees; The Art of Connect never does.</p>
          {fees.length ? (
            <ul className="mt-3 space-y-2">
              {fees.map((f) => (
                <li key={f.id} className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-line px-4 py-3 text-sm">
                  <span><span className="font-semibold">{f.service_label || SERVICE_LABEL[f.service]}</span> · {f.duration_minutes} min · {FEE_FORMAT_LABEL[f.format]}{f.notes ? <span className="block text-xs text-muted">{f.notes}</span> : null}</span>
                  <span className="font-semibold">{usd(f.fee_cents)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm text-muted">This counselor hasn&apos;t published fees yet, so requests aren&apos;t possible.</p>}

          <h2 className="display mt-6 text-2xl">Weekly availability</h2>
          {avail?.length ? (
            <ul className="mt-2 space-y-1 text-sm text-muted">{avail.map((a, i) => <li key={i}>{WEEKDAYS[a.weekday]} · {a.start_time.slice(0, 5)}–{a.end_time.slice(0, 5)} ({a.timezone})</li>)}</ul>
          ) : <p className="mt-2 text-sm text-muted">No availability published yet.</p>}
        </section>

        <section className="glass p-6 sm:p-8" aria-labelledby="request">
          <p className="eyebrow">Request a time</p>
          <h2 id="request" className="display mt-2 text-3xl">Choose a service and a time</h2>
          <p className="mt-2 text-sm text-muted">This sends a request. Your counselor confirms or declines it, and you&apos;ll be notified. No payment is taken by The Art of Connect.</p>
          {fictionalOnly ? (
            <p className="mt-5 rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm text-gold">Before launch, testing is limited to fictional counselors. {x.professional_name} is a real professional, so requests can&apos;t be sent yet.</p>
          ) : !pickedFee ? null : (
            <>
              {fees.length > 1 && (
                <form action={`/app/wellness/counselors/${id}`} className="mt-5 flex flex-wrap items-end gap-3">
                  <label className="block min-w-0 flex-1 text-sm"><span className="font-semibold">Service</span>
                    <select name="fee" defaultValue={pickedFee.id} className="field mt-1">{fees.map((f) => <option key={f.id} value={f.id}>{f.service_label || SERVICE_LABEL[f.service]} · {f.duration_minutes} min · {usd(f.fee_cents)}</option>)}</select>
                  </label>
                  <button className="btn btn-ghost btn-sm">Show times</button>
                </form>
              )}
              {slots.length ? (
                <MemberForm action={requestAppointment} className="mt-5 space-y-4">
                  <input type="hidden" name="counselor" value={id} />
                  <input type="hidden" name="fee" value={pickedFee.id} />
                  <p className="text-sm"><span className="font-semibold">Service:</span> {pickedFee.service_label || SERVICE_LABEL[pickedFee.service]} · {pickedFee.duration_minutes} min · {usd(pickedFee.fee_cents)} (the counselor&apos;s published fee)</p>
                  <label className="block text-sm"><span className="font-semibold">Time</span> <span className="text-xs text-muted">(shown in {tz ?? "the counselor's time zone"})</span>
                    <select name="slot" required className="field mt-1" defaultValue="">
                      <option value="" disabled>Choose a time</option>
                      {[...byDay.entries()].map(([day, list]) => <optgroup key={day} label={day}>{list.map((s) => <option key={s.starts_at} value={s.starts_at}>{when(s.starts_at, tz)}</option>)}</optgroup>)}
                    </select>
                  </label>
                  <label className="block text-sm"><span className="font-semibold">How you&apos;d like to meet</span>
                    <select name="format" required className="field mt-1">{formats.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                  </label>
                  <label className="block text-sm"><span className="font-semibold">Name your counselor will see</span>
                    <input name="name" required maxLength={80} defaultValue={client?.preferred_name ?? viewer.displayName ?? ""} className="field mt-1" autoComplete="nickname" />
                    <span className="mt-1 block text-xs text-muted">Your counselor sees only this name and your appointment times, never your other profiles.</span>
                  </label>
                  <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="understand" required className="mt-1" /> I understand this is a request, not a confirmed appointment, and that fees are set by the counselor.</label>
                  <button className="btn btn-gold">Send my request</button>
                </MemberForm>
              ) : <p className="mt-5 text-sm text-muted">No open times in the next three weeks for this service. Please check back, or choose another counselor.</p>}
            </>
          )}
          <p className="mt-6 text-xs text-muted">If you are in crisis, call or text 988 (U.S.) or call 911. Appointment requests are not for emergencies.</p>
        </section>
      </div>
    </>
  );
}
