import Link from "next/link";
import { notFound } from "next/navigation";
import { requireExperience } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { INTENTS, POST_STATUS, STAGES, US_STATES } from "@/lib/business-options";
import { connectPrivately, reportBusiness, setPostStatus, toggleSavedPost } from "@/app/actions/business";
import { ActionForm } from "@/components/admin/ActionForm";

export const dynamic = "force-dynamic";

export default async function PostDetail({ params }: { params: Promise<{ id: string }> }) {
  const { viewer } = await requireExperience("business");
  const { id } = await params;
  const supabase = (await createClient())!;
  const biz = supabase.schema("business");
  const { data: p } = await biz.from("posts").select("*").eq("id", id).maybeSingle();
  if (!p) notFound();
  const [{ data: author }, { data: cat }, { data: saved }, { data: existing }] = await Promise.all([
    biz.from("profiles").select("company, display_name, headline, industry").eq("user_id", p.author_id).maybeSingle(),
    biz.from("categories").select("name").eq("slug", p.category).maybeSingle(),
    biz.from("saved_posts").select("post_id").eq("user_id", viewer.id).eq("post_id", id).maybeSingle(),
    biz.from("conversations").select("id, status").eq("post_id", id).eq("requester_id", viewer.id).in("status", ["requested", "accepted"]).maybeSingle(),
  ]);
  const mine = p.author_id === viewer.id;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/app/business/board" className="text-sm text-gold">← Connection Board</Link>
      <article className="glass mt-4 p-7 sm:p-9">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">{[p.city, p.state ? US_STATES[p.state] : null].filter(Boolean).join(", ") || "Nationwide"} · {INTENTS[p.intent]}</p>
          <span className="chip normal-case tracking-normal">{POST_STATUS[p.status]}</span>
        </div>
        <h1 className="display mt-4 text-4xl">{p.title}</h1>
        <p className="mt-2 text-sm font-semibold text-gold">{cat?.name}{p.stage ? ` · ${STAGES[p.stage]}` : ""}</p>
        <p className="mt-6 whitespace-pre-line leading-relaxed">{p.description}</p>
        {p.expertise?.length > 0 && <p className="mt-4 text-sm text-muted">Expertise: {p.expertise.join(" · ")}</p>}
        <div className="mt-6 border-t border-line pt-5 text-sm">
          <p className="font-semibold">{author?.display_name || author?.company || "A Professional Society member"}</p>
          {author?.headline && <p className="text-muted">{author.headline}</p>}
          <p className="mt-1 text-xs text-faint">Posted {new Date(p.created_at).toLocaleDateString("en-US", { dateStyle: "long" })}</p>
        </div>
      </article>

      {mine ? (
        <section className="glass mt-6 p-7">
          <h2 className="text-lg font-semibold">Manage your post</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/app/business/board/new?edit=${p.id}`} className="btn btn-ghost btn-sm">Edit</Link>
            {(["open", "connection_established", "assistance_received", "completed", "closed", "archived"] as const).filter((s) => s !== p.status).map((s) => (
              <ActionForm key={s} action={setPostStatus}>
                <input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value={s} />
                <button className="btn btn-ghost btn-sm">Mark {POST_STATUS[s]}</button>
              </ActionForm>
            ))}
          </div>
          <Link href="/app/business/inbox" className="mt-4 inline-block text-sm text-gold underline">See responses in your private inbox</Link>
        </section>
      ) : (
        <>
          <section className="theme-dark band mt-6 rounded-[24px] p-7">
            <h2 className="display text-3xl">I Can Help · Connect Privately</h2>
            {existing ? (
              <p className="mt-3 text-sm text-muted">You’ve already reached out. <Link href={`/app/business/inbox/${existing.id}`} className="text-gold underline">Open the conversation</Link></p>
            ) : (
              <ActionForm action={connectPrivately} className="mt-4 space-y-3">
                <input type="hidden" name="postId" value={p.id} />
                <textarea name="message" required minLength={20} maxLength={4000} className="field !min-h-[130px]" placeholder="Introduce yourself and explain how you can help. They’ll see your business name and this message, and can accept or decline." />
                <button className="btn btn-gold">Send private introduction</button>
                <p className="text-xs text-faint">Your email and phone number are not shared. No sales pitches or unsolicited offers, please.</p>
              </ActionForm>
            )}
          </section>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <ActionForm action={toggleSavedPost}>
              <input type="hidden" name="id" value={p.id} /><input type="hidden" name="on" value={saved ? "0" : "1"} />
              <button className="btn btn-ghost btn-sm">{saved ? "★ Saved" : "☆ Save post"}</button>
            </ActionForm>
            <details className="text-sm">
              <summary className="cursor-pointer text-muted underline">Report this post</summary>
              <ActionForm action={reportBusiness} className="mt-3 w-72 space-y-2">
                <input type="hidden" name="postId" value={p.id} /><input type="hidden" name="userId" value={p.author_id} />
                <select name="reason" required className="field" aria-label="Reason">
                  <option value="spam">Spam</option><option value="solicitation">Sales solicitation</option><option value="fraud">Fraud or investment scheme</option>
                  <option value="impersonation">Impersonation</option><option value="inappropriate">Inappropriate</option><option value="other">Other</option>
                </select>
                <textarea name="details" placeholder="What happened? (optional)" className="field !min-h-[70px]" />
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="block" className="accent-[var(--champagne)]" /> Also block this member</label>
                <button className="btn btn-ghost btn-sm">Send report</button>
              </ActionForm>
            </details>
          </div>
        </>
      )}
    </div>
  );
}
