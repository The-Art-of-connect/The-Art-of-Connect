import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FORMAT_LABEL, STATUS_LABEL, bookingGate, usd, when } from "@/lib/counseling-booking";
import { MemberForm } from "@/components/MemberForm";
import { NotOpenYet, TestingNotice } from "@/components/CounselingBooking";
import { cancelAppointment } from "@/app/actions/counseling-booking";

export const dynamic = "force-dynamic";
export const metadata = { title: "My appointments" };

type A = { id: string; counselor_id: string; starts_at: string; ends_at: string; format: string; status: string; quoted_fee_cents: number | null; canceled_by: string | null };

/** The member's own counseling appointments (row-level security returns only their own). */
export default async function MyAppointments({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const viewer = (await getViewer())!;
  const gate = await bookingGate(viewer);
  const db = await createClient();
  const c = db?.schema("counseling");
  const { data: rows } = c && !isInsidePreview(viewer) && !viewer.viewAs
    ? await c.from("appointments").select("id, counselor_id, starts_at, ends_at, format, status, quoted_fee_cents, canceled_by").eq("client_id", viewer.id).order("starts_at", { ascending: false }).limit(100)
    : { data: [] };
  const appts = (rows ?? []) as A[];
  if (!gate.canBrowse && !appts.length) return <NotOpenYet />;
  const ids = [...new Set(appts.map((a) => a.counselor_id))];
  const [{ data: names }, { data: zones }] = ids.length && c
    ? await Promise.all([c.from("counselors").select("user_id, professional_name").in("user_id", ids), c.from("availability").select("counselor_id, timezone").in("counselor_id", ids)])
    : [{ data: [] }, { data: [] }];
  const nameOf = (id: string) => names?.find((n) => n.user_id === id)?.professional_name ?? "Your counselor";
  const tzOf = (id: string) => zones?.find((z) => z.counselor_id === id)?.timezone ?? null;
  const now = Date.now();
  const upcoming = appts.filter((a) => ["requested", "confirmed"].includes(a.status) && new Date(a.starts_at).getTime() > now).reverse();
  const past = appts.filter((a) => !upcoming.includes(a));
  const sent = (await searchParams).sent === "1";

  const Row = ({ a, cancel }: { a: A; cancel?: boolean }) => (
    <li className="glass p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="display text-xl">{when(a.starts_at, tzOf(a.counselor_id))}</p>
          <p className="text-sm text-muted">{nameOf(a.counselor_id)} · {FORMAT_LABEL[a.format] ?? a.format}{a.quoted_fee_cents !== null ? ` · counselor's fee ${usd(a.quoted_fee_cents)}` : ""}</p>
        </div>
        <span className={`chip ${a.status === "confirmed" ? "chip-live" : ""}`}>{a.status === "canceled" && a.canceled_by === "counselor" ? "Declined or canceled by the counselor" : STATUS_LABEL[a.status] ?? a.status}</span>
      </div>
      {cancel && (
        <MemberForm action={cancelAppointment} className="mt-3">
          <input type="hidden" name="id" value={a.id} />
          <button className="btn btn-ghost btn-sm">Cancel this {a.status === "requested" ? "request" : "appointment"}</button>
        </MemberForm>
      )}
    </li>
  );

  return (
    <>
      <Link href="/app/wellness" className="text-sm font-semibold text-gold">← Counseling &amp; Wellness Center</Link>
      <header className="mt-4">
        <p className="eyebrow">Private to you</p>
        <h1 className="display mt-2 text-4xl sm:text-5xl">My appointments</h1>
        <p className="mt-3 max-w-2xl text-muted">Your requests and confirmed appointments with verified counselors. Only you and your counselor can see them. No payment is taken by The Art of Connect.</p>
      </header>
      {gate.tester && <TestingNotice />}
      {sent && <p className="mt-6 rounded-2xl border border-success/40 bg-success/5 px-5 py-3 text-sm text-success" role="status">Your request was sent. You&apos;ll be notified when your counselor confirms or declines it.</p>}

      <section aria-labelledby="up" className="mt-8">
        <h2 id="up" className="display text-2xl">Upcoming</h2>
        {upcoming.length ? <ul className="mt-3 space-y-3">{upcoming.map((a) => <Row key={a.id} a={a} cancel />)}</ul> : (
          <div className="glass mt-3 p-6 text-sm text-muted">
            <p>No upcoming appointments.</p>
            {gate.canBrowse && <Link href="/app/wellness/counselors" className="btn btn-gold btn-sm mt-3">Find a counselor</Link>}
          </div>
        )}
      </section>
      {past.length > 0 && (
        <section aria-labelledby="past" className="mt-10">
          <h2 id="past" className="display text-2xl">Past and canceled</h2>
          <ul className="mt-3 space-y-3">{past.map((a) => <Row key={a.id} a={a} />)}</ul>
        </section>
      )}
    </>
  );
}
