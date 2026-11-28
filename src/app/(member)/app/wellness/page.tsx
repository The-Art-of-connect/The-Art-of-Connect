import Image from "next/image";
import Link from "next/link";
import { getViewer, hasRole, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getJourneyStatus } from "@/lib/journey-server";
import { CRISIS, GENDERS, IN_HOUSE_SERVICES, MEETING, PROVIDERS, SUPPORT_CONCERNS } from "@/lib/wellness";
import { saveSupportPreferences } from "@/app/actions/wellness";
import { ActionForm } from "@/components/admin/ActionForm";
import { bookingGate } from "@/lib/counseling-booking";

export const dynamic = "force-dynamic";
export const metadata = { title: "Counseling & Wellness Center" };

/** Open to every member, whatever their society or membership. Clinical services (appointments) stay closed until approved. */
export default async function WellnessCenter() {
  const viewer = (await getViewer())!;
  const status = await getJourneyStatus();
  const paid = status.access === "standard" || status.access === "enhanced" || (status.access === "staff" && hasRole(viewer, ["owner"]));
  const supabase = await createClient();
  const { data: pref } = supabase && !isInsidePreview(viewer)
    ? await supabase.schema("counseling").from("support_preferences").select("*").eq("user_id", viewer.id).maybeSingle()
    : { data: null };
  const gate = await bookingGate(viewer);
  const { data: counselorRow } = supabase && !isInsidePreview(viewer) && !viewer.viewAs
    ? await supabase.schema("counseling").from("counselors").select("user_id").eq("user_id", viewer.id).maybeSingle()
    : { data: null };
  const isCounselor = Boolean(counselorRow);
  const radio = "peer sr-only";
  const pill = "block cursor-pointer rounded-xl border border-champagne/60 px-4 py-2.5 text-sm transition peer-checked:border-burgundy peer-checked:bg-champagne/25 peer-checked:font-semibold peer-focus-visible:ring-2 peer-focus-visible:ring-gold";

  return (
    <>
      <section className="theme-dark relative overflow-hidden rounded-[28px] bg-ink px-6 py-12 text-center sm:px-12">
        <Image src="/images/wellness/center.webp" alt="" fill priority sizes="100vw" className="object-cover opacity-40" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/30" />
        <p className="eyebrow relative">The Art of Connect</p>
        <h1 className="display relative mt-3 text-4xl text-gold-bright sm:text-6xl">Counseling &amp; Wellness Center</h1>
        <p className="display relative mx-auto mt-3 max-w-xl text-2xl italic text-ivory/85">Professional support for every chapter of your life.</p>
        <p className="relative mx-auto mt-4 max-w-2xl text-sm text-muted">Available to every member, whatever your society or membership. Choose the kind of support that feels right for you.</p>
      </section>

      <section aria-label="Three ways to find support" className="mt-10 grid gap-5 lg:grid-cols-3">
        <div className="glass flex flex-col p-7">
          <p className="eyebrow">1 · Journey Guided Support</p>
          <p className="display mt-2 text-2xl text-burgundy">Personal growth, guided by Journey</p>
          <p className="mt-2 flex-1 text-sm text-muted">Nonclinical, AI-guided reflection, emotional awareness and personal development. Journey is an AI companion, not a licensed therapist, and never diagnoses or treats.</p>
          {paid ? (
            <div className="mt-5 flex flex-wrap gap-2"><Link href="/app/journey" className="btn btn-gold btn-sm">Talk with Journey</Link><Link href="/app/journey/sessions" className="btn btn-ghost btn-sm">Private Sessions</Link></div>
          ) : (
            <div className="mt-5"><p className="text-xs text-muted">Included with paid memberships. Free self-guided learning is always open in The Art of Knowing Yourself.</p><Link href="/app/know-yourself" className="btn btn-ghost btn-sm mt-3">The Art of Knowing Yourself</Link></div>
          )}
        </div>
        <div className="glass flex flex-col p-7">
          <p className="eyebrow">2 · Independent Professional Network</p>
          <p className="display mt-2 text-2xl text-burgundy">Verified licensed counselors</p>
          <p className="mt-2 flex-1 text-sm text-muted">Search verified counselors and therapists by your concerns, specialty, location, licensing, virtual or in-person preference, availability, pricing, insurance, language and culture. Each professional sets their own fees, shown clearly on their profile before you book.</p>
          {gate.canBrowse ? (
            <div className="mt-5 flex flex-wrap gap-2"><Link href="/app/wellness/counselors" className="btn btn-gold btn-sm">Find a counselor</Link><Link href="/app/wellness/appointments" className="btn btn-ghost btn-sm">My appointments</Link></div>
          ) : (
            <div className="mt-5 flex flex-wrap items-center gap-3"><span className="chip chip-locked">Not open yet</span><Link href="/app/wellness/counselors" className="text-xs text-gold underline-offset-2 hover:underline">What this means →</Link></div>
          )}
          {gate.tester && <p className="mt-2 text-xs text-gold">Pre-launch testing with fictional counselors only.</p>}
          {isCounselor && <Link href="/app/wellness/practice" className="mt-3 text-xs font-semibold text-gold underline-offset-2 hover:underline">My Counseling Practice →</Link>}
        </div>
        <div className="theme-dark flex flex-col rounded-[24px] bg-ink p-7 text-ivory">
          <p className="eyebrow">3 · The Art of Wellness</p>
          <p className="display mt-2 text-2xl text-gold-bright">Counseling &amp; Professional Support</p>
          <ul className="mt-3 flex-1 space-y-1 text-sm text-ivory/80">{IN_HOUSE_SERVICES.map((s) => <li key={s}>✦ {s}</li>)}</ul>
          <p className="mt-3 text-xs text-ivory/60">Virtual and in-person, with licensed professionals affiliated with The Art of Connect. Each professional sets their own fees.</p>
          <div className="mt-5 flex flex-wrap items-center gap-3"><span className="rounded-full border border-gold/50 px-3 py-1 text-xs text-gold">Coming soon</span><Link href="/app/wellness/art-of-wellness" className="text-xs text-gold underline-offset-2 hover:underline">Explore The Art of Wellness →</Link></div>
        </div>
      </section>

      <section aria-labelledby="prefs" className="mt-12">
        <ActionForm action={saveSupportPreferences} className="theme-ivory mx-auto max-w-3xl space-y-7 rounded-[28px] border border-champagne bg-ivory px-6 py-10 sm:px-12">
          <div className="text-center">
            <p className="text-xs tracking-[0.25em] uppercase text-gold-deep">The Art of Connect</p>
            <h2 id="prefs" className="display mt-3 text-4xl text-burgundy">You don&rsquo;t have to navigate life alone.</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">Tell us what kind of support would help. When the center opens, we&rsquo;ll suggest professionals who fit you. Private to you; optional; never a diagnosis.</p>
          </div>
          <fieldset>
            <legend className="text-sm font-semibold text-gold-deep">What would you like support with?</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">{SUPPORT_CONCERNS.map((c) => <label key={c.id}><input type="checkbox" name="concerns" value={c.id} defaultChecked={pref?.concerns?.includes(c.id)} className={radio} /><span className={pill}>{c.label}</span></label>)}</div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-semibold text-gold-deep">How would you prefer to meet?</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">{MEETING.map((c) => <label key={c.id}><input type="radio" name="meeting" value={c.id} defaultChecked={(pref?.meeting ?? "either") === c.id} className={radio} /><span className={pill}>{c.label}</span></label>)}</div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-semibold text-gold-deep">Professional preference</legend>
            <div className="mt-3 grid gap-2">{PROVIDERS.map((c) => <label key={c.id}><input type="radio" name="provider" value={c.id} defaultChecked={(pref?.provider_preference ?? "both") === c.id} className={radio} /><span className={pill}>{c.label}</span></label>)}</div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm"><span className="font-semibold text-gold-deep">Preferred counselor gender (optional)</span>
              <select name="gender" defaultValue={pref?.counselor_gender ?? "no_preference"} className="field mt-2">{GENDERS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</select></label>
            <label className="block text-sm"><span className="font-semibold text-gold-deep">Preferred language</span><input name="language" defaultValue={pref?.language ?? ""} placeholder="e.g. English, Spanish" className="field mt-2" /></label>
            <label className="block text-sm"><span className="font-semibold text-gold-deep">State where you live</span><input name="state" defaultValue={pref?.state ?? ""} placeholder="Needed to match licensed professionals" className="field mt-2" /></label>
            <label className="block text-sm"><span className="font-semibold text-gold-deep">Budget per session (optional)</span><input name="budget" defaultValue={pref?.budget ?? ""} placeholder="e.g. Under $150" className="field mt-2" /></label>
          </div>
          <label className="block text-sm"><span className="font-semibold text-gold-deep">Cultural or faith considerations (optional)</span><input name="cultural" defaultValue={pref?.cultural_notes ?? ""} className="field mt-2" /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="insurance" value="yes" defaultChecked={pref?.uses_insurance} /> I&rsquo;d like to use insurance, where accepted</label>
          <div className="border-t border-champagne pt-5 text-center">
            <button className="btn btn-gold">Save my preferences privately</button>
            <p className="mt-3 text-xs text-muted">Confidential. Compassionate. Always your choice. Never shared with matches, partners, connections or your society profiles.</p>
          </div>
        </ActionForm>
      </section>

      <section aria-labelledby="crisis" className="mx-auto mt-12 max-w-3xl rounded-[24px] border border-danger/30 bg-danger/5 p-6">
        <h2 id="crisis" className="display text-2xl">If you need help right now</h2>
        <ul className="mt-3 space-y-2 text-sm">{CRISIS.map((c) => <li key={c.label}><span className="font-semibold">{c.label}:</span> {c.detail}</li>)}</ul>
        <p className="mt-3 text-xs text-muted">Always available, with no membership or payment required. Also at <Link href="/wellness" className="underline">theartofconnect.com/wellness</Link>.</p>
      </section>
    </>
  );
}
