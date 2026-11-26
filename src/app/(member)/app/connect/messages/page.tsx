import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/admin/ActionForm";
import { startConversation } from "@/app/actions/social";
import { people } from "@/lib/social-server";

export const metadata = { title: "Messages" };

/** Private conversations: direct, group and event. Only with accepted connections. */
export default async function Messages() {
  const viewer = (await getViewer())!;
  if (isInsidePreview(viewer) || viewer.viewAs) return <p className="rounded-2xl border border-gold/40 bg-gold/10 p-4 text-sm">Preview: sign in with your own account.</p>;
  const db = (await createClient())!;
  const { data: mine } = await db.from("social_conversation_members").select("conversation_id, last_read_at, social_conversations(id, kind, title, created_at)").eq("user_id", viewer.id);
  const convs = ((mine ?? []) as unknown as { conversation_id: string; last_read_at: string | null; social_conversations: { id: string; kind: string; title: string | null; created_at: string } }[]);
  const ids = convs.map((c) => c.conversation_id);
  const [{ data: members }, { data: latest }, { data: conns }] = await Promise.all([
    ids.length ? db.from("social_conversation_members").select("conversation_id, user_id").in("conversation_id", ids) : Promise.resolve({ data: [] }),
    ids.length ? db.from("social_messages").select("conversation_id, body, created_at, sender_id").in("conversation_id", ids).order("created_at", { ascending: false }).limit(300) : Promise.resolve({ data: [] }),
    db.from("social_connections").select("requester_id, addressee_id").eq("status", "accepted"),
  ]);
  const connections = (conns ?? []).map((c) => (c.requester_id === viewer.id ? c.addressee_id : c.requester_id));
  const dir = await people(db, [...(members ?? []).map((m) => m.user_id), ...connections]);
  const last = new Map<string, { body: string; created_at: string; sender_id: string }>();
  for (const m of latest ?? []) if (!last.has(m.conversation_id)) last.set(m.conversation_id, m);
  const sorted = convs.sort((a, b) => (last.get(b.conversation_id)?.created_at ?? b.social_conversations.created_at).localeCompare(last.get(a.conversation_id)?.created_at ?? a.social_conversations.created_at));
  const nameOf = (cid: string, title: string | null) => title ?? (members ?? []).filter((m) => m.conversation_id === cid && m.user_id !== viewer.id).map((m) => dir[m.user_id]?.display_name ?? "Member").join(", ");

  return (
    <div className="space-y-6">
      <header><p className="eyebrow">Private messages</p><h1 className="display mt-2 text-4xl">Messages</h1>
        <p className="mt-2 text-sm text-muted">Conversations are private to the people in them. You can message your connections, start group conversations and event chats.</p></header>
      {sorted.length === 0 ? <p className="glass p-6 text-sm text-muted">No conversations yet.</p> : (
        <ul className="glass divide-y divide-line !p-0">{sorted.map((c) => {
          const l = last.get(c.conversation_id);
          const unread = l && l.sender_id !== viewer.id && (!c.last_read_at || l.created_at > c.last_read_at);
          return (
            <li key={c.conversation_id}><Link href={`/app/connect/messages/${c.conversation_id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-gold/5">
              <div className="min-w-0"><p className={`truncate ${unread ? "font-semibold" : ""}`}>{nameOf(c.conversation_id, c.social_conversations.title)}</p><p className="truncate text-xs text-muted">{c.social_conversations.kind !== "direct" ? `${c.social_conversations.kind === "event" ? "Event" : "Group"} · ` : ""}{l?.body ?? "No messages yet"}</p></div>
              {unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#e8701a]" aria-label="Unread" />}
            </Link></li>
          );
        })}</ul>
      )}
      {connections.length > 0 && (
        <ActionForm action={startConversation} className="glass space-y-3 p-5">
          <h2 className="display text-2xl">New conversation</h2>
          <input name="title" maxLength={120} placeholder="Group name (optional)" className="field w-full" />
          <div className="grid gap-2 sm:grid-cols-3">{connections.map((uid) => <label key={uid} className="flex items-center gap-2 text-sm"><input type="checkbox" name="members" value={uid} /> {dir[uid]?.display_name ?? "Member"}</label>)}</div>
          <button className="btn btn-gold btn-sm">Start</button>
        </ActionForm>
      )}
    </div>
  );
}
