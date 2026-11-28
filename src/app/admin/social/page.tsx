import Link from "next/link";
import { requireStaff, hasRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/admin/ActionForm";
import { PageHeader, Stat } from "@/components/admin/ui";
import { archiveCircle, createOfficialCircle, decideCircle, renameCircle, resolveSocialReport, saveCircleCategory } from "@/app/actions/social";
import { CIRCLE_KIND_LABEL, ELIGIBILITY_LABEL, INTERESTS } from "@/lib/social";

export const dynamic = "force-dynamic";
export const metadata = { title: "Community & Social" };

/** Owner and moderators: safety reports, circle approvals, categories and circles, aggregate activity. */
export default async function SocialAdmin() {
  const viewer = await requireStaff(["owner", "admin", "moderator"]);
  const owner = hasRole(viewer, ["owner"]);
  const db = (await createClient())!;
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [{ data: reports }, { data: proposed }, { data: cats }, { data: circles }, posts, events, profiles, conns, members] = await Promise.all([
    db.from("social_reports").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(100),
    db.from("social_circles").select("id, name, tagline, description, category, created_at, created_by").eq("status", "proposed").order("created_at"),
    db.from("social_circle_categories").select("*").order("sort"),
    db.from("social_circles").select("id, slug, name, tagline, category, kind, eligibility, status").neq("status", "proposed").order("category").order("name"),
    db.from("social_posts").select("id", { count: "exact", head: true }).gte("created_at", since),
    db.from("social_events").select("id", { count: "exact", head: true }).gte("created_at", since),
    db.from("social_profiles").select("user_id", { count: "exact", head: true }),
    db.from("social_connections").select("id", { count: "exact", head: true }).eq("status", "accepted"),
    db.from("social_circle_members").select("circle_id"),
  ]);
  const size = (members.data ?? []).reduce<Record<string, number>>((a, m) => ((a[m.circle_id] = (a[m.circle_id] ?? 0) + 1), a), {});
  const catName = Object.fromEntries((cats ?? []).map((c) => [c.key, c.name]));

  return (
    <>
      <PageHeader eyebrow="Owner Portal" title="Community & Social" />
      <p className="-mt-4 mb-6 max-w-3xl text-sm text-muted">The Connection Feed, circles, The Connect Calendar and messaging. Activity figures are aggregate only. Ordinary circles are open to every eligible member; only Elite circles require verification. <Link href="/app/connect" className="text-gold underline">Open the member experience →</Link> · <Link href="/admin/social/previews" className="text-gold underline">What’s Happening Inside Connect previews →</Link></p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Open safety reports" value={(reports ?? []).length} />
        <Stat label="Member profiles" value={profiles.count ?? 0} />
        <Stat label="Connections" value={conns.count ?? 0} />
        <Stat label="Posts (30 days)" value={posts.count ?? 0} />
        <Stat label="Events shared (30 days)" value={events.count ?? 0} />
      </div>

      <section className="mt-10">
        <h2 className="display text-3xl">Safety reports</h2>
        {(reports ?? []).length === 0 ? <p className="mt-3 text-sm text-muted">No open reports.</p> : (
          <div className="mt-4 space-y-3">{(reports ?? []).map((r) => (
            <ActionForm key={r.id} action={resolveSocialReport} className="glass flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <input type="hidden" name="id" value={r.id} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{r.target_type} · {r.reason}{r.automatic ? " · automatic" : ""}</p>
                {r.details && <p className="text-xs text-muted">{r.details}</p>}
                <p className="text-xs text-faint">{new Date(r.created_at).toLocaleString("en-US")} · <TargetLink type={r.target_type} id={r.target_id} /></p>
              </div>
              <div className="flex gap-2"><button name="decision" value="remove" className="btn btn-gold btn-sm">Remove content</button><button name="decision" value="actioned" className="btn btn-ghost btn-sm">Resolved</button><button name="decision" value="dismiss" className="btn btn-ghost btn-sm">Dismiss</button></div>
            </ActionForm>
          ))}</div>
        )}
      </section>

      {owner && (
        <>
          <section className="mt-10">
            <h2 className="display text-3xl">Proposed circles</h2>
            {(proposed ?? []).length === 0 ? <p className="mt-3 text-sm text-muted">None waiting.</p> : (
              <div className="mt-4 space-y-3">{(proposed ?? []).map((c) => (
                <ActionForm key={c.id} action={decideCircle} className="glass space-y-2 p-4 text-sm">
                  <input type="hidden" name="id" value={c.id} />
                  <p className="font-semibold">{c.name} <span className="text-xs font-normal text-muted">· {catName[c.category] ?? c.category}</span></p>
                  {c.tagline && <p>{c.tagline}</p>}{c.description && <p className="text-xs text-muted">{c.description}</p>}
                  <div className="flex gap-2"><button name="approve" value="yes" className="btn btn-gold btn-sm">Approve (proposer hosts)</button><button name="approve" value="no" className="btn btn-ghost btn-sm">Decline</button></div>
                </ActionForm>
              ))}</div>
            )}
          </section>

          <section className="mt-10 grid gap-6 lg:grid-cols-2">
            <ActionForm action={saveCircleCategory} className="glass space-y-3 p-6">
              <h2 className="display text-2xl">Categories</h2>
              <p className="text-xs text-muted">Create or rename a category (use an existing key to rename it).</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <label className="text-xs">Key<input name="key" required className="field mt-1 w-full" placeholder="travel" /></label>
                <label className="text-xs sm:col-span-2">Name<input name="name" required className="field mt-1 w-full" /></label>
                <label className="text-xs sm:col-span-2">Description<input name="description" className="field mt-1 w-full" /></label>
                <label className="text-xs">Order<input name="sort" type="number" defaultValue={100} className="field mt-1 w-full" /></label>
              </div>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="hidden" /> Hidden from members</label>
              <button className="btn btn-gold btn-sm">Save category</button>
              <ul className="mt-2 text-xs text-muted">{(cats ?? []).map((c) => <li key={c.key}>{c.sort} · <code>{c.key}</code> · {c.name}{c.status === "hidden" ? " (hidden)" : ""}</li>)}</ul>
            </ActionForm>

            <ActionForm action={createOfficialCircle} className="glass space-y-3 p-6">
              <h2 className="display text-2xl">Create a circle</h2>
              <label className="block text-xs">Name<input name="name" required className="field mt-1 w-full" /></label>
              <label className="block text-xs">One line<input name="tagline" className="field mt-1 w-full" /></label>
              <div className="grid gap-2 sm:grid-cols-3">
                <label className="text-xs">Category<select name="category" className="field mt-1 w-full">{(cats ?? []).map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}</select></label>
                <label className="text-xs">Type<select name="kind" className="field mt-1 w-full"><option value="open">Open</option><option value="specialized">Interest & lifestyle</option><option value="elite">Verified Elite</option></select></label>
                <label className="text-xs">Requirement<select name="eligibility" className="field mt-1 w-full"><option value="all">All members</option><option value="couples">Couples</option><option value="singles">Singles 30+</option></select></label>
              </div>
              <div className="flex flex-wrap gap-1.5">{INTERESTS.map(([k, v]) => <label key={k} className="cursor-pointer rounded-full border border-line px-2 py-0.5 text-[0.7rem] has-[:checked]:border-[#e8701a]"><input type="checkbox" name="interests" value={k} className="sr-only" />{v}</label>)}</div>
              <p className="text-[0.7rem] text-faint">Interest &amp; lifestyle circles stay open to every member; only &ldquo;Verified Elite&rdquo; requires Elite Concierge membership.</p>
              <button className="btn btn-gold btn-sm">Create circle</button>
            </ActionForm>
          </section>
        </>
      )}

      <section className="mt-10">
        <h2 className="display text-3xl">Circles</h2>
        <div className="mt-4 space-y-2">{(circles ?? []).map((c) => (
          <details key={c.id} className="glass !p-0">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <span className="font-semibold">{c.name}</span>
              <span className="text-xs text-muted">{catName[c.category] ?? c.category} · {CIRCLE_KIND_LABEL[c.kind]} · {ELIGIBILITY_LABEL[c.eligibility]} · {size[c.id] ?? 0} members{c.status !== "active" ? ` · ${c.status}` : ""}</span>
            </summary>
            {owner && (
              <div className="grid gap-3 border-t border-line p-4 lg:grid-cols-[1fr_auto]">
                <ActionForm action={renameCircle} className="grid gap-2 sm:grid-cols-3"><input type="hidden" name="id" value={c.id} />
                  <input name="name" defaultValue={c.name} className="field" /><input name="tagline" defaultValue={c.tagline ?? ""} className="field" />
                  <select name="category" defaultValue={c.category} className="field">{(cats ?? []).map((k) => <option key={k.key} value={k.key}>{k.name}</option>)}</select>
                  <button className="btn btn-ghost btn-sm sm:col-span-3 sm:justify-self-start">Save</button></ActionForm>
                <ActionForm action={archiveCircle}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="restore" value={c.status === "active" ? "no" : "yes"} /><button className="btn btn-ghost btn-sm">{c.status === "active" ? "Archive" : "Restore"}</button></ActionForm>
              </div>
            )}
          </details>
        ))}</div>
      </section>
    </>
  );
}

function TargetLink({ type, id }: { type: string; id: string }) {
  const href = type === "post" ? `/app/connect/posts/${id}` : type === "event" ? `/app/connect/events/${id}` : type === "member" ? `/app/connect/members/${id}` : null;
  return href ? <Link href={href} className="underline">open</Link> : <span>{type} {id.slice(0, 8)}</span>;
}
