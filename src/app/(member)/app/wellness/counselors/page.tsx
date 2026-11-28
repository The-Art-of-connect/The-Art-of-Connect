import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SERVICE_LABEL, bookingGate, usd } from "@/lib/counseling-booking";
import { NotOpenYet, TestingNotice } from "@/components/CounselingBooking";

export const dynamic = "force-dynamic";
export const metadata = { title: "Find a counselor" };

type C = { user_id: string; professional_name: string; credentials: string | null; bio: string | null; specialties: string[]; languages: string[];
  licensed_states: string[]; offers_virtual: boolean; offers_in_person: boolean; provider_type: string };

/** Verified, listed counselors with their own published fees. Requests open only when clinical services are approved. */
export default async function Counselors() {
  const viewer = (await getViewer())!;
  const gate = await bookingGate(viewer);
  if (!gate.canBrowse) return <NotOpenYet />;
  const db = (await createClient())!;
  const c = db.schema("counseling");
  const { data: rows } = await c.from("counselors")
    .select("user_id, professional_name, credentials, bio, specialties, languages, licensed_states, offers_virtual, offers_in_person, provider_type")
    .eq("is_verified", true).eq("is_listed", true).neq("user_id", viewer.id).order("professional_name");
  const counselors = (rows ?? []) as C[];
  const { data: fees } = counselors.length
    ? await c.from("fees").select("counselor_id, service, fee_cents, duration_minutes").in("counselor_id", counselors.map((x) => x.user_id))
    : { data: [] };

  return (
    <>
      <Link href="/app/wellness" className="text-sm font-semibold text-gold">← Counseling &amp; Wellness Center</Link>
      <header className="mt-4">
        <p className="eyebrow">Independent Professional Network</p>
        <h1 className="display mt-2 text-4xl sm:text-5xl">Find a counselor</h1>
        <p className="mt-3 max-w-2xl text-muted">Every counselor here has been verified by our team. Each one sets their own fees, shown below before you request a time. Requesting a time takes no payment.</p>
        <div className="mt-4 flex flex-wrap gap-3"><Link href="/app/wellness/appointments" className="btn btn-ghost btn-sm">My appointments</Link></div>
      </header>
      {gate.tester && <TestingNotice />}

      <section aria-label="Verified counselors" className="mt-8 grid gap-5 md:grid-cols-2">
        {counselors.map((x) => {
          const mine = (fees ?? []).filter((f) => f.counselor_id === x.user_id);
          const from = mine.length ? Math.min(...mine.map((f) => f.fee_cents)) : null;
          return (
            <article key={x.user_id} className="glass flex flex-col p-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="display text-2xl">{x.professional_name}</h2>
                  {x.credentials && <p className="text-sm text-muted">{x.credentials}</p>}
                </div>
                <span className="chip chip-live">Verified</span>
              </div>
              {x.bio && <p className="mt-3 line-clamp-3 text-sm text-muted">{x.bio}</p>}
              <dl className="mt-3 space-y-1 text-sm">
                {x.specialties?.length > 0 && <div><dt className="inline font-semibold">Specialties: </dt><dd className="inline text-muted">{x.specialties.join(", ")}</dd></div>}
                <div><dt className="inline font-semibold">Meets: </dt><dd className="inline text-muted">{[x.offers_virtual && "Virtual", x.offers_in_person && "In person"].filter(Boolean).join(" · ") || "Not stated"}</dd></div>
                {x.licensed_states?.length > 0 && <div><dt className="inline font-semibold">Licensed in: </dt><dd className="inline text-muted">{x.licensed_states.join(", ")}</dd></div>}
                {x.languages?.length > 0 && <div><dt className="inline font-semibold">Languages: </dt><dd className="inline text-muted">{x.languages.join(", ")}</dd></div>}
                <div><dt className="inline font-semibold">Fees: </dt><dd className="inline text-muted">{from === null ? "Not published yet" : `${mine.length} service${mine.length > 1 ? "s" : ""} from ${usd(from)} (${mine.map((f) => SERVICE_LABEL[f.service] ?? f.service).slice(0, 2).join(", ")}${mine.length > 2 ? "…" : ""})`}</dd></div>
              </dl>
              <div className="mt-5 flex-1" />
              <Link href={`/app/wellness/counselors/${x.user_id}`} className="btn btn-gold btn-sm self-start">See fees and times</Link>
            </article>
          );
        })}
      </section>
      {!counselors.length && (
        <div className="glass mt-8 p-8 text-center">
          <p className="display text-2xl">No counselors are listed yet.</p>
          <p className="mt-2 text-sm text-muted">Verified counselors appear here once they publish their profile. Your private support preferences are saved in the Counseling &amp; Wellness Center.</p>
          <Link href="/app/wellness" className="btn btn-ghost btn-sm mt-4">Back to the center</Link>
        </div>
      )}
    </>
  );
}
