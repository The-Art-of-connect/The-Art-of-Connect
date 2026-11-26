import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ConnectTabs } from "@/components/social/ConnectTabs";

export const dynamic = "force-dynamic";

/** The social ecosystem: feed, circles, the Connect Calendar, people, messages and profile. */
export default async function ConnectLayout({ children }: { children: React.ReactNode }) {
  const viewer = (await getViewer())!;
  let unread = 0, requests = 0;
  if (!isInsidePreview(viewer) && !viewer.viewAs) {
    const db = (await createClient())!;
    const [{ count: req }, { data: convs }] = await Promise.all([
      db.from("social_connections").select("id", { count: "exact", head: true }).eq("addressee_id", viewer.id).eq("status", "pending"),
      db.from("social_conversation_members").select("conversation_id, last_read_at").eq("user_id", viewer.id),
    ]);
    requests = req ?? 0;
    for (const c of convs ?? []) {
      const { count } = await db.from("social_messages").select("id", { count: "exact", head: true }).eq("conversation_id", c.conversation_id).neq("sender_id", viewer.id).gt("created_at", c.last_read_at ?? "1970-01-01");
      if (count) unread++;
    }
  }
  return (
    <div className="mx-auto max-w-5xl">
      <ConnectTabs unread={unread} requests={requests} />
      {children}
    </div>
  );
}
