import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PURPOSES } from "@/lib/connect360";
import { BASIS, NONBINDING, RESPONSES, SECTIONS, normalizeSections } from "@/lib/proposals";
import { MemberForm } from "@/components/MemberForm";
import { ProposalEditor } from "@/components/ProposalEditor";
import { authorizeProposal, respondToProposal, sendProposal } from "@/app/actions/proposals";

export const metadata = { title: "Proposal · CONNECT 360" };
export const dynamic = "force-dynamic";

type Version = { id: string; version: number; status: string; sections: unknown; authorized_at: string | null; change_note: string | null; created_at: string };

export default async function Proposal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = (await getViewer())!;
  const db = (await createClient())!;
  const b = db.schema("business");
  const { data: p } = await b.from("proposals").select("id, author_id, title, status, room_id").eq("id", id).maybeSingle();
  if (!p) notFound();
  const author = p.author_id === viewer.id;
  const [{ data: vs }, { data: responses }, { data: directory }] = await Promise.all([
    b.from("proposal_versions").select("id, version, status, sections, authorized_at, change_note, created_at").eq("proposal_id", id).order("version", { ascending: false }),
    b.from("proposal_responses").select("id, version, responder_id, kind, note, created_at").eq("proposal_id", id).order("created_at", { ascending: false }),
    author ? b.rpc("collab_directory") : Promise.resolve({ data: [] }),
  ]);
  const versions = (vs ?? []) as Version[];
  const latest = versions[0];
  const authorized = versions.find((v) => v.status === "authorized");
  const shown = author ? latest : authorized;

  return (
    <>
      <Link href="/app/connect360/proposals" className="text-sm text-gold">← Strategic Proposals</Link>
      <section className="theme-dark relative mt-4 overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10" style={{ background: "var(--ink)" }}>
        <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "var(--glow)" }} aria-hidden="true" />
        <div className="relative">
          <p className="eyebrow">Strategic business proposal{shown ? ` · version ${shown.version}` : ""}</p>
          <h1 className="display mt-3 text-4xl text-gold-bright sm:text-5xl">{p.title}</h1>
          <p className="mt-4 max-w-3xl text-xs text-muted">{NONBINDING}</p>
          {authorized && <Link href={`/app/connect360/proposals/${id}/print`} className="btn btn-ghost btn-sm mt-5">Print or save as PDF</Link>}
        </div>
      </section>

      {author ? (
        <>
          <div className="mt-6"><ProposalEditor id={id} title={p.title} sections={normalizeSections(latest?.sections)} editingAuthorized={latest?.status !== "draft"} /></div>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <section className="glass p-6 text-sm">
              <p className="eyebrow">Authorize</p>
              {latest?.status === "draft" ? (
                <MemberForm action={authorizeProposal} className="mt-3 space-y-3">
                  <input type="hidden" name="id" value={id} />
                  <label className="flex gap-2"><input type="checkbox" name="confirm" />I&apos;ve reviewed this proposal. Statements labeled as facts are accurate, and estimates and assumptions are labeled as such.</label>
                  <button className="btn btn-gold btn-sm">Authorize version {latest.version} for sharing</button>
                </MemberForm>
              ) : <p className="mt-2 text-muted">Version {latest?.version} is authorized. Edit above to start a new draft.</p>}
            </section>
            <section className="glass p-6 text-sm">
              <p className="eyebrow">Share through the inbox</p>
              {authorized ? (
                <MemberForm action={sendProposal} className="mt-3 space-y-2">
                  <input type="hidden" name="id" value={id} />
                  <select name="recipient" className="field w-full" defaultValue="" required><option value="" disabled>Member who welcomes requests</option>{((directory ?? []) as { user_id: string; display: string }[]).map((m) => <option key={m.user_id} value={m.user_id}>{m.display}</option>)}</select>
                  <select name="purpose" className="field w-full" defaultValue="" required><option value="" disabled>Purpose</option>{Object.entries(PURPOSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                  <textarea name="reason" rows={2} className="field w-full" placeholder="Why you're sharing it with them" required />
                  <button className="btn btn-gold btn-sm">Share version {authorized.version}</button>
                  <p className="text-xs text-faint">An approved résumé is needed to share proposals. They&apos;ll see only authorized versions.</p>
                </MemberForm>
              ) : <p className="mt-2 text-muted">Authorize a version first.</p>}
            </section>
            <section className="glass p-6 text-sm">
              <p className="eyebrow">Version history</p>
              <ul className="mt-3 space-y-2">
                {versions.map((v) => <li key={v.id}><span className="font-semibold">v{v.version}</span> · {v.status === "draft" ? "Draft" : v.status === "authorized" ? `Authorized ${new Date(v.authorized_at!).toLocaleDateString()}` : "Superseded"}<span className="block text-xs text-muted">{new Date(v.created_at).toLocaleString()}{v.change_note ? ` · ${v.change_note}` : ""}</span></li>)}
              </ul>
            </section>
          </div>
        </>
      ) : shown ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <article className="space-y-4">
            {SECTIONS.filter((s) => normalizeSections(shown.sections)[s.key]).map((s) => {
              const sec = normalizeSections(shown.sections)[s.key];
              return <section key={s.key} className="glass p-6"><p className="flex flex-wrap items-baseline justify-between gap-2"><span className="display text-xl">{s.title}</span><span className="chip normal-case tracking-normal">{BASIS[sec.basis]}</span></p><p className="mt-3 whitespace-pre-line text-sm">{sec.text}</p></section>;
            })}
          </article>
          <aside>
            <MemberForm action={respondToProposal} className="glass space-y-3 p-6 text-sm xl:sticky xl:top-20">
              <p className="eyebrow">Your response to version {shown.version}</p>
              <input type="hidden" name="id" value={id} /><input type="hidden" name="version" value={shown.version} />
              <select name="kind" className="field w-full" defaultValue="accept_discussion">{Object.entries(RESPONSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <textarea name="note" rows={4} className="field w-full" placeholder="A note, questions or suggested revisions (optional)" />
              <button className="btn btn-gold btn-sm">Send response</button>
              <p className="text-xs text-faint">Responses are never acceptance of an agreement or a financial commitment. You may invite your own attorney or accountant in a Business Deal Room.</p>
            </MemberForm>
          </aside>
        </div>
      ) : <p className="glass mt-6 p-6 text-sm text-muted">No authorized version is available yet.</p>}

      {(responses ?? []).length > 0 && (
        <section className="glass mt-8 p-6 text-sm">
          <p className="eyebrow">Responses</p>
          <ul className="mt-3 divide-y divide-line">
            {(responses ?? []).map((r) => <li key={r.id} className="py-3"><span className="font-semibold">{RESPONSES[r.kind]}</span> · version {r.version}{r.responder_id === viewer.id ? " · you" : ""}<span className="block text-xs text-muted">{new Date(r.created_at).toLocaleString()}</span>{r.note && <p className="mt-1 whitespace-pre-line text-muted">{r.note}</p>}</li>)}
          </ul>
        </section>
      )}
    </>
  );
}
