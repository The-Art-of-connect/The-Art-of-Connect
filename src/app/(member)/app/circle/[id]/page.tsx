import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { joinLive } from "@/app/actions/message-center";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CATEGORY_LABEL, topicOpen, type Topic } from "@/lib/circle";
import { Notice } from "@/components/Lux";
import { MemberForm } from "@/components/MemberForm";
import { LocalTime } from "@/components/LocalTime";
import { ModeratorHeartbeat } from "@/components/ModeratorHeartbeat";
import { createPoll, deleteMyPost, moderateCircle, postToCircle, reportCircle, votePoll } from "@/app/actions/circle";

export const dynamic = "force-dynamic";

type Post = { id: string; author_id: string; kind: string; body: string; status: string; highlighted: boolean; created_at: string };
const KIND_LABEL: Record<string, string> = { perspective: "Perspective", question: "Question", comment: "Comment" };

/** A Becoming Circle discussion room: written participation, polls and human moderation (live audio is phase two). */
export default async function CircleRoom({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const viewer = (await getViewer())!;
  const db = (await createClient())!;
  const { data: t } = await db.from("circle_topics").select("id, title, prompt, category, slot_start, open_hours, paused, closed_at, room, status").eq("id", id).maybeSingle();
  if (!t) notFound();
  const topic = t as Topic;
  const live = !isInsidePreview(viewer) && !viewer.viewAs;
  const [{ data: posts }, { data: polls }, { data: present }, { data: isMod }, { data: myVotes }] = await Promise.all([
    db.from("circle_posts").select("id, author_id, kind, body, status, highlighted, created_at").eq("topic_id", id).order("created_at", { ascending: true }).limit(400),
    db.from("circle_polls").select("id, question, options, closed").eq("topic_id", id).order("created_at"),
    db.rpc("circle_moderator_present", { p_topic: id }),
    live ? db.rpc("circle_is_moderator", { p: viewer.id }) : Promise.resolve({ data: false }),
    live ? db.from("circle_poll_votes").select("poll_id, option_index").eq("user_id", viewer.id) : Promise.resolve({ data: [] }),
  ]);
  const list = (posts ?? []) as Post[];
  // Live Q&A (directive 43): this topic's live session, if any, and whether the member has joined.
  const { data: session } = await db.from("circle_live_sessions").select("id, status, starts_at, ends_at, host_id").eq("topic_id", id).maybeSingle();
  const { data: mine } = session && live ? await db.from("circle_live_attendance").select("mode").eq("session_id", session.id).eq("user_id", viewer.id).maybeSingle() : { data: null };
  const { data: hostRow } = session?.host_id ? await (createAdminClient() ?? db).from("profiles").select("display_name").eq("id", session.host_id).maybeSingle() : { data: null };
  const host = (hostRow?.display_name ?? "").split(/\s+/)[0] || "The Becoming Circle host";
  // First names only: members meet each other through ideas, without profiles or contact details.
  const admin = createAdminClient();
  const ids = [...new Set(list.map((p) => p.author_id))];
  const { data: names } = admin && ids.length ? await admin.from("profiles").select("id, display_name").in("id", ids) : { data: [] };
  const first = Object.fromEntries(((names ?? []) as { id: string; display_name: string | null }[]).map((n) => [n.id, (n.display_name ?? "Member").split(/\s+/)[0]]));
  const results = await Promise.all((polls ?? []).map(async (p) => ({ id: p.id, rows: ((await db.rpc("circle_poll_results", { p_poll: p.id })).data ?? []) as { option_index: number; votes: number }[] })));
  const tally: Record<string, { option_index: number; votes: number }[]> = Object.fromEntries(results.map((r) => [r.id, r.rows]));
  const voted = Object.fromEntries(((myVotes ?? []) as { poll_id: string; option_index: number }[]).map((v) => [v.poll_id, v.option_index]));
  const open = topicOpen(topic);
  const moderator = Boolean(isMod);
  const notStarted = topic.slot_start && Date.parse(topic.slot_start) > Date.now();
  const ordered = [...list.filter((p) => p.highlighted), ...list.filter((p) => !p.highlighted)];

  const Mod = ({ action, label, postId, userId }: { action: string; label: string; postId?: string; userId?: string }) => (
    <MemberForm action={moderateCircle}>
      <input type="hidden" name="action" value={action} /><input type="hidden" name="topic_id" value={id} />
      {postId && <input type="hidden" name="post_id" value={postId} />}{userId && <input type="hidden" name="user_id" value={userId} />}
      <button className="text-xs text-muted underline">{label}</button>
    </MemberForm>
  );

  return (
    <>
      {moderator && <ModeratorHeartbeat topicId={id} />}
      <Link href="/app/circle" className="text-sm text-gold">← The Becoming Circle</Link>
      <section className="theme-dark mt-4 rounded-[28px] p-7 sm:p-9" style={{ background: "#241c17" }}>
        <p className="text-xs uppercase tracking-[0.2em] text-[#f0c98a]">The Becoming Circle · {CATEGORY_LABEL[topic.category]}</p>
        <h1 className="display mt-3 text-4xl text-[#f6e7c8] sm:text-5xl">{topic.title}</h1>
        <p className="mt-4 max-w-3xl text-ivory/85">{topic.prompt}</p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          {present ? <span className="text-[#f0c98a]">🛡 Authorized moderator present</span> : <span className="text-ivory/60">Written discussion · moderators review reports</span>}
          <span className="text-ivory/60">·</span>
          <span className="text-ivory/70">{notStarted ? <>Opens <LocalTime iso={topic.slot_start!} /></> : open ? "Open for comments" : topic.paused ? "Paused by a moderator" : "Closed"}</span>
        </div>
        {session?.status === "live" ? (
          <div className="mt-5 rounded-2xl border border-[#f0c98a]/30 p-4">
            <p className="flex flex-wrap items-center gap-2 text-sm"><span className="rounded-full bg-[#b3261e] px-3 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-white">Live now</span><span className="text-ivory/80">Live Q&amp;A hosted by {host} · until <LocalTime iso={session.ends_at} /></span></p>
            {mine ? <p className="mt-3 text-sm text-[#f0c98a]">You&rsquo;re here{mine.mode === "listen" ? ", listening" : ""}. Stay as long as you like; a new session never moves you.</p> : (
              <div className="mt-3 flex flex-wrap gap-2">
                <MemberForm action={joinLive}><input type="hidden" name="session" value={session.id} /><input type="hidden" name="mode" value="participate" /><button className="btn btn-gold btn-sm">Join to participate</button></MemberForm>
                <MemberForm action={joinLive}><input type="hidden" name="session" value={session.id} /><input type="hidden" name="mode" value="listen" /><button className="btn btn-ghost btn-sm">Simply listen</button></MemberForm>
              </div>
            )}
            <p className="mt-3 text-xs text-ivory/50">Questions and answers happen in writing below. Live audio opens once approved. This is an educational discussion, not professional counseling; for personal support, visit the <Link href="/app/wellness" className="underline">Counseling &amp; Wellness Center</Link>.</p>
          </div>
        ) : session?.status === "scheduled" ? <p className="mt-4 text-xs text-ivory/60">Live Q&amp;A begins <LocalTime iso={session.starts_at} />, hosted by {host}.</p>
          : <p className="mt-4 text-xs text-ivory/50">Live audio with moderated two-minute speaking turns is coming soon. Until then, join in writing.</p>}
      </section>

      {moderator && (
        <div className="mt-6 rounded-2xl border border-gold/40 bg-gold/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-deep">Moderator tools · every action is recorded</p>
          <div className="mt-3 flex flex-wrap gap-4">
            {topic.paused ? <Mod action="resume" label="Resume discussion" /> : <Mod action="pause" label="Pause discussion" />}
            {topic.closed_at ? <Mod action="reopen" label="Reopen" /> : <Mod action="close" label="Close discussion" />}
            <Mod action="escalate" label="Escalate a safety concern" />
          </div>
          <MemberForm action={createPoll} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input type="hidden" name="topic_id" value={id} />
            <input name="question" maxLength={300} className="field" placeholder="Poll question" />
            <textarea name="options" rows={2} className="field" placeholder={"Answers, one per line"} />
            <button className="btn btn-ghost btn-sm">Create poll</button>
          </MemberForm>
        </div>
      )}

      {(polls ?? []).length > 0 && (
        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {(polls ?? []).map((p) => {
            const rows = tally[p.id] ?? [];
            const total = rows.reduce((a, r) => a + Number(r.votes), 0);
            return (
              <div key={p.id} className="glass p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-gold-deep">Poll</p>
                <p className="mt-1 font-semibold">{p.question}</p>
                {voted[p.id] !== undefined || p.closed ? (
                  <ul className="mt-3 space-y-2 text-sm">{(p.options as string[]).map((o, i) => {
                    const n = Number(rows.find((r) => r.option_index === i)?.votes ?? 0);
                    return <li key={i}><div className="flex justify-between"><span>{o}{voted[p.id] === i ? " (your vote)" : ""}</span><span className="text-muted">{total ? Math.round((100 * n) / total) : 0}%</span></div><div className="mt-1 h-1.5 rounded-full bg-gold/15"><div className="h-full rounded-full bg-gold" style={{ width: `${total ? (100 * n) / total : 0}%` }} /></div></li>;
                  })}<li className="text-xs text-faint">{total} vote{total === 1 ? "" : "s"}</li></ul>
                ) : (
                  <MemberForm action={votePoll} className="mt-3 space-y-2">
                    <input type="hidden" name="poll_id" value={p.id} /><input type="hidden" name="topic_id" value={id} />
                    {(p.options as string[]).map((o, i) => <label key={i} className="flex items-center gap-2 text-sm"><input type="radio" name="option" value={i} required className="accent-[var(--champagne)]" />{o}</label>)}
                    <button className="btn btn-ghost btn-sm">Vote</button>
                  </MemberForm>
                )}
              </div>
            );
          })}
        </section>
      )}

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div>
          <h2 className="display text-3xl">The conversation</h2>
          <ul className="mt-4 space-y-3">
            {ordered.map((p) => (
              <li key={p.id} className={`glass p-5 ${p.highlighted ? "border-gold" : ""} ${p.status !== "visible" ? "opacity-60" : ""}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span><span className="font-semibold text-text">{first[p.author_id] ?? "Member"}</span> · <span className="text-gold-deep">{KIND_LABEL[p.kind]}</span>{p.highlighted ? " · Highlighted by the moderator" : ""}{p.status !== "visible" ? ` · ${p.status}` : ""}</span>
                  <LocalTime iso={p.created_at} />
                </div>
                <p className="mt-2 whitespace-pre-line text-sm">{p.body}</p>
                <div className="mt-3 flex flex-wrap gap-4">
                  {p.author_id === viewer.id ? (
                    <MemberForm action={deleteMyPost}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="topic_id" value={id} /><button className="text-xs text-muted underline">Delete</button></MemberForm>
                  ) : live && (
                    <details className="text-xs"><summary className="cursor-pointer text-muted underline">Report</summary>
                      <MemberForm action={reportCircle} className="mt-2 flex flex-wrap gap-2">
                        <input type="hidden" name="topic_id" value={id} /><input type="hidden" name="post_id" value={p.id} />
                        <select name="reason" className="field !min-h-9 text-xs"><option value="harassment">Harassment or disrespect</option><option value="threat">Threat</option><option value="discrimination">Discrimination</option><option value="personal-information">Personal information</option><option value="fraud">Fraud or solicitation</option><option value="misinformation">Misinformation</option><option value="other">Something else</option></select>
                        <button className="btn btn-ghost btn-sm">Send report</button>
                      </MemberForm>
                    </details>
                  )}
                  {moderator && (
                    <>
                      <Mod action={p.status === "visible" ? "hide_post" : "restore_post"} label={p.status === "visible" ? "Hide" : "Restore"} postId={p.id} />
                      <Mod action="highlight_post" label={p.highlighted ? "Unhighlight" : "Highlight"} postId={p.id} />
                      <Mod action="warn_user" label="Record a warning" userId={p.author_id} postId={p.id} />
                      <Mod action="remove_user" label="Remove participant" userId={p.author_id} postId={p.id} />
                    </>
                  )}
                </div>
              </li>
            ))}
            {!ordered.length && <li className="glass p-6 text-sm text-muted">{notStarted ? "This conversation hasn't begun yet." : "Be the first to share a perspective."}</li>}
          </ul>
        </div>
        <aside className="lg:sticky lg:top-28 lg:self-start">
          {open ? (
            <MemberForm action={postToCircle} className="glass space-y-3 p-6">
              <input type="hidden" name="topic_id" value={id} />
              <p className="display text-2xl">Share your voice</p>
              <select name="kind" className="field w-full" aria-label="Type"><option value="perspective">A perspective</option><option value="question">A question</option><option value="comment">A comment</option></select>
              <textarea name="body" required minLength={2} maxLength={1500} rows={5} className="field w-full" placeholder="Speak from your experience, with respect for others." />
              <label className="flex items-start gap-2 text-xs text-muted"><input type="checkbox" name="confirm_respectful" className="mt-0.5" />My words are respectful (only needed if we ask you to review them)</label>
              <button className="btn btn-gold w-full">Share</button>
              <p className="text-xs text-faint">Please don&rsquo;t share phone numbers, email or home addresses, or financial details. Your first name appears with your post.</p>
            </MemberForm>
          ) : (
            <p className="glass p-6 text-sm text-muted">{notStarted ? "You can join this conversation once it begins." : "This conversation isn't open for new comments."} <Link href="/app/circle" className="text-gold underline">See what&rsquo;s open now</Link></p>
          )}
        </aside>
      </section>
      <div className="mt-8"><Notice>Perspectives shared here are members&rsquo; own views, not advice. The Becoming Circle follows our Community Standards; if you are in crisis, call or text 988 (U.S.).</Notice></div>
    </>
  );
}
