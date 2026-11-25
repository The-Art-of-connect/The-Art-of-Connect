import Link from "next/link";
import { notFound } from "next/navigation";
import { requireExperience } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatWhen, publicWebinarUrl } from "@/lib/webinars";
import { cancelWebinar, markQuestionAnswered } from "@/app/actions/webinars";
import { ActionForm } from "@/components/admin/ActionForm";
import { ShareKit } from "@/components/ShareKit";
import { WebinarForm } from "@/components/WebinarForm";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  draft: "Draft — not yet submitted", submitted: "Submitted — awaiting review", changes_requested: "Changes requested", approved: "Approved and published",
  canceled: "Canceled", completed: "Completed", rejected: "Not approved",
};

export default async function ManageWebinar({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { viewer } = await requireExperience("business");
  const { id } = await params;
  const saved = (await searchParams).saved;
  const supabase = (await createClient())!;
  const biz = supabase.schema("business");
  const { data: w } = await biz.from("webinars").select("*").eq("id", id).eq("host_id", viewer.id).maybeSingle();
  if (!w) notFound();
  const [{ data: priv }, { data: topics }, { data: industries }, { data: questions }, analytics] = await Promise.all([
    biz.from("webinar_private").select("join_url").eq("webinar_id", id).maybeSingle(),
    biz.from("webinar_topics").select("slug, name").eq("is_active", true).order("sort_order"),
    biz.from("industries").select("slug, name").eq("is_active", true).order("sort_order"),
    biz.from("webinar_questions").select("id, body, answered, created_at").eq("webinar_id", id).order("created_at"),
    biz.rpc("webinar_analytics", { webinar: id }),
  ]);
  const a = (analytics.data ?? {}) as { registered?: number; attended?: number; rating?: number | null; visits_by_source?: Record<string, number>; registrations_by_source?: Record<string, number> };
  const { date, time } = formatWhen(w.starts_at, w.time_zone);
  const url = publicWebinarUrl(id);
  const live = w.status === "approved";

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/app/business/learn" className="text-sm text-gold">← The Knowledge Exchange</Link>
      <h1 className="display mt-4 text-4xl">{w.title}</h1>
      <p className="mt-2 text-muted">{date} · {time}</p>
      <p className="mt-3"><span className="chip normal-case tracking-normal">{STATUS[w.status] ?? w.status}</span></p>
      {saved === "submitted" && <p className="mt-4 rounded-2xl border border-success/40 bg-success/10 p-4 text-sm text-success">Submitted. Our team reviews every webinar before it’s published.</p>}
      {w.review_note && w.status !== "approved" && <p className="mt-4 rounded-2xl border border-champagne/50 bg-champagne/10 p-4 text-sm"><strong>Reviewer note:</strong> {w.review_note}</p>}

      {live ? (
        <section className="theme-dark band mt-6 rounded-[24px] p-7">
          <h2 className="display text-3xl">Share your webinar</h2>
          <p className="mt-1 text-sm text-muted">Every link and QR code leads to your webinar page on The Art of Connect, where visitors register — and can create a free account to attend.</p>
          <div className="mt-5"><ShareKit url={url} title={w.title} /></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <a href={`/webinars-media/${id}/flyer?format=square`} download className="btn btn-ghost btn-sm">Square graphic</a>
            <a href={`/webinars-media/${id}/flyer?format=portrait`} download className="btn btn-ghost btn-sm">Portrait (stories)</a>
            <a href={`/webinars-media/${id}/flyer?format=landscape`} download className="btn btn-ghost btn-sm">Landscape</a>
            <a href={`/webinars-media/${id}/qr`} download className="btn btn-ghost btn-sm">QR code</a>
          </div>
        </section>
      ) : (
        <p className="mt-6 rounded-2xl border border-line p-4 text-sm text-muted">Sharing links, QR codes and promotional graphics become available once your webinar is approved.</p>
      )}

      {live && (
        <section className="glass mt-6 grid gap-4 p-7 sm:grid-cols-3">
          <div><p className="text-xs tracking-[0.2em] text-faint uppercase">Registered</p><p className="display text-4xl">{a.registered ?? 0}</p></div>
          <div><p className="text-xs tracking-[0.2em] text-faint uppercase">Attended</p><p className="display text-4xl">{a.attended ?? 0}</p></div>
          <div><p className="text-xs tracking-[0.2em] text-faint uppercase">Rating</p><p className="display text-4xl">{a.rating ?? "—"}</p></div>
          <div className="sm:col-span-3 text-sm text-muted">
            Page visits by source: {Object.entries(a.visits_by_source ?? {}).map(([k, v]) => `${k} ${v}`).join(" · ") || "none yet"}<br />
            Registrations by source: {Object.entries(a.registrations_by_source ?? {}).map(([k, v]) => `${k} ${v}`).join(" · ") || "none yet"}
          </div>
          <p className="text-xs text-faint sm:col-span-3">For privacy, attendees’ names, contact details and business assessments aren’t shared with hosts.</p>
        </section>
      )}

      {questions && questions.length > 0 && (
        <section className="glass mt-6 p-7">
          <h2 className="text-lg font-semibold">Questions from registrants</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {questions.map((q) => (
              <li key={q.id} className="flex items-start justify-between gap-3 py-3">
                <span className={q.answered ? "text-muted line-through" : ""}>{q.body}</span>
                {!q.answered && <ActionForm action={markQuestionAnswered}><input type="hidden" name="id" value={id} /><input type="hidden" name="qid" value={q.id} /><button className="text-xs text-gold underline">Answered</button></ActionForm>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!["canceled", "completed", "rejected"].includes(w.status) && (
        <>
          <h2 className="display mt-10 text-3xl">Edit webinar</h2>
          <div className="mt-4"><WebinarForm w={w} topics={topics ?? []} industries={industries ?? []} joinUrl={priv?.join_url} /></div>
          <ActionForm action={cancelWebinar} className="mt-6 text-right">
            <input type="hidden" name="id" value={id} />
            <button className="text-sm text-danger underline">Cancel this webinar</button>
          </ActionForm>
        </>
      )}
    </div>
  );
}
