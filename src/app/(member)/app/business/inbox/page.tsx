import Link from "next/link";
import { requireExperience } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Private business inbox" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { requested: "Request", more_info: "More information requested", accepted: "Connected", declined: "Declined", closed: "Closed", blocked: "Closed", withdrawn: "Withdrawn" };
const KIND: Record<string, string> = { collaboration: "Collaboration request", proposal: "Proposal" };

export default async function BusinessInbox({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { viewer } = await requireExperience("business");
  const view = (await searchParams).view ?? "all";
  const supabase = (await createClient())!;
  const biz = supabase.schema("business");
  const { data: convs } = await biz.from("conversations").select("id, post_id, kind, requester_id, recipient_id, status, outcome, requester_saved, recipient_saved, last_message_at").order("last_message_at", { ascending: false }).limit(100);
  const list = (convs ?? []).filter((c) => {
    if (view === "requests") return ["requested", "more_info"].includes(c.status) && c.recipient_id === viewer.id;
    if (view === "saved") return c.requester_id === viewer.id ? c.requester_saved : c.recipient_saved;
    return true;
  });
  const others = [...new Set(list.map((c) => (c.requester_id === viewer.id ? c.recipient_id : c.requester_id)))];
  const postIds = [...new Set(list.map((c) => c.post_id).filter(Boolean))] as string[];
  const ids = list.map((c) => c.id);
  const [{ data: names }, { data: posts }, { data: unread }] = await Promise.all([
    others.length ? biz.from("profiles").select("user_id, company, display_name").in("user_id", others) : Promise.resolve({ data: [] as { user_id: string; company: string | null; display_name: string | null }[] }),
    postIds.length ? biz.from("posts").select("id, title").in("id", postIds) : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    ids.length ? biz.from("messages").select("conversation_id").in("conversation_id", ids).is("read_at", null).neq("sender_id", viewer.id) : Promise.resolve({ data: [] as { conversation_id: string }[] }),
  ]);
  const nameOf = (uid: string) => {
    const n = (names ?? []).find((x) => x.user_id === uid);
    return n?.display_name || n?.company || "A Professional Society member";
  };
  const titleOf = (pid: string | null) => (posts ?? []).find((x) => x.id === pid)?.title;
  const unreadOf = (cid: string) => (unread ?? []).filter((u) => u.conversation_id === cid).length;
  const tab = (v: string, label: string) => <Link href={`/app/business/inbox?view=${v}`} className={`nav-pill text-sm ${view === v ? "!border-champagne !bg-champagne/15" : ""}`}>{label}</Link>;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/app/business" className="text-sm text-gold">← The Professional Society</Link>
      <h1 className="display mt-4 text-4xl">Private business inbox</h1>
      <p className="mt-2 text-muted">Requests arrive here. Nothing is shared until you accept, and you can decline, close or block at any time.</p>
      <div className="mt-6 flex flex-wrap gap-2">{tab("all", "All")}{tab("requests", "Message requests")}{tab("saved", "Saved connections")}</div>
      {list.length ? (
        <ul className="glass mt-6 divide-y divide-line">
          {list.map((c) => {
            const other = c.requester_id === viewer.id ? c.recipient_id : c.requester_id;
            const n = unreadOf(c.id);
            return (
              <li key={c.id}>
                <Link href={`/app/business/inbox/${c.id}`} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-champagne/10">
                  <span>
                    <span className={`block ${n ? "font-semibold" : ""}`}>{nameOf(other)}</span>
                    <span className="block text-xs text-muted">{KIND[c.kind] ? `${KIND[c.kind]} · ` : ""}{titleOf(c.post_id) ? `Re: ${titleOf(c.post_id)} · ` : ""}{c.requester_id === viewer.id ? "You reached out" : "Reached out to you"} · {new Date(c.last_message_at).toLocaleDateString("en-US", { dateStyle: "medium" })}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {n > 0 && <span className="rounded-full bg-champagne px-2 py-0.5 text-xs font-semibold text-espresso">{n} new</span>}
                    <span className="chip normal-case tracking-normal">{STATUS[c.status]}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-8 rounded-2xl border border-champagne/50 bg-champagne/10 p-6 text-sm text-muted">
          {view === "requests" ? "No new requests." : view === "saved" ? "No saved connections yet." : "No conversations yet. When you reach out on the Connection Board — or someone reaches out to you — it appears here."}
        </p>
      )}
    </div>
  );
}
