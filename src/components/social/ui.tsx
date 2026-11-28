import Link from "next/link";
import { ActionForm } from "@/components/admin/ActionForm";
import { MemberMarks } from "@/components/MembershipEmblem";
import { addComment, createPost, postAction, reportContent } from "@/app/actions/social";
import { EVENT_CATEGORY_LABEL, EVENT_ORIGIN_LABEL, POST_KINDS, REPORT_REASONS } from "@/lib/social";
import type { Feed, Person } from "@/lib/social-server";
import { formatEventTime } from "@/lib/social-server";

export function Avatar({ name, url, size = 44 }: { name: string | null; url?: string | null; size?: number }) {
  const initials = (name ?? "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return url
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={url} alt="" width={size} height={size} className="shrink-0 rounded-full border border-gold/40 object-cover" style={{ width: size, height: size }} />
    : <span aria-hidden="true" className="flex shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold/10 font-semibold text-gold-deep" style={{ width: size, height: size, fontSize: size * 0.36 }}>{initials}</span>;
}

export function PersonName({ p, id }: { p?: Person; id: string }) {
  return (
    <Link href={`/app/connect/members/${id}`} className="inline-flex items-center gap-1.5 font-semibold hover:underline">
      {p?.display_name ?? "Member"}<MemberMarks distinction={p?.distinction ?? (p?.elite ? "elite" : null)} verified={p?.verified} size={14} />
    </Link>
  );
}

export function ReportMenu({ type, id, label = "Report" }: { type: string; id: string; label?: string }) {
  return (
    <details className="relative">
      <summary className="cursor-pointer list-none text-xs text-faint hover:text-text">{label}</summary>
      <ActionForm action={reportContent} className="absolute right-0 z-20 mt-2 w-64 space-y-2 rounded-2xl border border-line bg-[var(--surface,#fffdf9)] p-3 text-xs shadow-xl">
        <input type="hidden" name="type" value={type} /><input type="hidden" name="id" value={id} />
        <select name="reason" required defaultValue="" className="field w-full text-xs"><option value="" disabled>Why are you reporting this?</option>{REPORT_REASONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <textarea name="details" rows={2} maxLength={2000} className="field w-full text-xs" placeholder="Anything we should know (optional)" />
        <button className="btn btn-ghost btn-sm w-full">Send privately</button>
      </ActionForm>
    </details>
  );
}

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now"; if (m < 60) return `${m}m`; const h = Math.round(m / 60); if (h < 24) return `${h}h`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export function PostCard({ post, feed, viewerId, showComments = false, comments = [] }: { post: Feed["posts"][number]; feed: Feed; viewerId: string; showComments?: boolean;
  comments?: { id: string; author_id: string; body: string; created_at: string }[] }) {
  const a = feed.authors[post.author_id];
  const c = feed.counts[post.id];
  const ev = post.event_id ? feed.events[post.event_id] : null;
  const circle = post.circle_id ? feed.circles[post.circle_id] : null;
  const kind = POST_KINDS.find(([k]) => k === post.kind)?.[1];
  return (
    <article className="glass !p-0 overflow-hidden">
      <header className="flex items-start gap-3 px-5 pt-5">
        <Avatar name={a?.display_name ?? null} url={a?.avatar_path ? feed.urls[a.avatar_path] : null} />
        <div className="min-w-0 flex-1">
          <PersonName p={a} id={post.author_id} />
          <p className="text-xs text-faint">
            {a?.headline ? `${a.headline} · ` : ""}{ago(post.created_at)}
            {circle ? <> · in <Link href={`/app/connect/circles/${circle.slug}`} className="underline">{circle.name}</Link></> : post.audience === "connections" ? " · connections" : ""}
            {kind && post.kind !== "thought" ? ` · ${kind}` : ""}
          </p>
        </div>
        {post.author_id !== viewerId && <ReportMenu type="post" id={post.id} />}
      </header>
      {post.body && <p className="whitespace-pre-wrap px-5 pt-3 leading-relaxed">{post.body}</p>}
      {post.photo_path && feed.urls[post.photo_path] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={feed.urls[post.photo_path]} alt="" className="mt-4 max-h-[520px] w-full object-cover" />
      )}
      {ev && (
        <Link href={`/app/connect/events/${ev.id}`} className="mx-5 mt-4 block rounded-2xl border border-gold/40 bg-gold/5 p-4 transition hover:border-gold">
          <p className="text-[0.65rem] uppercase tracking-[0.18em] text-gold-deep">{EVENT_CATEGORY_LABEL[ev.category]} · {EVENT_ORIGIN_LABEL[ev.origin]}</p>
          <p className="display mt-1 text-2xl">{ev.title}</p>
          <p className="mt-1 text-xs text-muted">{formatEventTime(ev.starts_at, ev.timezone)} · {ev.mode === "virtual" ? "Virtual" : [ev.city, ev.country].filter(Boolean).join(", ")}</p>
        </Link>
      )}
      <footer className="mt-4 flex items-center justify-between gap-2 border-t border-line px-3 py-2 text-sm">
        <ActionForm action={postAction}><input type="hidden" name="id" value={post.id} /><input type="hidden" name="op" value="appreciate" />
          <button className={`rounded-full px-3 py-1.5 transition hover:bg-gold/10 ${feed.appreciated.has(post.id) ? "font-semibold text-[#c8701a]" : ""}`}>♡ Appreciate{c?.appreciations ? ` · ${c.appreciations}` : ""}</button></ActionForm>
        <Link href={`/app/connect/posts/${post.id}`} className="rounded-full px-3 py-1.5 hover:bg-gold/10">Discuss{c?.comments ? ` · ${c.comments}` : ""}</Link>
        <ActionForm action={postAction}><input type="hidden" name="id" value={post.id} /><input type="hidden" name="op" value="save" />
          <button className={`rounded-full px-3 py-1.5 hover:bg-gold/10 ${feed.saved.has(post.id) ? "font-semibold text-[#c8701a]" : ""}`}>{feed.saved.has(post.id) ? "Saved" : "Save"}</button></ActionForm>
        {post.author_id === viewerId && <ActionForm action={postAction}><input type="hidden" name="id" value={post.id} /><input type="hidden" name="op" value="delete" /><button className="rounded-full px-3 py-1.5 text-xs text-faint hover:text-danger">Delete</button></ActionForm>}
      </footer>
      {showComments && (
        <section className="border-t border-line px-5 py-4">
          <ul className="space-y-3">
            {comments.map((cm) => (
              <li key={cm.id} className="flex gap-3 text-sm">
                <Avatar name={feed.authors[cm.author_id]?.display_name ?? null} url={feed.authors[cm.author_id]?.avatar_path ? feed.urls[feed.authors[cm.author_id]!.avatar_path!] : null} size={30} />
                <div className="min-w-0 flex-1"><PersonName p={feed.authors[cm.author_id]} id={cm.author_id} /> <span className="text-xs text-faint">{ago(cm.created_at)}</span><p className="whitespace-pre-wrap">{cm.body}</p></div>
                {cm.author_id !== viewerId && <ReportMenu type="comment" id={cm.id} />}
              </li>
            ))}
          </ul>
          <ActionForm action={addComment} className="mt-4 flex gap-2"><input type="hidden" name="post_id" value={post.id} />
            <input name="body" maxLength={2000} required placeholder="Add to the conversation" className="field flex-1" /><button className="btn btn-gold btn-sm">Post</button></ActionForm>
        </section>
      )}
    </article>
  );
}

export function Composer({ circles, fixedCircle, placeholder = "What's on your mind today?" }: { circles: { id: string; name: string }[]; fixedCircle?: string; placeholder?: string }) {
  return (
    <ActionForm action={createPost} className="glass space-y-3 p-5">
      <textarea name="body" rows={3} maxLength={4000} placeholder={placeholder} className="field w-full" aria-label="Write a post" />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="cursor-pointer rounded-full border border-line px-3 py-1.5 hover:border-gold/60">📷 Photo<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" className="sr-only" /></label>
        <select name="kind" defaultValue="thought" className="field !w-auto !py-1.5 text-sm" aria-label="Kind of post">{POST_KINDS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        {fixedCircle ? <input type="hidden" name="audience" value={`circle:${fixedCircle}`} /> : (
          <select name="audience" defaultValue="members" className="field !w-auto !py-1.5 text-sm" aria-label="Who can see this">
            <option value="members">All members</option><option value="connections">My connections</option>
            {circles.map((c) => <option key={c.id} value={`circle:${c.id}`}>{c.name}</option>)}
          </select>
        )}
        <Link href="/app/connect/events/new" className="rounded-full border border-line px-3 py-1.5 hover:border-gold/60">📅 Event</Link>
        <button className="btn btn-gold btn-sm ml-auto">Share</button>
      </div>
      <p className="text-[0.7rem] text-faint">Location details are removed from photos. Please share kindly; reports are reviewed privately.</p>
    </ActionForm>
  );
}
