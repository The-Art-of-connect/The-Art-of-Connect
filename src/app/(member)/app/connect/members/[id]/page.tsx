import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/admin/ActionForm";
import { connectionAction, startConversation } from "@/app/actions/social";
import { INTEREST_LABEL, SEEKING, SEEKING_LABEL } from "@/lib/social";
import { loadFeed, people, signPhotos } from "@/lib/social-server";
import { Avatar, PostCard, ReportMenu } from "@/components/social/ui";
import { EliteBadge } from "@/components/EliteBadge";

export const metadata = { title: "Member profile" };

/** A member's profile as other members see it: only what they chose to share. Never age, finances or private answers. */
export default async function MemberProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const viewer = (await getViewer())!;
  if (isInsidePreview(viewer) || viewer.viewAs) return <p className="rounded-2xl border border-gold/40 bg-gold/10 p-4 text-sm">Preview: sign in with your own account.</p>;
  const db = (await createClient())!;
  const p = (await people(db, [id]))[id];
  if (!p && id !== viewer.id) notFound();
  const me = id === viewer.id;
  const [{ data: photos }, { data: follow }, feed] = await Promise.all([
    db.from("social_photos").select("id, path, caption").eq("user_id", id).eq("status", "active").order("created_at", { ascending: false }).limit(30),
    db.from("social_follows").select("followee_id").eq("follower_id", viewer.id).eq("followee_id", id).maybeSingle(),
    loadFeed(db, viewer.id, { limit: 20 }),
  ]);
  const self = me ? (await db.from("social_profiles").select("*").eq("user_id", id).maybeSingle()).data : null;
  const prof = p ?? (self ? { ...self, display_name: viewer.displayName, elite: false, connection_status: null, connection_direction: null, shared_interests: 0, shared_circles: 0 } : null);
  const urls = await signPhotos(db, [...(photos ?? []).map((x) => x.path), prof?.avatar_path]);
  const posts = feed.posts.filter((x) => x.author_id === id);
  const connected = p?.connection_status === "accepted";
  const location = [prof?.city, prof?.region, prof?.country].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      <section className="glass p-6 sm:p-8">
        <div className="flex flex-wrap items-start gap-5">
          <Avatar name={prof?.display_name ?? null} url={prof?.avatar_path ? urls[prof.avatar_path] : null} size={96} />
          <div className="min-w-0 flex-1">
            <h1 className="display flex items-center gap-2 text-4xl">{prof?.display_name ?? "Member"}{p?.elite && <EliteBadge size={26} />}</h1>
            {prof?.headline && <p className="mt-1 text-muted">{prof.headline}</p>}
            {location && <p className="mt-1 text-sm text-faint">{location}</p>}
          </div>
          {!me && <ReportMenu type="member" id={id} />}
        </div>
        {prof?.bio && <p className="mt-5 whitespace-pre-wrap leading-relaxed">{prof.bio}</p>}
        {(prof?.interests ?? []).length > 0 && <div className="mt-4 flex flex-wrap gap-2">{prof!.interests!.map((i: string) => <span key={i} className="rounded-full border border-line px-3 py-1 text-xs">{INTEREST_LABEL[i] ?? i}</span>)}</div>}
        {(prof?.seeking ?? []).length > 0 && <p className="mt-3 text-xs text-muted">Available for: {prof!.seeking!.map((x: string) => SEEKING_LABEL[x] ?? x).join(" · ")}</p>}

        {me ? <Link href="/app/connect/profile" className="btn btn-ghost btn-sm mt-5">Edit my profile</Link> : (
          <div className="mt-6 flex flex-wrap items-start gap-3">
            {connected ? (
              <>
                <ActionForm action={startConversation}><input type="hidden" name="members" value={id} /><button className="btn btn-gold btn-sm">Message</button></ActionForm>
                <ActionForm action={connectionAction}><input type="hidden" name="user_id" value={id} /><input type="hidden" name="op" value="remove" /><button className="btn btn-ghost btn-sm">Remove connection</button></ActionForm>
              </>
            ) : p?.connection_status === "pending" ? (
              p.connection_direction === "received" ? (
                <div className="flex gap-2">
                  <ActionForm action={connectionAction}><input type="hidden" name="user_id" value={id} /><input type="hidden" name="op" value="accept" /><button className="btn btn-gold btn-sm">Accept connection</button></ActionForm>
                  <ActionForm action={connectionAction}><input type="hidden" name="user_id" value={id} /><input type="hidden" name="op" value="decline" /><button className="btn btn-ghost btn-sm">Decline</button></ActionForm>
                </div>
              ) : <p className="text-sm text-muted">Connection request sent.</p>
            ) : p?.connection_status === "declined" ? null : (
              <ActionForm action={connectionAction} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="user_id" value={id} /><input type="hidden" name="op" value="request" />
                <select name="intention" required defaultValue="" className="field !w-auto !py-1.5 text-sm"><option value="" disabled>Connect for…</option>{SEEKING.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                <input name="note" maxLength={300} placeholder="A short, kind note (optional)" className="field !w-64 !py-1.5 text-sm" />
                <button className="btn btn-gold btn-sm">Request to connect</button>
              </ActionForm>
            )}
            <ActionForm action={connectionAction}><input type="hidden" name="user_id" value={id} /><input type="hidden" name="op" value="follow" /><button className="btn btn-ghost btn-sm">{follow ? "Following" : "Follow"}</button></ActionForm>
            <ActionForm action={connectionAction}><input type="hidden" name="user_id" value={id} /><input type="hidden" name="op" value="block" /><button className="btn btn-ghost btn-sm text-danger">Block</button></ActionForm>
          </div>
        )}
      </section>

      {(photos ?? []).length > 0 && (
        <section>
          <h2 className="display text-2xl">Photographs</h2>
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">{(photos ?? []).map((ph) => urls[ph.path] && (
            // eslint-disable-next-line @next/next/no-img-element
            <li key={ph.id}><img src={urls[ph.path]} alt={ph.caption ?? ""} className="aspect-square w-full rounded-xl object-cover" /></li>
          ))}</ul>
        </section>
      )}
      <section className="space-y-4">
        <h2 className="display text-2xl">Recent posts</h2>
        {posts.length === 0 ? <p className="text-sm text-muted">Nothing shared with you yet.</p> : posts.map((x) => <PostCard key={x.id} post={x} feed={feed} viewerId={viewer.id} />)}
      </section>
    </div>
  );
}
