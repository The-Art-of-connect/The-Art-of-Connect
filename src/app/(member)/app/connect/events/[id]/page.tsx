import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/admin/ActionForm";
import { addComment, addEventToCouplesCalendar, eventOwnerAction, rsvpEvent, startConversation } from "@/app/actions/social";
import { ELIGIBILITY_LABEL, EVENT_CATEGORY_LABEL, EVENT_ORIGIN_LABEL } from "@/lib/social";
import { formatEventTime, people, signPhotos } from "@/lib/social-server";
import { Avatar, PersonName, ReportMenu } from "@/components/social/ui";

export const metadata = { title: "Event" };

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const viewer = (await getViewer())!;
  const preview = isInsidePreview(viewer) || Boolean(viewer.viewAs);
  const db = (await createClient())!;
  const { data: e } = await db.from("social_events").select("*").eq("id", id).maybeSingle();
  if (!e) notFound();
  const [{ data: mine }, { data: shared }, { data: counts }, { data: comments }, { data: couple }] = await Promise.all([
    preview ? Promise.resolve({ data: null }) : db.from("social_event_rsvps").select("*").eq("event_id", id).eq("user_id", viewer.id).maybeSingle(),
    db.from("social_event_rsvps").select("user_id, status, attend_with").eq("event_id", id).eq("share_attendance", true),
    db.rpc("social_event_counts", { p_events: [id] }),
    db.from("social_comments").select("id, author_id, body, created_at").eq("event_id", id).eq("status", "active").order("created_at"),
    preview ? Promise.resolve({ data: null }) : db.schema("relationships").from("couple_members").select("couple_id").eq("user_id", viewer.id).maybeSingle(),
  ]);
  const c = ((counts ?? []) as { interested: number; attending: number; attend_with: number }[])[0];
  const others = (shared ?? []).filter((r) => r.user_id !== viewer.id);
  const dir = await people(db, [e.created_by, ...others.map((r) => r.user_id), ...(comments ?? []).map((x) => x.author_id)].filter(Boolean) as string[]);
  const urls = await signPhotos(db, [e.photo_path, ...Object.values(dir).map((d) => d.avatar_path)]);
  const connectedAttendees = others.filter((r) => dir[r.user_id]?.connection_status === "accepted").map((r) => r.user_id);
  const where = e.mode === "virtual" ? "Virtual" : [e.venue, e.city, e.region, e.country].filter(Boolean).join(", ");
  const mineOwner = e.created_by === viewer.id;

  return (
    <div className="space-y-6">
      <Link href="/app/connect/events" className="text-sm text-gold underline">← The Connect Calendar</Link>
      <article className="glass overflow-hidden !p-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {e.photo_path && urls[e.photo_path] && <img src={urls[e.photo_path]} alt="" className="max-h-96 w-full object-cover" />}
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="text-[0.7rem] uppercase tracking-[0.18em] text-gold-deep">{EVENT_CATEGORY_LABEL[e.category]} · {EVENT_ORIGIN_LABEL[e.origin]}</p>
            {!mineOwner && !preview && <ReportMenu type="event" id={e.id} />}
          </div>
          {e.status === "canceled" && <p className="mt-2 rounded-xl bg-danger/10 p-2 text-sm text-danger">This event has been canceled.</p>}
          <h1 className="display mt-2 text-4xl">{e.title}</h1>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-faint">When</dt><dd>{formatEventTime(e.starts_at, e.timezone)}{e.ends_at ? ` – ${formatEventTime(e.ends_at, e.timezone)}` : ""}</dd></div>
            <div><dt className="text-xs text-faint">Where</dt><dd>{where || "To be announced"}{e.mode === "hybrid" ? " · also virtual" : ""}</dd></div>
            <div><dt className="text-xs text-faint">Admission</dt><dd>{e.is_free ? "Free" : e.cost_text ?? "Admission charged by the organizer"}</dd></div>
            <div><dt className="text-xs text-faint">Organizer</dt><dd>{e.organizer_name ?? "—"}{e.origin === "shared_external" && e.created_by && <span className="text-xs text-muted"> · shared by <PersonName p={dir[e.created_by]} id={e.created_by} /></span>}</dd></div>
            {e.eligibility !== "all" && <div><dt className="text-xs text-faint">For</dt><dd>{ELIGIBILITY_LABEL[e.eligibility]}</dd></div>}
          </dl>
          {e.description && <p className="mt-5 whitespace-pre-wrap leading-relaxed">{e.description}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            {e.url && <a href={e.url} target="_blank" rel="noopener noreferrer nofollow" className="btn btn-ghost btn-sm">Official event page ↗</a>}
            <a href={`/api/connect/events/${e.id}/ics`} className="btn btn-ghost btn-sm">Add to my calendar</a>
            {couple && !preview && <ActionForm action={addEventToCouplesCalendar}><input type="hidden" name="event_id" value={e.id} /><button className="btn btn-ghost btn-sm">Add to our couples calendar</button></ActionForm>}
            {mineOwner && e.status === "active" && <ActionForm action={eventOwnerAction}><input type="hidden" name="event_id" value={e.id} /><button className="btn btn-ghost btn-sm text-danger">Mark canceled</button></ActionForm>}
          </div>
          {e.url && <p className="mt-2 text-[0.7rem] text-faint">External link. Tickets and payments are handled by the organizer, never by The Art of Connect.</p>}
        </div>
      </article>

      {!preview && e.status === "active" && (
        <ActionForm action={rsvpEvent} className="glass space-y-3 p-5">
          <input type="hidden" name="event_id" value={e.id} />
          <p className="font-semibold">Are you interested?</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {[["interested", "I'm interested"], ["attending", "I'm going"], ["info_requested", "I'd like more information"], ["none", "Not for me"]].map(([k, v]) => (
              <label key={k} className="flex items-center gap-2"><input type="radio" name="status" value={k} defaultChecked={(mine?.status ?? "none") === k} /> {v}</label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="attend_with" defaultChecked={mine?.attend_with} /> I&rsquo;m looking for someone to attend with</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="share_attendance" defaultChecked={mine?.share_attendance} /> Show members that I&rsquo;m interested or going (otherwise it stays private)</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="remind" defaultChecked={mine?.remind} /> Remind me before it starts</label>
          <button className="btn btn-gold btn-sm">Save</button>
          <p className="text-xs text-muted">{c?.attending ?? 0} going · {c?.interested ?? 0} interested{c?.attend_with ? ` · ${c.attend_with} looking for someone to attend with` : ""}</p>
        </ActionForm>
      )}

      {others.length > 0 && (
        <section className="glass p-5">
          <h2 className="display text-2xl">Members who shared they&rsquo;re interested</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">{others.map((r) => (
            <li key={r.user_id} className="flex items-center gap-3">
              <Avatar name={dir[r.user_id]?.display_name ?? null} url={dir[r.user_id]?.avatar_path ? urls[dir[r.user_id]!.avatar_path!] : null} size={36} />
              <div><PersonName p={dir[r.user_id]} id={r.user_id} /><p className="text-xs text-muted">{r.status === "attending" ? "Going" : "Interested"}{r.attend_with ? " · looking for someone to attend with" : ""}</p></div>
            </li>
          ))}</ul>
          {connectedAttendees.length > 0 && (
            <ActionForm action={startConversation} className="mt-4 border-t border-line pt-4">
              <input type="hidden" name="event_id" value={e.id} /><input type="hidden" name="title" value={e.title} />
              {connectedAttendees.map((uid) => <input key={uid} type="hidden" name="members" value={uid} />)}
              <button className="btn btn-ghost btn-sm">Start a private event conversation with your connections here</button>
            </ActionForm>
          )}
        </section>
      )}

      <section className="glass p-5">
        <h2 className="display text-2xl">Discussion</h2>
        <ul className="mt-3 space-y-3">{(comments ?? []).map((cm) => (
          <li key={cm.id} className="flex gap-3 text-sm">
            <Avatar name={dir[cm.author_id]?.display_name ?? null} url={dir[cm.author_id]?.avatar_path ? urls[dir[cm.author_id]!.avatar_path!] : null} size={30} />
            <div className="min-w-0 flex-1"><PersonName p={dir[cm.author_id]} id={cm.author_id} /><p className="whitespace-pre-wrap">{cm.body}</p></div>
            {cm.author_id !== viewer.id && <ReportMenu type="comment" id={cm.id} />}
          </li>
        ))}</ul>
        {!preview && <ActionForm action={addComment} className="mt-4 flex gap-2"><input type="hidden" name="event_id" value={e.id} /><input name="body" required maxLength={2000} placeholder="Ask a question or share a thought" className="field flex-1" /><button className="btn btn-gold btn-sm">Post</button></ActionForm>}
      </section>
    </div>
  );
}
