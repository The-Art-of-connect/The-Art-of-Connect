import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MemberForm } from "@/components/MemberForm";
import { markAllRead, savePrefs } from "@/app/actions/message-center";

export const dynamic = "force-dynamic";
export const metadata = { title: "Message Center" };

const KIND: Record<string, string> = { live_qa: "Live Q&A", milestone: "Milestone", growth_report: "Growth reflection", system: "From The Art of Connect" };

/** Message Center (directives 43 and 45): invitations, milestone acknowledgments and growth reflections, in one place. */
export default async function MessageCenter() {
  const viewer = (await getViewer())!;
  const db = isInsidePreview(viewer) ? null : await createClient();
  const [{ data: notices }, { data: prefs }] = db
    ? await Promise.all([
        db.from("member_notices").select("id, kind, title, body, href, created_at, read_at").order("created_at", { ascending: false }).limit(50),
        db.from("notification_prefs").select("live_qa_popup, live_qa_message, milestones, growth_reports").eq("user_id", viewer.id).maybeSingle(),
      ])
    : [{ data: [] }, { data: null }];
  const list = notices ?? [];
  const p = { live_qa_popup: prefs?.live_qa_popup ?? true, live_qa_message: prefs?.live_qa_message ?? true, milestones: prefs?.milestones ?? true, growth_reports: prefs?.growth_reports ?? true };
  return (
    <div className="mx-auto max-w-3xl">
      <p className="eyebrow">My World</p>
      <h1 className="display mt-3 text-4xl">Message Center</h1>
      <p className="mt-2 text-sm text-muted">Invitations, milestones and reflections from The Art of Connect. Messages from other members are in <Link href="/app/connect/messages" className="text-gold underline">Messages</Link>.</p>
      {list.some((n) => !n.read_at) && <MemberForm action={markAllRead} className="mt-4"><button className="btn btn-ghost btn-sm">Mark all as read</button></MemberForm>}
      {list.length === 0 ? <p className="glass mt-6 p-6 text-sm text-muted">Nothing new. When a Live Q&amp;A begins or you reach a milestone, you&rsquo;ll find it here.</p> : (
        <ul className="glass mt-6 divide-y divide-line">{list.map((n) => (
          <li key={n.id} className={`px-5 py-4 ${n.read_at ? "" : "bg-gold/5"}`}>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-gold-deep">{KIND[n.kind] ?? n.kind} · {new Date(n.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p>
            <p className="mt-1 font-semibold">{n.title}</p>
            {n.body && <p className="text-sm text-muted">{n.body}</p>}
            {n.href && <Link href={n.href} className="btn btn-gold btn-sm mt-3">{n.kind === "live_qa" ? "Join Live Q&A" : "Open"}</Link>}
          </li>
        ))}</ul>
      )}
      <section className="glass mt-8 p-6">
        <h2 className="display text-2xl">Notification preferences</h2>
        <MemberForm action={savePrefs} className="mt-4 space-y-3 text-sm">
          {[["live_qa_popup", "Show a pop-up when a Live Q&A begins", p.live_qa_popup], ["live_qa_message", "Keep Live Q&A invitations here", p.live_qa_message], ["milestones", "Milestone acknowledgments", p.milestones], ["growth_reports", "Growth reflections", p.growth_reports]].map(([k, label, on]) => (
            <label key={String(k)} className="flex items-center gap-3"><input type="checkbox" name={String(k)} defaultChecked={Boolean(on)} />{String(label)}</label>
          ))}
          <button className="btn btn-gold btn-sm">Save preferences</button>
        </MemberForm>
      </section>
    </div>
  );
}
