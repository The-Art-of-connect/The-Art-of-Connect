import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/admin/ActionForm";
import { sendMessage } from "@/app/actions/social";
import { people, signPhotos } from "@/lib/social-server";
import { Avatar, PersonName, ReportMenu } from "@/components/social/ui";

export const metadata = { title: "Conversation" };

export default async function Conversation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const viewer = (await getViewer())!;
  if (isInsidePreview(viewer) || viewer.viewAs) return <p className="text-sm">Preview: sign in with your own account.</p>;
  const db = (await createClient())!;
  const { data: conv } = await db.from("social_conversations").select("id, kind, title, event_id").eq("id", id).maybeSingle();
  if (!conv) notFound();
  const [{ data: members }, { data: msgs }] = await Promise.all([
    db.from("social_conversation_members").select("user_id").eq("conversation_id", id),
    db.from("social_messages").select("id, sender_id, body, created_at").eq("conversation_id", id).order("created_at").limit(500),
  ]);
  await db.from("social_conversation_members").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", id).eq("user_id", viewer.id);
  const dir = await people(db, (members ?? []).map((m) => m.user_id));
  const urls = await signPhotos(db, Object.values(dir).map((d) => d.avatar_path));
  const others = (members ?? []).filter((m) => m.user_id !== viewer.id);
  return (
    <div className="space-y-4">
      <Link href="/app/connect/messages" className="text-sm text-gold underline">← Messages</Link>
      <header className="glass p-5">
        <h1 className="display text-3xl">{conv.title ?? others.map((m) => dir[m.user_id]?.display_name ?? "Member").join(", ")}</h1>
        <p className="mt-1 text-xs text-muted">{others.length + 1} people · private{conv.event_id ? <> · <Link href={`/app/connect/events/${conv.event_id}`} className="underline">event</Link></> : ""}</p>
      </header>
      <ol className="space-y-3">{(msgs ?? []).map((m) => {
        const mine = m.sender_id === viewer.id;
        return (
          <li key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
            {!mine && <Avatar name={dir[m.sender_id]?.display_name ?? null} url={dir[m.sender_id]?.avatar_path ? urls[dir[m.sender_id]!.avatar_path!] : null} size={32} />}
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${mine ? "bg-[#e8701a]/15" : "glass !p-3"}`}>
              {!mine && others.length > 1 && <PersonName p={dir[m.sender_id]} id={m.sender_id} />}
              <p className="whitespace-pre-wrap">{m.body}</p>
              <p className="mt-1 flex items-center justify-between gap-3 text-[0.65rem] text-faint">{new Date(m.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}{!mine && <ReportMenu type="message" id={m.id} />}</p>
            </div>
          </li>
        );
      })}</ol>
      <ActionForm action={sendMessage} className="sticky bottom-24 flex gap-2 lg:bottom-4"><input type="hidden" name="conversation_id" value={id} />
        <textarea name="body" required rows={1} maxLength={4000} placeholder="Write a message" className="field flex-1" /><button className="btn btn-gold">Send</button></ActionForm>
    </div>
  );
}
