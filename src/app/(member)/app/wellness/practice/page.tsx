import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FEE_FORMAT_LABEL, FORMAT_LABEL, SERVICE_LABEL, STATUS_LABEL, WEEKDAYS, bookingGate, usd, when } from "@/lib/counseling-booking";
import { MemberForm } from "@/components/MemberForm";
import { addAvailability, addFee, removeAvailability, removeFee, respondAppointment, saveListing } from "@/app/actions/counseling-booking";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Counseling Practice" };

const ZONES = ["America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu", "America/Puerto_Rico"];
type A = { id: string; client_id: string; starts_at: string; ends_at: string; format: string; status: string; quoted_fee_cents: number | null };

/** For approved counselors: their listing, weekly availability, their own fees, and appointment requests to confirm or decline. */
export default async function Practice() {
  const viewer = (await getViewer())!;
  const db = await createClient();
  const c = db?.schema("counseling");
  const { data: me } = c && !isInsidePreview(viewer) && !viewer.viewAs
    ? await c.from("counselors").select("*").eq("user_id", viewer.id).maybeSingle()
    : { data: null };
  if (!me || !c) {
    return (
      <section className="glass mx-auto mt-6 max-w-2xl p-8 text-center">
        <p className="eyebrow">My Counseling Practice</p>
        <h1 className="display mt-3 text-4xl">For approved counselors</h1>
        <p className="mt-3 text-muted">This space opens once our team has reviewed and approved your professional application.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3"><Link href="/professionals" className="btn btn-gold btn-sm">For professionals</Link><Link href="/app/wellness" className="btn btn-ghost btn-sm">Counseling &amp; Wellness Center</Link></div>
      </section>
    );
  }
  const gate = await bookingGate(viewer);
  const [{ data: avail }, { data: fees }, { data: rows }] = await Promise.all([
    c.from("availability").select("id, weekday, start_time, end_time, timezone").eq("counselor_id", viewer.id).order("weekday").order("start_time"),
    c.from("fees").select("id, service, service_label, format, duration_minutes, fee_cents, notes").eq("counselor_id", viewer.id).order("fee_cents"),
    c.from("appointments").select("id, client_id, starts_at, ends_at, format, status, quoted_fee_cents").eq("counselor_id", viewer.id).order("starts_at").limit(200),
  ]);
  const appts = (rows ?? []) as A[];
  const { data: clients } = appts.length ? await c.from("clients").select("user_id, preferred_name").in("user_id", [...new Set(appts.map((a) => a.client_id))]) : { data: [] };
  const nameOf = (id: string) => clients?.find((x) => x.user_id === id)?.preferred_name ?? "Member";
  const tz = avail?.[0]?.timezone ?? null;
  const now = Date.now();
  const requests = appts.filter((a) => a.status === "requested");
  const confirmed = appts.filter((a) => a.status === "confirmed");
  const decide = (a: A, options: [string, string][]) => (
    <MemberForm action={respondAppointment} className="mt-3 flex flex-wrap gap-2">
      <input type="hidden" name="id" value={a.id} />
      {options.map(([v, l], i) => <button key={v} name="decision" value={v} className={`btn btn-sm ${i === 0 ? "btn-gold" : "btn-ghost"}`}>{l}</button>)}
    </MemberForm>
  );

  return (
    <>
      <Link href="/app/wellness" className="text-sm font-semibold text-gold">← Counseling &amp; Wellness Center</Link>
      <header className="mt-4">
        <p className="eyebrow">For counselors</p>
        <h1 className="display mt-2 text-4xl sm:text-5xl">My Counseling Practice</h1>
        <p className="mt-3 max-w-2xl text-muted">Publish your weekly availability and your own fees, then confirm or decline requests. Clients see only the name they chose; you see only your own clients. No payment is taken through The Art of Connect.</p>
        <p className="mt-3 text-sm">{me.is_verified ? <span className="chip chip-live">Verified</span> : <span className="chip">Awaiting verification</span>} <span className="ml-2 text-muted">{gate.open ? "Appointment requests are open to members." : "Appointment requests are not open to members yet; you can prepare your listing now."}</span></p>
      </header>

      <section aria-labelledby="req" className="mt-8">
        <h2 id="req" className="display text-2xl">Requests waiting for you ({requests.length})</h2>
        {requests.length ? (
          <ul className="mt-3 space-y-3">{requests.map((a) => (
            <li key={a.id} className="glass p-5">
              <p className="font-semibold">{nameOf(a.client_id)}</p>
              <p className="text-sm text-muted">{when(a.starts_at, tz)} · {FORMAT_LABEL[a.format]}{a.quoted_fee_cents !== null ? ` · your fee ${usd(a.quoted_fee_cents)}` : ""}</p>
              {new Date(a.starts_at).getTime() > now ? decide(a, [["confirm", "Confirm"], ["decline", "Decline"]]) : decide(a, [["decline", "Close this request"]])}
            </li>
          ))}</ul>
        ) : <p className="glass mt-3 p-5 text-sm text-muted">No requests right now.</p>}
      </section>

      <section aria-labelledby="conf" className="mt-8">
        <h2 id="conf" className="display text-2xl">Confirmed appointments</h2>
        {confirmed.length ? (
          <ul className="mt-3 space-y-3">{confirmed.map((a) => (
            <li key={a.id} className="glass p-5">
              <div className="flex flex-wrap justify-between gap-2"><p className="font-semibold">{nameOf(a.client_id)}</p><span className="chip chip-live">{STATUS_LABEL.confirmed}</span></div>
              <p className="text-sm text-muted">{when(a.starts_at, tz)} · {FORMAT_LABEL[a.format]}</p>
              {new Date(a.starts_at).getTime() > now ? decide(a, [["cancel", "Cancel appointment"]]) : decide(a, [["completed", "Mark completed"], ["no_show", "Mark missed"]])}
            </li>
          ))}</ul>
        ) : <p className="glass mt-3 p-5 text-sm text-muted">No confirmed appointments.</p>}
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="avail" className="glass p-6">
          <h2 id="avail" className="display text-2xl">Weekly availability</h2>
          <p className="mt-1 text-sm text-muted">Members can request times inside these hours. Times you already have requested or confirmed are never offered twice.</p>
          <ul className="mt-3 space-y-2">{(avail ?? []).map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-2 text-sm">
              <span>{WEEKDAYS[a.weekday]} · {a.start_time.slice(0, 5)}–{a.end_time.slice(0, 5)} ({a.timezone})</span>
              <MemberForm action={removeAvailability}><input type="hidden" name="id" value={a.id} /><button className="text-xs text-muted underline">Remove</button></MemberForm>
            </li>
          ))}</ul>
          <MemberForm action={addAvailability} className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <label className="block"><span className="font-semibold">Day</span><select name="weekday" className="field mt-1">{WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></label>
            <label className="block"><span className="font-semibold">Time zone</span><input name="timezone" list="zones" defaultValue={tz ?? "America/New_York"} className="field mt-1" required /></label>
            <datalist id="zones">{ZONES.map((z) => <option key={z} value={z} />)}</datalist>
            <label className="block"><span className="font-semibold">From</span><input type="time" name="start_time" defaultValue="09:00" className="field mt-1" required /></label>
            <label className="block"><span className="font-semibold">Until</span><input type="time" name="end_time" defaultValue="17:00" className="field mt-1" required /></label>
            <button className="btn btn-gold btn-sm sm:col-span-2 sm:justify-self-start">Add hours</button>
          </MemberForm>
        </section>

        <section aria-labelledby="fees" className="glass p-6">
          <h2 id="fees" className="display text-2xl">My fees</h2>
          <p className="mt-1 text-sm text-muted">You set your own fees. Members see them before they request a time; the length of each service sets the length of its appointments.</p>
          <ul className="mt-3 space-y-2">{(fees ?? []).map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-2 text-sm">
              <span>{f.service_label || SERVICE_LABEL[f.service]} · {f.duration_minutes} min · {FEE_FORMAT_LABEL[f.format]} · <span className="font-semibold">{usd(f.fee_cents)}</span></span>
              <MemberForm action={removeFee}><input type="hidden" name="id" value={f.id} /><button className="text-xs text-muted underline">Remove</button></MemberForm>
            </li>
          ))}</ul>
          <MemberForm action={addFee} className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <label className="block"><span className="font-semibold">Service</span><select name="service" className="field mt-1">{Object.entries(SERVICE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label className="block"><span className="font-semibold">Name shown (optional)</span><input name="service_label" maxLength={120} className="field mt-1" /></label>
            <label className="block"><span className="font-semibold">Format</span><select name="format" className="field mt-1">{Object.entries(FEE_FORMAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label className="block"><span className="font-semibold">Length (minutes)</span><input type="number" name="duration_minutes" min={10} max={240} required className="field mt-1" /></label>
            <label className="block"><span className="font-semibold">Your fee (USD)</span><input type="number" name="fee" min={0} step="0.01" required className="field mt-1" /></label>
            <label className="block"><span className="font-semibold">Notes (optional)</span><input name="notes" maxLength={1000} className="field mt-1" /></label>
            <button className="btn btn-gold btn-sm sm:col-span-2 sm:justify-self-start">Publish fee</button>
          </MemberForm>
        </section>
      </div>

      <section aria-labelledby="listing" className="glass mt-6 p-6">
        <h2 id="listing" className="display text-2xl">My listing</h2>
        <MemberForm action={saveListing} className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <label className="block"><span className="font-semibold">Professional name</span><input name="professional_name" defaultValue={me.professional_name} required maxLength={120} className="field mt-1" /></label>
          <label className="block"><span className="font-semibold">Languages (comma separated)</span><input name="languages" defaultValue={(me.languages ?? []).join(", ")} className="field mt-1" /></label>
          <label className="block"><span className="font-semibold">States where you are licensed (comma separated)</span><input name="licensed_states" defaultValue={(me.licensed_states ?? []).join(", ")} className="field mt-1" /></label>
          <fieldset className="flex flex-wrap items-center gap-4"><legend className="font-semibold">How you meet clients</legend>
            <label className="flex items-center gap-2"><input type="checkbox" name="offers_virtual" defaultChecked={me.offers_virtual} /> Virtual</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="offers_in_person" defaultChecked={me.offers_in_person} /> In person</label>
          </fieldset>
          <label className="block sm:col-span-2"><span className="font-semibold">About you</span><textarea name="bio" defaultValue={me.bio ?? ""} maxLength={2000} className="field mt-1 min-h-[100px]" /></label>
          <label className="block sm:col-span-2"><span className="font-semibold">Your cancellation policy (your own; optional)</span><textarea name="cancellation_policy" defaultValue={me.cancellation_policy ?? ""} maxLength={2000} className="field mt-1 min-h-[70px]" /></label>
          <label className="flex items-center gap-2"><input type="checkbox" name="is_listed" defaultChecked={me.is_listed} /> Show me in the counselor directory</label>
          <button className="btn btn-gold btn-sm sm:justify-self-end">Save my listing</button>
        </MemberForm>
      </section>
    </>
  );
}
