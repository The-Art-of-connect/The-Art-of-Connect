import Link from "next/link";
import { notFound } from "next/navigation";
import { requireExperience } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { acknowledgeHelp, reportBusiness, respondToRequest, sendBusinessMessage, updateConversation } from "@/app/actions/business";
import { ActionForm } from "@/components/admin/ActionForm";

export const dynamic = "force-dynamic";

const OUTCOME: Record<string, string> = { connection_established: "Connection Established", assistance_received: "Assistance Received", completed: "Completed" };

export default async function Conversation({ params }: { params: Promise<{ id: string }> }) {
  const { viewer } = await requireExperience("business");
  const { id } = await params;
  const supabase = (await createClient())!;
  const biz = supabase.schema("business");
  const { data: c } = await biz.from("conversations").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  await biz.rpc("mark_read", { conversation: id });
  const other = c.requester_id === viewer.id ? c.recipient_id : c.requester_id;
  const [{ data: messages }, { data: otherProfile }, { data: post }] = await Promise.all([
    biz.from("messages").select("id, sender_id, body, created_at").eq("conversation_id", id).order("created_at"),
    biz.from("profiles").select("company, display_name, headline, city, state").eq("user_id", other).maybeSingle(),
    c.post_id ? biz.from("posts").select("id, title").eq("id", c.post_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const otherName = otherProfile?.display_name || otherProfile?.company || "A Professional Society member";
  const isRecipient = c.recipient_id === viewer.id;
  const saved = c.requester_id === viewer.id ? c.requester_saved : c.recipient_saved;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/app/business/inbox" className="text-sm text-gold">← Private inbox</Link>
      <div className="glass mt-4 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="display text-3xl">{otherName}</h1>
          {c.outcome && <span className="chip chip-live normal-case tracking-normal">{OUTCOME[c.outcome]}</span>}
        </div>
        {otherProfile?.headline && <p className="text-sm text-muted">{otherProfile.headline}</p>}
        {post && <p className="mt-2 text-xs text-muted">About: <Link href={`/app/business/board/${post.id}`} className="text-gold underline">{post.title}</Link></p>}
      </div>

      {c.status === "requested" && isRecipient && (
        <div className="mt-4 rounded-2xl border border-champagne/50 bg-champagne/10 p-5">
          <p className="font-semibold">{otherName} would like to connect.</p>
          <p className="mt-1 text-sm text-muted">Read their introduction below. Accept to start a private conversation, or decline — they won’t be able to message you about this post.</p>
          <div className="mt-3 flex gap-2">
            <ActionForm action={respondToRequest}><input type="hidden" name="id" value={id} /><input type="hidden" name="decision" value="accepted" /><button className="btn btn-gold btn-sm">Accept</button></ActionForm>
            <ActionForm action={respondToRequest}><input type="hidden" name="id" value={id} /><input type="hidden" name="decision" value="declined" /><button className="btn btn-ghost btn-sm">Decline</button></ActionForm>
          </div>
        </div>
      )}
      {c.status === "requested" && !isRecipient && <p className="mt-4 text-sm text-muted">Your introduction was sent. You’ll be able to continue once {otherName} accepts.</p>}
      {["declined", "closed", "blocked"].includes(c.status) && <p className="mt-4 text-sm text-muted">This conversation is closed.</p>}

      <ol className="mt-6 space-y-3" aria-label="Messages">
        {(messages ?? []).map((m) => {
          const mine = m.sender_id === viewer.id;
          return (
            <li key={m.id} className={`max-w-[85%] rounded-2xl p-4 text-sm ${mine ? "ml-auto bg-champagne/15" : "glass"}`}>
              <p className="whitespace-pre-line">{m.body}</p>
              <p className="mt-2 text-[0.7rem] text-faint">{mine ? "You" : otherName} · {new Date(m.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p>
            </li>
          );
        })}
      </ol>

      {c.status === "accepted" && (
        <ActionForm action={sendBusinessMessage} className="mt-6 space-y-2">
          <input type="hidden" name="id" value={id} />
          <textarea name="body" required maxLength={4000} className="field !min-h-[100px]" placeholder={`Write to ${otherName}…`} aria-label="Message" />
          <button className="btn btn-gold btn-sm">Send</button>
        </ActionForm>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <section className="glass p-5 text-sm">
          <p className="font-semibold">Connection status</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ActionForm action={updateConversation}><input type="hidden" name="id" value={id} /><input type="hidden" name="action" value="save" /><button className="btn btn-ghost btn-sm">{saved ? "★ Saved" : "☆ Save connection"}</button></ActionForm>
            {c.status === "accepted" && Object.entries(OUTCOME).filter(([k]) => k !== c.outcome).map(([k, l]) => (
              <ActionForm key={k} action={updateConversation}><input type="hidden" name="id" value={id} /><input type="hidden" name="action" value={k} /><button className="btn btn-ghost btn-sm">{l}</button></ActionForm>
            ))}
            {c.status === "accepted" && <ActionForm action={updateConversation}><input type="hidden" name="id" value={id} /><input type="hidden" name="action" value="close" /><button className="btn btn-ghost btn-sm">Close conversation</button></ActionForm>}
          </div>
          {c.status === "accepted" && (
            <details className="mt-4">
              <summary className="cursor-pointer text-gold underline">Thank {otherName} for their help</summary>
              <ActionForm action={acknowledgeHelp} className="mt-3 space-y-2">
                <input type="hidden" name="id" value={id} />
                <textarea name="note" maxLength={600} className="field !min-h-[70px]" placeholder="A short note of thanks (optional)" />
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="public" className="accent-[var(--champagne)]" /> Others may see this acknowledgement on their profile</label>
                <button className="btn btn-gold btn-sm">Send acknowledgement</button>
              </ActionForm>
            </details>
          )}
        </section>
        <section className="glass p-5 text-sm">
          <p className="font-semibold">Safety</p>
          <p className="mt-1 text-muted">Reports are confidential. Our team doesn’t read conversations unless a report requires review.</p>
          <ActionForm action={reportBusiness} className="mt-3 space-y-2">
            <input type="hidden" name="conversationId" value={id} /><input type="hidden" name="userId" value={other} />
            <select name="reason" required className="field" aria-label="Reason">
              <option value="spam">Spam</option><option value="solicitation">Unsolicited sales pitch</option><option value="fraud">Fraud or investment scheme</option>
              <option value="harassment">Harassment</option><option value="impersonation">Impersonation</option><option value="other">Other</option>
            </select>
            <textarea name="details" placeholder="What happened? (optional)" className="field !min-h-[60px]" />
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="block" className="accent-[var(--champagne)]" /> Also block {otherName}</label>
            <button className="btn btn-ghost btn-sm">Report confidentially</button>
          </ActionForm>
        </section>
      </div>
    </div>
  );
}
