import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/admin/ActionForm";
import { circleAction, startConversation } from "@/app/actions/social";
import { CIRCLE_KIND_LABEL, ELIGIBILITY_LABEL, EVENT_CATEGORY_LABEL, INTEREST_LABEL } from "@/lib/social";
import { formatEventTime, loadFeed, people, signPhotos } from "@/lib/social-server";
import { Avatar, Composer, PersonName, PostCard, ReportMenu } from "@/components/social/ui";
import { EliteBadge } from "@/components/EliteBadge";

/** The circle's own name in the browser tab (page-by-page audit). */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await createClient();
  const { data } = db ? await db.from("social_circles").select("name").eq("slug", slug).maybeSingle() : { data: null };
  return { title: data?.name ? `${data.name} · Circles` : "Circle" };
}

/** A circle's community: dashboard, feed, events, members, photos and group messaging. */
export default async function CirclePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { slug } = await params;
  const tab = (await searchParams).tab ?? "feed";
  const viewer = (await getViewer())!;
  const preview = isInsidePreview(viewer) || Boolean(viewer.viewAs);
  const db = (await createClient())!;
  const { data: c } = await db.from("social_circles").select("*").eq("slug", slug).maybeSingle();
  if (!c) notFound();
  const [{ data: membership }, { data: members }, { data: events }, { count }] = await Promise.all([
    preview ? Promise.resolve({ data: null }) : db.from("social_circle_members").select("role, notify").eq("circle_id", c.id).eq("user_id", viewer.id).maybeSingle(),
    db.from("social_circle_members").select("user_id, role").eq("circle_id", c.id).limit(200),
    db.from("social_events").select("id, title, starts_at, timezone, city, country, mode, category").eq("circle_id", c.id).eq("status", "active").gte("starts_at", new Date().toISOString()).order("starts_at").limit(10),
    db.from("social_circle_members").select("user_id", { count: "exact", head: true }).eq("circle_id", c.id),
  ]);
  const isMember = Boolean(membership);
  const feed = isMember ? await loadFeed(db, viewer.id, { circleId: c.id, limit: 50 }) : null;
  const dir = await people(db, (members ?? []).map((m) => m.user_id));
  const urls = await signPhotos(db, Object.values(dir).map((d) => d.avatar_path));
  const connectedMembers = (members ?? []).filter((m) => dir[m.user_id]?.connection_status === "accepted").map((m) => m.user_id);
  const TABS = [["feed", "Community feed"], ["events", "Events"], ["members", "Members"], ["photos", "Photographs"], ["messages", "Group messages"]] as const;

  return (
    <div className="space-y-6">
      <section className={`overflow-hidden rounded-[28px] p-6 sm:p-8 ${c.kind === "elite" ? "theme-dark" : "glass"}`} style={c.kind === "elite" ? { background: "#1b1310" } : undefined}>
        <Link href="/app/connect/circles" className="text-xs underline opacity-70">← All circles</Link>
        <p className="mt-3 text-[0.7rem] uppercase tracking-[0.2em] text-gold-deep">{CIRCLE_KIND_LABEL[c.kind]}{c.eligibility !== "all" ? ` · ${ELIGIBILITY_LABEL[c.eligibility]}` : ""}</p>
        <h1 className="display mt-2 flex items-center gap-3 text-4xl sm:text-5xl">{c.name}{c.kind === "elite" && <EliteBadge size={30} />}</h1>
        {c.tagline && <p className="mt-2 text-muted">{c.tagline}</p>}
        {c.description && <p className="mt-3 max-w-2xl text-sm">{c.description}</p>}
        <div className="mt-3 flex flex-wrap gap-2">{(c.interests ?? []).map((i: string) => <span key={i} className="rounded-full border border-line px-2.5 py-0.5 text-xs">{INTEREST_LABEL[i] ?? i}</span>)}</div>
        <p className="mt-3 text-sm text-muted">{count ?? 0} member{count === 1 ? "" : "s"}</p>
        {!preview && (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {isMember ? (
              <>
                <ActionForm action={circleAction} className="flex items-center gap-2 text-sm"><input type="hidden" name="circle_id" value={c.id} /><input type="hidden" name="op" value="notify" />
                  <label className="flex items-center gap-2"><input type="checkbox" name="notify" defaultChecked={membership?.notify} /> Updates from this circle</label><button className="btn btn-ghost btn-sm">Save</button></ActionForm>
                <ActionForm action={circleAction}><input type="hidden" name="circle_id" value={c.id} /><input type="hidden" name="op" value="leave" /><button className="btn btn-ghost btn-sm">Leave circle</button></ActionForm>
              </>
            ) : (
              <ActionForm action={circleAction}><input type="hidden" name="circle_id" value={c.id} /><input type="hidden" name="op" value="join" /><button className="btn btn-gold">Join this circle</button></ActionForm>
            )}
            <ReportMenu type="circle" id={c.id} />
          </div>
        )}
      </section>

      {!isMember ? <p className="glass p-6 text-sm text-muted">Join to see the community feed, events, members and group conversations. You can leave at any time.</p> : (
        <>
          <nav className="flex flex-wrap gap-2 text-sm">{TABS.map(([k, v]) => <Link key={k} href={`/app/connect/circles/${slug}?tab=${k}`} className={`rounded-full border px-3 py-1.5 ${tab === k ? "border-gold bg-gold/10 font-semibold" : "border-line"}`}>{v}</Link>)}</nav>

          {tab === "feed" && feed && (
            <div className="space-y-5">
              <Composer circles={[]} fixedCircle={c.id} placeholder={`Share with ${c.name}: a question, an idea, a recommendation…`} />
              {feed.posts.length === 0 ? <p className="text-sm text-muted">Start the conversation.</p> : feed.posts.map((p) => <PostCard key={p.id} post={p} feed={feed} viewerId={viewer.id} />)}
            </div>
          )}
          {tab === "events" && (
            <section className="space-y-3">
              <Link href={`/app/connect/events/new?circle=${c.id}`} className="btn btn-gold btn-sm">+ Share an event with this circle</Link>
              {(events ?? []).length === 0 ? <p className="text-sm text-muted">No upcoming events yet.</p> : (events ?? []).map((e) => (
                <Link key={e.id} href={`/app/connect/events/${e.id}`} className="glass block p-4 hover:border-gold"><p className="text-xs text-gold-deep">{EVENT_CATEGORY_LABEL[e.category]}</p><p className="display text-xl">{e.title}</p><p className="text-xs text-muted">{formatEventTime(e.starts_at, e.timezone)} · {e.mode === "virtual" ? "Virtual" : [e.city, e.country].filter(Boolean).join(", ")}</p></Link>
              ))}
            </section>
          )}
          {tab === "members" && (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{(members ?? []).map((m) => dir[m.user_id] || m.user_id === viewer.id ? (
              <li key={m.user_id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
                <Avatar name={dir[m.user_id]?.display_name ?? viewer.displayName} url={dir[m.user_id]?.avatar_path ? urls[dir[m.user_id]!.avatar_path!] : null} size={40} />
                <div><PersonName p={dir[m.user_id]} id={m.user_id} />{m.role === "host" && <p className="text-[0.65rem] uppercase tracking-wider text-gold-deep">Host</p>}</div>
              </li>
            ) : null)}</ul>
          )}
          {tab === "photos" && feed && (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">{feed.posts.filter((p) => p.photo_path && feed.urls[p.photo_path]).map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <li key={p.id}><Link href={`/app/connect/posts/${p.id}`}><img src={feed.urls[p.photo_path!]} alt="" className="aspect-square w-full rounded-xl object-cover" /></Link></li>
            ))}</ul>
          )}
          {tab === "messages" && (
            <ActionForm action={startConversation} className="glass space-y-3 p-5">
              <p className="text-sm">Start a private group conversation with circle members you&rsquo;re connected with.</p>
              {connectedMembers.length === 0 ? <p className="text-sm text-muted">Connect with members of this circle first; group messages include your connections only.</p> : (
                <>
                  <input name="title" maxLength={120} defaultValue={c.name} className="field w-full" />
                  <div className="grid gap-2 sm:grid-cols-2">{connectedMembers.map((uid) => <label key={uid} className="flex items-center gap-2 text-sm"><input type="checkbox" name="members" value={uid} /> {dir[uid]?.display_name}</label>)}</div>
                  <button className="btn btn-gold btn-sm">Start group conversation</button>
                </>
              )}
            </ActionForm>
          )}
        </>
      )}
    </div>
  );
}
