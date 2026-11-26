import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/admin/ActionForm";
import { connectionAction } from "@/app/actions/social";
import { PURPOSES, type Purpose } from "@/lib/connection-intelligence";
import { people, signPhotos } from "@/lib/social-server";
import { recommendPeople } from "@/lib/social-recommend";
import { Avatar, PersonName } from "@/components/social/ui";

export const metadata = { title: "Find People Like Me" };

/** Find People Like Me: purpose-specific, explained, voluntary. Plus requests and connections. */
export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ for?: string }> }) {
  const viewer = (await getViewer())!;
  if (isInsidePreview(viewer) || viewer.viewAs) return <p className="rounded-2xl border border-gold/40 bg-gold/10 p-4 text-sm">Preview: sign in with your own account.</p>;
  const wanted = (await searchParams).for;
  const purpose = (PURPOSES.find((p) => p.id === wanted)?.id ?? "peers") as Purpose;
  const db = (await createClient())!;
  const [recs, { data: conns }, { data: pref }] = await Promise.all([
    recommendPeople(viewer.id, purpose),
    db.from("social_connections").select("requester_id, addressee_id, intention, note, status").or(`requester_id.eq.${viewer.id},addressee_id.eq.${viewer.id}`),
    db.from("social_preferences").select("answers").eq("user_id", viewer.id).maybeSingle(),
  ]);
  const incoming = (conns ?? []).filter((c) => c.status === "pending" && c.addressee_id === viewer.id);
  const accepted = (conns ?? []).filter((c) => c.status === "accepted").map((c) => (c.requester_id === viewer.id ? c.addressee_id : c.requester_id));
  const dir = await people(db, [...recs.map((r) => r.id), ...incoming.map((c) => c.requester_id), ...accepted]);
  const urls = await signPhotos(db, Object.values(dir).map((d) => d.avatar_path));
  const meta = PURPOSES.find((p) => p.id === purpose)!;
  const noPrefs = !pref || Object.keys((pref.answers as object) ?? {}).length === 0;

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Connection Intelligence</p>
        <h1 className="display mt-2 text-4xl">Find People Like Me</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">Choose what you&rsquo;re looking for. Each kind of connection is matched on what matters for it, with the reasons shown. Only members who chose to be available for that kind of connection appear. The system recommends; you decide.</p>
      </header>

      {incoming.length > 0 && (
        <section className="glass p-5">
          <h2 className="display text-2xl">Connection requests</h2>
          <ul className="mt-3 divide-y divide-line">{incoming.map((c) => (
            <li key={c.requester_id} className="flex flex-wrap items-center gap-3 py-3">
              <Avatar name={dir[c.requester_id]?.display_name ?? null} url={dir[c.requester_id]?.avatar_path ? urls[dir[c.requester_id]!.avatar_path!] : null} />
              <div className="min-w-0 flex-1"><PersonName p={dir[c.requester_id]} id={c.requester_id} /><p className="text-xs text-muted">{PURPOSES.find((p) => p.id === c.intention)?.label ?? c.intention}{c.note ? ` · “${c.note}”` : ""}</p></div>
              <ActionForm action={connectionAction}><input type="hidden" name="user_id" value={c.requester_id} /><input type="hidden" name="op" value="accept" /><button className="btn btn-gold btn-sm">Accept</button></ActionForm>
              <ActionForm action={connectionAction}><input type="hidden" name="user_id" value={c.requester_id} /><input type="hidden" name="op" value="decline" /><button className="btn btn-ghost btn-sm">Decline</button></ActionForm>
            </li>
          ))}</ul>
        </section>
      )}

      <nav className="flex flex-wrap gap-2" aria-label="What are you looking for?">{PURPOSES.map((p) => (
        <Link key={p.id} href={`/app/connect/people?for=${p.id}`} className={`rounded-full border px-3 py-1.5 text-sm ${p.id === purpose ? "border-gold bg-gold/10 font-semibold" : "border-line"}`}>{p.label}</Link>
      ))}</nav>
      {meta.direction && <p className="-mt-4 text-xs uppercase tracking-[0.18em] text-gold-deep">{meta.direction}</p>}
      {noPrefs && purpose !== "explore" && <p className="rounded-2xl border border-[#e8701a]/40 bg-[#e8701a]/5 p-4 text-sm">For better suggestions, answer a few private questions in <Link href="/app/connect/preferences" className="font-semibold underline">My connection preferences</Link>. Make sure your profile says what you&rsquo;re available for, too.</p>}

      {recs.length === 0 ? (
        <div className="glass p-8 text-center text-sm text-muted">No suggestions yet for this kind of connection. As more members join and share their preferences, they&rsquo;ll appear here. Meanwhile, explore <Link href="/app/connect/circles" className="text-gold underline">circles</Link>.</div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">{recs.map((r) => {
          const d = dir[r.id]; if (!d) return null;
          return (
            <li key={r.id} className="glass p-5">
              <div className="flex items-start gap-3">
                <Avatar name={d.display_name} url={d.avatar_path ? urls[d.avatar_path] : null} size={52} />
                <div className="min-w-0 flex-1"><PersonName p={d} id={r.id} />{d.headline && <p className="text-xs text-muted">{d.headline}</p>}</div>
                <span className={`rounded-full px-2 py-0.5 text-[0.65rem] uppercase tracking-wider ${r.fit === "strong" ? "bg-[#e8701a]/15 text-[#c8701a]" : "bg-gold/10 text-gold-deep"}`}>{r.fit === "strong" ? "Naturally aligned" : "Worth meeting"}</span>
              </div>
              <ul className="mt-3 space-y-1 text-sm">{r.reasons.slice(0, 3).map((x) => <li key={x}>· {x}</li>)}</ul>
              {d.connection_status ? <p className="mt-3 text-xs text-muted">{d.connection_status === "accepted" ? "Connected" : "Request pending"}</p> : (
                <ActionForm action={connectionAction} className="mt-3 flex gap-2"><input type="hidden" name="user_id" value={r.id} /><input type="hidden" name="op" value="request" /><input type="hidden" name="intention" value={purpose === "mentorship_seek" ? "mentorship_seek" : purpose === "mentorship_offer" ? "mentorship_offer" : purpose} />
                  <button className="btn btn-gold btn-sm">Request to connect</button><Link href={`/app/connect/members/${r.id}`} className="btn btn-ghost btn-sm">View profile</Link></ActionForm>
              )}
            </li>
          );
        })}</ul>
      )}
      <p className="text-xs text-faint">Suggestions are not guarantees of a successful friendship, partnership or relationship. They never consider income, Elite status or membership level, and your private answers are never shown to anyone. Romantic introductions remain in The Personal Society.</p>

      <section>
        <h2 className="display text-2xl">My connections ({accepted.length})</h2>
        {accepted.length === 0 ? <p className="mt-2 text-sm text-muted">None yet.</p> : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">{accepted.map((uid) => (
            <li key={uid} className="flex items-center gap-3 rounded-2xl border border-line p-3"><Avatar name={dir[uid]?.display_name ?? null} url={dir[uid]?.avatar_path ? urls[dir[uid]!.avatar_path!] : null} size={36} /><PersonName p={dir[uid]} id={uid} /></li>
          ))}</ul>
        )}
      </section>
    </div>
  );
}
