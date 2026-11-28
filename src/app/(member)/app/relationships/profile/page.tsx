import { requireExperience, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MemberForm } from "@/components/MemberForm";
import { InLoveTabs } from "@/components/love/InLoveTabs";
import { GENDERS, INTENTS, SEEKING, SINGLES_TABS } from "@/lib/in-love";
import { saveLoveProfile } from "@/app/actions/in-love";

export const dynamic = "force-dynamic";
export const metadata = { title: "Preferences · In Love" };

const label = "mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-muted";

/** The member's In Love profile and visibility (directive 38). Only first names are ever shown to others. */
export default async function LoveProfile() {
  const { viewer } = await requireExperience("relationships");
  const db = isInsidePreview(viewer) ? null : await createClient();
  const { data: p } = db ? await db.schema("relationships").from("profiles").select("headline, about, city, relationship_intent, is_visible, gender, seeking").eq("user_id", viewer.id).maybeSingle() : { data: null };
  return (
    <>
      <section className="rounded-[2rem] border border-line bg-[var(--surface,#fffdf8)] px-5 pt-7 shadow-sm sm:px-9">
        <p className="eyebrow">In Love</p><h1 className="display mt-3 text-4xl">Your profile and preferences</h1>
        <InLoveTabs tabs={SINGLES_TABS} />
      </section>
      <MemberForm action={saveLoveProfile} className="glass mt-6 max-w-2xl space-y-4 p-6">
        <label className="block text-sm"><span className={label}>A line about you</span><input name="headline" maxLength={120} defaultValue={p?.headline ?? ""} className="field w-full" placeholder="e.g. Curious, warm and always up for a new trail" /></label>
        <label className="block text-sm"><span className={label}>About you</span><textarea name="about" rows={5} maxLength={1500} defaultValue={p?.about ?? ""} className="field w-full" placeholder="What matters to you, how you spend your time, what you're hoping to build." /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm"><span className={label}>City</span><input name="city" maxLength={80} defaultValue={p?.city ?? ""} className="field w-full" /></label>
          <label className="block text-sm"><span className={label}>I&rsquo;m looking for</span><select name="intent" defaultValue={p?.relationship_intent ?? ""} className="field w-full"><option value="">Choose…</option>{Object.entries(INTENTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm"><span className={label}>I am</span><select name="gender" defaultValue={p?.gender ?? ""} className="field w-full"><option value="">Prefer not to say</option>{Object.entries(GENDERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <fieldset className="text-sm"><legend className={label}>Interested in meeting</legend><div className="flex flex-wrap gap-3">{Object.entries(SEEKING).map(([k, v]) => <label key={k} className="flex items-center gap-2"><input type="checkbox" name="seeking" value={k} defaultChecked={(p?.seeking ?? []).includes(k)} />{v}</label>)}</div></fieldset>
        </div>
        <p className="text-xs text-muted">Introductions respect both members&rsquo; preferences. Leave these blank and we won&rsquo;t filter.</p>
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="visible" defaultChecked={p?.is_visible ?? false} className="mt-1" /><span><span className="font-semibold">Show my profile to compatible singles</span><span className="block text-muted">Only identity-verified singles 30+ can see you, by first name. You can pause at any time.</span></span></label>
        <button className="btn btn-gold">Save</button>
      </MemberForm>
    </>
  );
}
