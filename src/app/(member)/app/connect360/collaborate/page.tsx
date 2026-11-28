import Link from "next/link";
import { MemberMarks } from "@/components/MembershipEmblem";
import { memberMarks } from "@/lib/member-marks";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMembership } from "@/lib/membership-server";
import { atLeast } from "@/lib/membership-level";
import { INTERESTS, PURPOSES } from "@/lib/connect360";
import { LuxHero, LuxSection } from "@/components/Lux";
import { MemberForm } from "@/components/MemberForm";
import { requestCollaboration, saveCollabProfile } from "@/app/actions/connect360";

export const metadata = { title: "Find collaborators · CONNECT 360" };
export const dynamic = "force-dynamic";

type Entry = { user_id: string; display: string; industry: string | null; interests: string[]; regions: string[]; summary: string | null; owns_business: boolean | null };

/** Business collaboration preferences and the directory of members who welcome requests (directive 27 §3). */
export default async function Collaborate() {
  const viewer = (await getViewer())!;
  const membership = await getMembership(viewer);
  const premium = membership ? atLeast(membership.level, "executive") : false;
  const live = !isInsidePreview(viewer) && !viewer.viewAs;
  const db = await createClient();
  const b = db?.schema("business");
  const [{ data: mine }, { data: dir }, { data: ready }] = live && b && db && premium ? await Promise.all([
    b.from("profiles").select("collab_opt_in, collab_welcome_requests, collab_interests, collab_regions, collab_summary, collab_owns_business").eq("user_id", viewer.id).maybeSingle(),
    b.rpc("collab_directory"),
    db.rpc("professional_ready", { p: viewer.id }),
  ]) : [{ data: null }, { data: [] }, { data: false }];
  const list = (dir ?? []) as Entry[];
  const marks = db ? await memberMarks(db, list.map((e) => e.user_id)) : {};

  if (!premium) {
    return (
      <>
        <LuxHero eyebrow="CONNECT 360" title="Find collaborators" />
        <p className="glass mt-8 p-6 text-sm text-muted">Business collaboration is part of Executive Private and Elite Concierge. <Link href="/membership" className="text-gold underline">Compare memberships</Link>.</p>
      </>
    );
  }
  return (
    <>
      <LuxHero eyebrow="CONNECT 360" title="Find collaborators" tagline="The right conversation, with the right people, for the right reason." />

      <LuxSection eyebrow="Your preferences" title="What are you open to?" intro="Optional. Only Executive and Elite members see what you choose to share here, and never your financial information.">
        <MemberForm action={saveCollabProfile} className="glass space-y-5 p-6">
          <label className="flex items-center gap-3"><input type="checkbox" name="opt_in" defaultChecked={mine?.collab_opt_in ?? false} className="h-4 w-4" /><span>List my collaboration interests in the directory</span></label>
          <label className="flex items-center gap-3"><input type="checkbox" name="welcome" defaultChecked={mine?.collab_welcome_requests ?? false} className="h-4 w-4" /><span>I welcome business collaboration requests</span></label>
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Interests</legend>
            <div className="flex flex-wrap gap-2">
              {Object.entries(INTERESTS).map(([k, v]) => (
                <label key={k} className="chip cursor-pointer gap-2 normal-case tracking-normal"><input type="checkbox" name="interests" value={k} defaultChecked={mine?.collab_interests?.includes(k)} />{v}</label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm"><span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">Regions (comma-separated)</span><input name="regions" className="field w-full" defaultValue={(mine?.collab_regions ?? []).join(", ")} placeholder="Atlanta, Southeast, National" /></label>
            <label className="block text-sm"><span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">Do you currently own a business?</span>
              <select name="owns" className="field w-full" defaultValue={mine?.collab_owns_business === true ? "yes" : mine?.collab_owns_business === false ? "no" : ""}><option value="">Prefer not to say</option><option value="yes">Yes</option><option value="no">Not currently</option></select>
            </label>
          </div>
          <label className="block text-sm"><span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">A short professional summary</span><textarea name="summary" rows={3} maxLength={1500} className="field w-full" defaultValue={mine?.collab_summary ?? ""} placeholder="Your expertise and the kinds of collaborations you'd value." /></label>
          <button className="btn btn-gold btn-sm">Save preferences</button>
        </MemberForm>
      </LuxSection>

      <LuxSection eyebrow="Directory" title="Members who welcome collaboration" intro="Every request states its purpose. Recipients may accept to discuss, decline or ask for more information, and accepting is never an agreement.">
        {!ready && <p className="glass mb-5 p-5 text-sm">An approved professional résumé is needed before you send introductions. <Link href="/app/career" className="text-gold underline">Prepare it in My Professional Readiness</Link>.</p>}
        {list.length === 0 ? (
          <p className="glass p-6 text-sm text-muted">No members are listed yet. As Executive and Elite members share their collaboration interests, they&apos;ll appear here.</p>
        ) : (
          <ul className="grid gap-5 lg:grid-cols-2">
            {list.map((e) => (
              <li key={e.user_id} className="glass p-6">
                <p className="display flex flex-wrap items-center gap-2 text-2xl">{e.display}<MemberMarks distinction={marks[e.user_id]?.distinction} verified={marks[e.user_id]?.verified} size={16} /></p>
                <p className="mt-1 text-xs text-muted">{[e.industry, e.owns_business ? "Business owner" : null, e.regions.join(", ")].filter(Boolean).join(" · ")}</p>
                {e.summary && <p className="mt-3 text-sm text-muted">{e.summary}</p>}
                <p className="mt-3 flex flex-wrap gap-1.5">{e.interests.map((i) => <span key={i} className="chip normal-case tracking-normal">{INTERESTS[i] ?? i}</span>)}</p>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gold">Request a collaboration conversation</summary>
                  <MemberForm action={requestCollaboration} className="mt-3 space-y-3 text-sm">
                    <input type="hidden" name="recipient" value={e.user_id} />
                    <select name="purpose" required className="field w-full" defaultValue=""><option value="" disabled>Purpose</option>{Object.entries(PURPOSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                    <textarea name="project" required rows={3} className="field w-full" placeholder="The opportunity or project" />
                    <textarea name="reason" required rows={2} className="field w-full" placeholder="Why you're reaching out to this member" />
                    <textarea name="shared" rows={2} className="field w-full" placeholder="Business information you choose to share (optional)" />
                    <p className="text-xs text-faint">Contact details, account numbers and investment solicitations can&apos;t be included. You&apos;ll be able to talk freely once they accept.</p>
                    <button className="btn btn-gold btn-sm" disabled={!ready}>Send request</button>
                  </MemberForm>
                </details>
              </li>
            ))}
          </ul>
        )}
      </LuxSection>
    </>
  );
}
