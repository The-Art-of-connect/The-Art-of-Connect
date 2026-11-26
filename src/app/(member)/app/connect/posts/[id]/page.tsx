import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadFeed, people, signPhotos } from "@/lib/social-server";
import { PostCard } from "@/components/social/ui";

export const metadata = { title: "Discussion" };

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const viewer = (await getViewer())!;
  if (isInsidePreview(viewer) || viewer.viewAs) return <p className="text-sm">Preview: sign in with your own account.</p>;
  const db = (await createClient())!;
  const { data: post } = await db.from("social_posts").select("id, circle_id").eq("id", id).maybeSingle();
  if (!post) notFound();
  const feed = await loadFeed(db, viewer.id, { circleId: post.circle_id ?? undefined, limit: 200 });
  const p = feed.posts.find((x) => x.id === id);
  if (!p) notFound();
  const { data: comments } = await db.from("social_comments").select("id, author_id, body, created_at").eq("post_id", id).eq("status", "active").order("created_at");
  const authors = await people(db, (comments ?? []).map((c) => c.author_id));
  Object.assign(feed.authors, authors);
  Object.assign(feed.urls, await signPhotos(db, Object.values(authors).map((a) => a.avatar_path)));
  return (
    <div className="space-y-4">
      <Link href="/app/connect" className="text-sm text-gold underline">← Back to the feed</Link>
      <PostCard post={p} feed={feed} viewerId={viewer.id} showComments comments={comments ?? []} />
    </div>
  );
}
