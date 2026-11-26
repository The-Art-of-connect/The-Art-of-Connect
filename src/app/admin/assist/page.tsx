import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/admin/ActionForm";
import { PageHeader, Stat } from "@/components/admin/ui";
import { decideIssue } from "@/app/actions/assist";

export const dynamic = "force-dynamic";
export const metadata = { title: "Assistance Center" };

const STATUS: Record<string, string> = {
  new: "New", investigating: "Peace is investigating", fixed: "Fixed by Peace", needs_owner: "Needs your decision", cannot_reproduce: "Couldn't reproduce",
  proposed: "Proposal ready: your approval needed", approved: "Approved: Peace will build", declined: "Declined", built: "Built by Peace", closed: "Closed",
};
const TABS = [["action", "Needs you"], ["open", "Open"], ["done", "Done"], ["all", "All"]] as const;

/** Every problem and suggestion members send. Peace fixes problems and proposes suggestions; you decide what gets built. */
export default async function AssistanceCenter({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireStaff(["owner", "admin"]);
  const tab = (await searchParams).tab ?? "action";
  const db = (await createClient())!;
  const { data } = await db.from("site_issues").select("*, profiles:reporter_id (display_name, email)").order("created_at", { ascending: false }).limit(300);
  const all = (data ?? []) as unknown as { id: string; kind: string; page_path: string | null; description: string; expected: string | null; screenshot_path: string | null; device: string | null; status: string; peace_notes: string | null; pr_url: string | null; owner_note: string | null; member_reply: string | null; created_at: string; profiles: { display_name: string | null; email: string } | null }[];
  const needsYou = (i: (typeof all)[number]) => ["proposed", "needs_owner"].includes(i.status);
  const done = (i: (typeof all)[number]) => ["fixed", "built", "declined", "closed", "cannot_reproduce"].includes(i.status);
  const shown = all.filter((i) => tab === "all" || (tab === "action" ? needsYou(i) : tab === "done" ? done(i) : !done(i)));
  const shots = shown.map((i) => i.screenshot_path).filter(Boolean) as string[];
  const urls = shots.length ? (await db.storage.from("site-issues").createSignedUrls(shots, 1800)).data ?? [] : [];

  return (
    <>
      <PageHeader eyebrow="Owner Portal" title="Assistance Center" />
      <p className="-mt-4 mb-6 max-w-3xl text-sm text-muted">Members (and you) send problems and suggestions from any page through <Link href="/app/assist" className="text-gold underline">Help &amp; suggestions</Link>. Peace checks this queue on a schedule: <strong>problems</strong> are investigated, fixed, tested and deployed, and the fix is recorded here; <strong>suggestions</strong> get a written proposal and are built only after you approve. Anything touching payments, pricing, privacy or legal terms always comes to you first.</p>
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Needs your decision" value={all.filter(needsYou).length} />
        <Stat label="New" value={all.filter((i) => i.status === "new").length} />
        <Stat label="Fixed or built" value={all.filter((i) => ["fixed", "built"].includes(i.status)).length} />
        <Stat label="All reports" value={all.length} />
      </div>
      <nav className="mt-8 flex flex-wrap gap-2 text-sm">{TABS.map(([k, v]) => <Link key={k} href={`/admin/assist?tab=${k}`} className={`rounded-full border px-3 py-1 ${tab === k ? "border-gold bg-gold/10 font-semibold" : "border-line"}`}>{v}</Link>)}</nav>
      {shown.length === 0 ? <p className="mt-6 text-sm text-muted">Nothing here.</p> : (
        <div className="mt-6 space-y-4">{shown.map((i) => {
          const shot = i.screenshot_path ? urls.find((u) => u.path === i.screenshot_path)?.signedUrl : null;
          return (
            <article key={i.id} className="glass space-y-3 p-5 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold">{i.kind === "problem" ? "Problem" : "Suggestion"}{i.page_path ? <> · <code className="text-xs">{i.page_path}</code></> : ""}</p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs ${needsYou(i) ? "bg-[#e8701a]/15 text-[#c8701a]" : "bg-gold/10 text-gold-deep"}`}>{STATUS[i.status] ?? i.status}</span>
              </div>
              <p className="text-xs text-faint">{new Date(i.created_at).toLocaleString("en-US")} · {i.profiles?.display_name ?? i.profiles?.email ?? "Member"}{i.device ? ` · ${i.device}` : ""}</p>
              <p className="whitespace-pre-wrap">{i.description}</p>
              {i.expected && <p className="text-xs text-muted">Expected: {i.expected}</p>}
              {shot && <a href={shot} target="_blank" rel="noreferrer" className="text-xs text-gold underline">Open screenshot</a>}
              {i.peace_notes && <div className="rounded-xl border border-gold/40 bg-gold/5 p-3"><p className="text-xs font-semibold uppercase tracking-wider text-gold-deep">{i.kind === "problem" ? "Peace: cause and fix" : "Peace: proposal"}</p><p className="mt-1 whitespace-pre-wrap">{i.peace_notes}</p>{i.pr_url && <a href={i.pr_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs underline">View the change</a>}</div>}
              <ActionForm action={decideIssue} className="space-y-2 border-t border-line pt-3">
                <input type="hidden" name="id" value={i.id} />
                <textarea name="owner_note" rows={2} defaultValue={i.owner_note ?? ""} className="field w-full text-xs" placeholder="Your note to Peace (changes you'd like, or why)" />
                <input name="member_reply" defaultValue={i.member_reply ?? ""} className="field w-full text-xs" placeholder="Optional reply the member will see" />
                <div className="flex flex-wrap gap-2">
                  {(i.status === "proposed" || i.status === "needs_owner") && <><button name="op" value="approve" className="btn btn-gold btn-sm">Approve</button><button name="op" value="decline" className="btn btn-ghost btn-sm">Decline</button></>}
                  {i.kind === "suggestion" && i.status === "new" && <button name="op" value="approve" className="btn btn-ghost btn-sm">Approve now (skip proposal)</button>}
                  <button name="op" value="note" className="btn btn-ghost btn-sm">Save note</button>
                  {done(i) ? <button name="op" value="reopen" className="btn btn-ghost btn-sm">Reopen</button> : <button name="op" value="close" className="btn btn-ghost btn-sm">Close</button>}
                </div>
              </ActionForm>
            </article>
          );
        })}</div>
      )}
    </>
  );
}
