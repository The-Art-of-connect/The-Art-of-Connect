import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MemberForm } from "@/components/MemberForm";
import { GrowthPrefsForm } from "@/components/GrowthPanel";
import { FREQUENCY_LABEL, RELATIONSHIP_STATUS } from "@/lib/growth";
import { setRelationshipStatus } from "@/app/actions/growth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

/**
 * Settings (directive 51 §3 and §6): one place for the member's own preferences, open to every member whatever their
 * membership. Relationship status is private and never changes a membership, partnership or record (directive 47).
 */
export default async function Settings() {
  const viewer = (await getViewer())!;
  const preview = isInsidePreview(viewer) || Boolean(viewer.viewAs);
  const db = preview ? null : await createClient();
  const [{ data: prefs }, { data: st }] = db ? await Promise.all([
    db.from("growth_prefs").select("frequency, paused, next_due_at").eq("user_id", viewer.id).maybeSingle(),
    db.schema("relationships").from("status").select("status, since").eq("user_id", viewer.id).maybeSingle(),
  ]) : [{ data: null }, { data: null }];
  const more = [
    { href: "/app/membership", title: "Membership & billing", line: "Your plan, trial, Journey allowance and payment method." },
    { href: "/app/message-center", title: "Notifications", line: "Message Center preferences and live invitations." },
    { href: "/app/journey/customize", title: "Customize Your Journey", line: "Voice, language, presence and what Journey remembers." },
    { href: "/app/verify", title: "Identity verification", line: "Your orange Identity Verified check." },
    { href: "/app/safety", title: "Privacy & safety", line: "Who sees what, blocking and reporting." },
  ];
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div><p className="eyebrow">My World</p><h1 className="display mt-2 text-5xl">Settings</h1>
        <p className="mt-2 text-muted">Your preferences, in one place. Everything here is private to you.</p></div>

      <section id="growth" className="glass scroll-mt-24 p-6">
        <h2 className="display text-2xl">Growth reflections</h2>
        <p className="mt-1 text-sm text-muted">{prefs ? <>Currently: <span className="font-semibold text-text">{FREQUENCY_LABEL[prefs.frequency]}</span>{prefs.paused ? " (paused)" : ""}.</> : "How often would you like Journey to prepare a personal reflection on your growth?"}</p>
        <div className="mt-4">{preview ? <p className="text-sm text-muted">Preview only: nothing is saved.</p> : <GrowthPrefsForm prefs={prefs} />}</div>
      </section>

      <section id="relationship" className="glass scroll-mt-24 p-6">
        <h2 className="display text-2xl">Relationship status</h2>
        <p className="mt-1 text-sm text-muted">Private to you. Your membership, benefits, history and business partnerships never change because of it.</p>
        <MemberForm action={setRelationshipStatus} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <label className="block text-sm"><span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">Status</span>
            <select name="status" defaultValue={st?.status ?? ""} required className="field w-full"><option value="" disabled>Choose…</option>{Object.entries(RELATIONSHIP_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="block text-sm"><span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">Since (optional)</span><input name="since" type="date" defaultValue={st?.since ?? ""} className="field w-full" /></label>
          <button className="btn btn-gold btn-sm">Save</button>
        </MemberForm>
        {viewer.experiences.includes("relationships") && <Link href="/app/relationships/status" className="mt-4 inline-block text-sm text-gold underline">Support for relationship changes and leaving a shared space →</Link>}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {more.map((m) => (
          <Link key={m.href} href={m.href} className="glass lift block p-5"><span className="block font-semibold">{m.title}</span><span className="mt-1 block text-sm text-muted">{m.line}</span></Link>
        ))}
      </section>
    </div>
  );
}
