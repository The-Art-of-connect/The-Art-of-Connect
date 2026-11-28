import Link from "next/link";
import { requireExperience, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MemberForm } from "@/components/MemberForm";
import { RELATIONSHIP_STATUS, TRANSITION_STAGES } from "@/lib/growth";
import { leaveCouple, setRelationshipStatus } from "@/app/actions/growth";
import { brandName } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const metadata = { title: "Relationship status · In Love" };

/**
 * Relationship status and transitions (directive 47). Private to the member. Changing status never changes a membership,
 * a business partnership or any record; leaving a shared space is the member's own choice and never needs permission.
 */
export default async function RelationshipStatus({ searchParams }: { searchParams: Promise<{ left?: string }> }) {
  const { viewer } = await requireExperience("relationships");
  const { left } = await searchParams;
  const db = isInsidePreview(viewer) ? null : await createClient();
  const rel = db?.schema("relationships");
  const [{ data: st }, { data: cm }] = rel ? await Promise.all([
    rel.from("status").select("status, since").eq("user_id", viewer.id).maybeSingle(),
    rel.from("couple_members").select("couple_id").eq("user_id", viewer.id).maybeSingle(),
  ]) : [{ data: null }, { data: null }];
  const transition = st && (TRANSITION_STAGES as readonly string[]).includes(st.status);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div><Link href="/app/relationships" className="text-sm text-gold">← {brandName("in-love")}</Link><h1 className="display mt-3 text-4xl">Your relationship status</h1>
        <p className="mt-2 text-sm text-muted">Private to you. Your membership, benefits, history and business partnerships never change because of it.</p></div>
      {left && <p role="status" className="rounded-2xl border border-gold/30 bg-gold/5 p-4 text-sm">You&rsquo;ve stepped away from the shared space. Your account, private reflections, growth records, Journey conversations and membership are unchanged. Take whatever time you need.</p>}
      <MemberForm action={setRelationshipStatus} className="glass grid gap-3 p-6 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <label className="block text-sm"><span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">Status</span>
          <select name="status" defaultValue={st?.status ?? ""} required className="field w-full"><option value="" disabled>Choose…</option>{Object.entries(RELATIONSHIP_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="block text-sm"><span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">Since (optional)</span><input name="since" type="date" defaultValue={st?.since ?? ""} className="field" /></label>
        <button className="btn btn-gold btn-sm">Save</button>
      </MemberForm>
      {transition && (
        <section className="glass p-6 text-sm">
          <h2 className="display text-2xl">Support for this season</h2>
          <p className="mt-2 text-muted">Change can be hard, even when it&rsquo;s right. There is no pressure here: not to reconcile, and not to begin anything new before you&rsquo;re ready.</p>
          <ul className="mt-3 grid gap-2">
            {[["/app/journey?topic=transition", "Talk with Journey", "Self-discovery, boundaries, confidence and independence, at your pace."], ["/app/wellness", brandName("counseling-center"), "Referrals to licensed counselors; attorneys and financial professionals when needed."], ["/app/know-yourself", brandName("art-of-knowing-yourself"), "Reconnect with who you are."], ["/app/connect360/rooms", brandName("deal-rooms"), "Business partnerships continue under their own permissions and agreements; restructuring needs professional review."]].map(([h, t, l]) => (
              <li key={h}><Link href={h} className="block rounded-xl border border-line px-4 py-3"><span className="font-semibold">{t}</span><span className="block text-muted">{l}</span></Link></li>
            ))}
          </ul>
        </section>
      )}
      {cm && (
        <section className="glass p-6 text-sm">
          <h2 className="display text-2xl">Step away from your shared space</h2>
          <p className="mt-2">You can leave at any time, on your own. When you do:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
            <li>You immediately lose access to the shared check-ins, goals and calendar.</li>
            <li>Your account, private reflections, growth records, milestones, Journey conversations and membership stay exactly as they are.</li>
            <li>Shared items you created remain part of the couple&rsquo;s history; your private items were never shared.</li>
            <li>Business Deal Rooms and partnerships are not affected.</li>
            <li>Singles matchmaking is not switched on. You choose if and when.</li>
          </ul>
          <MemberForm action={leaveCouple} className="mt-4 space-y-2">
            <label className="flex items-start gap-2"><input type="checkbox" name="confirm" required className="mt-1" /> I understand what changes.</label>
            <label className="flex items-start gap-2"><input type="checkbox" name="private" className="mt-1" /> <span>Leave privately: no message is sent to my partner. <span className="block text-muted">If you are not safe, call 911. Our safety team can help confidentially from the Safety page.</span></span></label>
            <button className="btn btn-ghost btn-sm">Step away from the shared space</button>
          </MemberForm>
        </section>
      )}
      {!cm && (
        <section className="glass p-6 text-sm">
          <h2 className="display text-2xl">When you&rsquo;re ready</h2>
          <p className="mt-2 text-muted">Your In Love profile stays private until you choose to be visible. Update your preferences and discovery whenever you like; your earlier answers are kept, never overwritten.</p>
          <div className="mt-3 flex flex-wrap gap-2"><Link href="/app/relationships/profile" className="btn btn-ghost btn-sm">My In Love preferences</Link><Link href="/app/safety" className="btn btn-ghost btn-sm">Safety and privacy</Link></div>
        </section>
      )}
    </div>
  );
}
