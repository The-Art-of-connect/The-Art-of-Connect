import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMembership } from "@/lib/membership-server";
import { atLeast } from "@/lib/membership-level";
import { LuxHero, LuxSection } from "@/components/Lux";
import { MemberForm } from "@/components/MemberForm";
import { createProposal } from "@/app/actions/proposals";

export const metadata = { title: "Strategic Proposals · CONNECT 360" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { draft: "Draft", authorized: "Authorized", shared: "Shared", revising: "Revising", withdrawn: "Withdrawn", archived: "Archived" };

/** Strategic Business Proposal Builder: proposals the member wrote and proposals shared with them (directive 28 §1–5). */
export default async function Proposals() {
  const viewer = (await getViewer())!;
  const membership = await getMembership(viewer);
  const premium = membership ? atLeast(membership.level, "executive") : false;
  const live = !isInsidePreview(viewer) && !viewer.viewAs;
  const db = await createClient();
  const { data } = live && db ? await db.schema("business").from("proposals").select("id, author_id, title, status, current_version, updated_at").order("updated_at", { ascending: false }) : { data: [] };
  const mine = (data ?? []).filter((p) => p.author_id === viewer.id);
  const shared = (data ?? []).filter((p) => p.author_id !== viewer.id);
  const card = (p: (typeof mine)[number]) => (
    <li key={p.id}><Link href={`/app/connect360/proposals/${p.id}`} className="glass glass-edge block p-6 transition hover:-translate-y-0.5">
      <p className="eyebrow">{STATUS[p.status]} · version {p.current_version}</p>
      <p className="display mt-2 text-2xl">{p.title}</p>
      <p className="mt-1 text-xs text-muted">Updated {new Date(p.updated_at).toLocaleDateString()}</p>
    </Link></li>
  );
  return (
    <>
      <LuxHero eyebrow="CONNECT 360" title="Strategic Proposals" tagline="Present your vision with clarity, honesty and polish." />
      {mine.length > 0 && <LuxSection eyebrow="Yours" title="Your proposals"><ul className="grid gap-4 md:grid-cols-2">{mine.map(card)}</ul></LuxSection>}
      {shared.length > 0 && <LuxSection eyebrow="Shared with you" title="Proposals to review"><ul className="grid gap-4 md:grid-cols-2">{shared.map(card)}</ul></LuxSection>}
      {premium ? (
        <LuxSection eyebrow="Begin" title="Start a proposal" intro="Work through guided sections at your own pace. Drafts stay private until you authorize a version for sharing.">
          <MemberForm action={createProposal} className="glass max-w-2xl space-y-3 p-6">
            <input name="title" required minLength={3} maxLength={200} className="field w-full" placeholder="e.g. Southeast distribution partnership proposal" />
            <button className="btn btn-gold btn-sm">Create proposal</button>
          </MemberForm>
        </LuxSection>
      ) : (
        <p className="glass mt-10 p-6 text-sm text-muted">The Strategic Proposal Builder is part of Executive Private and Elite Concierge. <Link href="/membership" className="text-gold underline">Compare memberships</Link>.</p>
      )}
    </>
  );
}
