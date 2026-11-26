import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/admin/ActionForm";
import { EliteBadge } from "@/components/EliteBadge";
import { createSupportRequest } from "@/app/actions/support";

export const metadata = { title: "Support" };

/** Member support. Elite Concierge members are answered first (priority set by the database). */
export default async function Support() {
  const viewer = (await getViewer())!;
  const preview = isInsidePreview(viewer) || Boolean(viewer.viewAs);
  const db = (await createClient())!;
  const [{ data: badge }, { data: tickets }] = preview ? [{ data: null }, { data: [] }] : await Promise.all([
    db.from("elite_badges").select("status").eq("user_id", viewer.id).maybeSingle(),
    db.from("support_tickets").select("id, subject, status, priority, created_at").eq("user_id", viewer.id).order("created_at", { ascending: false }).limit(20),
  ]);
  const elite = badge?.status === "active";
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className={elite ? "theme-dark rounded-[28px] p-8" : ""} style={elite ? { background: "#1b1310" } : undefined}>
        <p className="eyebrow flex items-center gap-2">{elite && <EliteBadge size={16} interactive={false} />}{elite ? "Elite priority support" : "Support"}</p>
        <h1 className="display mt-3 text-4xl">{elite ? "Your concierge desk" : "How can we help?"}</h1>
        <p className="mt-2 text-sm text-muted">{elite ? "As an Elite Concierge member, your requests are answered first, personally and discreetly." : "Send us a note and we'll reply by email."} For safety concerns, use Report on any profile or post as well. In an emergency, call 911.</p>
      </section>
      {!preview && (
        <ActionForm action={createSupportRequest} className="glass space-y-3 p-6">
          <label className="block text-sm">Topic<select name="category" className="field mt-1 w-full"><option value="general">General</option><option value="account">My account</option><option value="billing">Billing</option><option value="relationships">Singles & couples</option><option value="business">Business</option><option value="safety">Safety</option></select></label>
          <label className="block text-sm">Subject<input name="subject" required maxLength={200} className="field mt-1 w-full" /></label>
          <label className="block text-sm">Details<textarea name="body" required rows={5} maxLength={5000} className="field mt-1 w-full" placeholder={elite ? "Tell us how we can assist you" : "What can we help with?"} /></label>
          <p className="text-xs text-faint">Please don&rsquo;t include passwords, card numbers or private health information.</p>
          <button className="btn btn-gold">Send</button>
        </ActionForm>
      )}
      {(tickets ?? []).length > 0 && (
        <ul className="glass divide-y divide-line !p-0 text-sm">{(tickets ?? []).map((t) => (
          <li key={t.id} className="flex justify-between gap-3 px-5 py-3"><span>{t.subject}</span><span className="text-xs text-muted">{t.priority === "elite" ? "Priority · " : ""}{t.status} · {new Date(t.created_at).toLocaleDateString("en-US")}</span></li>
        ))}</ul>
      )}
    </div>
  );
}
