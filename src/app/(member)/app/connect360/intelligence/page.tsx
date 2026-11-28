import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMembership } from "@/lib/membership-server";
import { atLeast } from "@/lib/membership-level";
import { LuxHero, LuxSection } from "@/components/Lux";
import { MemberForm } from "@/components/MemberForm";
import { createAssignment } from "@/app/actions/intelligence";
import { CATEGORY_LABEL } from "@/lib/connect360";

export const metadata = { title: "My Intelligence Office · CONNECT 360" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { draft: "Draft", clarifying: "Clarifying", queued: "Queued", researching: "Researching", verifying: "Verifying", needs_member: "Needs you", complete: "Report ready", paused: "Paused", cancelled: "Cancelled", failed: "Didn't complete" };

/** My Intelligence Office: research assignments carried out by Journey with our research partners (directives 24–26). */
export default async function IntelligenceOffice() {
  const viewer = (await getViewer())!;
  const membership = await getMembership(viewer);
  const level = membership?.level ?? "free";
  const premium = atLeast(level, "executive");
  const live = !isInsidePreview(viewer) && !viewer.viewAs;
  const db = await createClient();
  const { data } = live && db && premium ? await db.from("intel_assignments").select("id, title, category, status, depth, updated_at").eq("user_id", viewer.id).order("updated_at", { ascending: false }) : { data: [] };
  if (!premium) {
    return (<><LuxHero eyebrow="CONNECT 360" title="My Intelligence Office" /><p className="glass mt-8 p-6 text-sm text-muted">My Intelligence Office is part of Executive Private and Elite Concierge. <Link href="/membership" className="text-gold underline">Compare memberships</Link>.</p></>);
  }
  return (
    <>
      <LuxHero eyebrow="CONNECT 360 · Global Intelligence Division" title="My Intelligence Office" tagline="Tell Journey what you're pursuing. We'll find what matters, and show you where it came from." />
      <p className="mx-auto mt-6 max-w-3xl text-center text-xs text-faint">Research uses only public information from cited sources, labeled confirmed, corroborated, unverified or suggestion. Findings are never a guarantee, and your research is private to you.</p>
      {(data ?? []).length > 0 && (
        <LuxSection eyebrow="Your assignments" title="Research in progress and reports">
          <ul className="grid gap-4 md:grid-cols-2">{(data ?? []).map((a) => (
            <li key={a.id}><Link href={`/app/connect360/intelligence/${a.id}`} className="glass glass-edge block p-6 transition hover:-translate-y-0.5">
              <p className="eyebrow">{CATEGORY_LABEL[a.category]} · {a.depth === "deep" ? "In-depth" : "Standard"}</p>
              <p className="display mt-2 text-2xl">{a.title}</p>
              <p className="mt-1 text-xs text-gold">{STATUS[a.status]}</p>
            </Link></li>
          ))}</ul>
        </LuxSection>
      )}
      <LuxSection eyebrow="New assignment" title="What would you like to explore?" intro="Describe the opportunity or question. Leave out personal details; Journey prepares a research plan, asks if anything is unclear, and our partners do the rest.">
        <MemberForm action={createAssignment} className="glass max-w-3xl space-y-3 p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="title" required minLength={3} maxLength={160} className="field" placeholder="Title, e.g. Franchise opportunities in Georgia" />
            <select name="category" className="field" defaultValue="business-ownership">{Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </div>
          <textarea name="objective" required minLength={20} rows={5} maxLength={6000} className="field w-full" placeholder="Your objective, what you already know, and what a great result would look like." />
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="radio" name="depth" value="standard" defaultChecked />Standard</label>
            <label className="flex items-center gap-2"><input type="radio" name="depth" value="deep" disabled={level !== "elite"} />In-depth {level !== "elite" && <span className="text-xs text-faint">(Elite)</span>}</label>
            <button className="btn btn-gold btn-sm ml-auto">Create assignment</button>
          </div>
        </MemberForm>
      </LuxSection>
    </>
  );
}
