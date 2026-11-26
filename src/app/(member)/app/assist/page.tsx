import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/admin/ActionForm";
import { reportIssue } from "@/app/actions/assist";

export const metadata = { title: "Help & suggestions" };

const STATUS: Record<string, string> = {
  new: "Received", investigating: "Being looked into", fixed: "Fixed", needs_owner: "With our founder", cannot_reproduce: "We couldn't reproduce it", duplicate: "Already being handled", failed: "Still being looked into", rolled_back: "With our founder",
  proposed: "With our founder", approved: "Approved, in progress", declined: "Not planned for now", built: "Added to the platform", closed: "Closed",
};

/** Report something that isn't working, or suggest an idea. Every report reaches the founder. */
export default async function Assist({ searchParams }: { searchParams: Promise<{ from?: string; kind?: string }> }) {
  const sp = await searchParams;
  const viewer = (await getViewer())!;
  const preview = isInsidePreview(viewer) || Boolean(viewer.viewAs);
  const db = (await createClient())!;
  const { data: mine } = preview ? { data: [] } : await db.from("site_issues").select("id, kind, page_path, description, status, member_reply, created_at").eq("reporter_id", viewer.id).order("created_at", { ascending: false }).limit(20);
  const from = (sp.from ?? "").slice(0, 300);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="eyebrow">Help &amp; suggestions</p>
        <h1 className="display mt-3 text-4xl">Something not working? An idea to share?</h1>
        <p className="mt-2 text-sm text-muted">Tell us and we&rsquo;ll take care of it. Problems are investigated and fixed; ideas are reviewed personally by our founder. For account or billing questions, use <a href="/app/support" className="text-gold underline">Support</a>. In an emergency, call 911.</p>
      </header>
      {!preview && (
        <ActionForm action={reportIssue} className="glass space-y-4 p-6">
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-start gap-2 rounded-xl border border-line p-3 text-sm has-[:checked]:border-[#e8701a]"><input type="radio" name="kind" value="problem" defaultChecked={sp.kind !== "suggestion"} /> <span><span className="font-semibold">Something isn&rsquo;t working</span><span className="block text-xs text-muted">A button, page or feature that misbehaves.</span></span></label>
            <label className="flex items-start gap-2 rounded-xl border border-line p-3 text-sm has-[:checked]:border-[#e8701a]"><input type="radio" name="kind" value="suggestion" defaultChecked={sp.kind === "suggestion"} /> <span><span className="font-semibold">I have a suggestion</span><span className="block text-xs text-muted">An improvement or a new idea.</span></span></label>
          </fieldset>
          <label className="block text-sm">Which page? <span className="text-faint">(filled in for you when you came from a page)</span><input name="page_path" defaultValue={from} maxLength={300} className="field mt-1 w-full" placeholder="/app/connect" /></label>
          <label className="block text-sm">What happened, or what&rsquo;s your idea?<textarea name="description" required rows={4} maxLength={4000} className="field mt-1 w-full" /></label>
          <label className="block text-sm">What did you expect? <span className="text-faint">(optional)</span><textarea name="expected" rows={2} maxLength={2000} className="field mt-1 w-full" /></label>
          <label className="block text-sm">Screenshot <span className="text-faint">(optional; seen only by our team)</span><input type="file" name="screenshot" accept="image/png,image/jpeg,image/webp" className="mt-2 block w-full text-sm" /></label>
          <p className="text-xs text-faint">Please don&rsquo;t include passwords, card numbers or private journal content.</p>
          <button className="btn btn-gold">Send</button>
        </ActionForm>
      )}
      {(mine ?? []).length > 0 && (
        <section className="glass p-5">
          <h2 className="display text-2xl">What you&rsquo;ve sent</h2>
          <ul className="mt-3 divide-y divide-line text-sm">{(mine ?? []).map((i) => (
            <li key={i.id} className="py-3">
              <p className="flex flex-wrap justify-between gap-2"><span className="font-semibold">{i.kind === "problem" ? "Problem" : "Suggestion"}{i.page_path ? ` · ${i.page_path}` : ""}</span><span className="text-xs text-gold-deep">{STATUS[i.status] ?? i.status}</span></p>
              <p className="mt-1 line-clamp-2 text-muted">{i.description}</p>
              {i.member_reply && <p className="mt-1 text-xs">Reply: {i.member_reply}</p>}
            </li>
          ))}</ul>
        </section>
      )}
    </div>
  );
}
