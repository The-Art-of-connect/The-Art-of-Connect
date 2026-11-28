import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMembership } from "@/lib/membership-server";
import { LEVEL_LABEL } from "@/lib/membership-level";
import { QA_PERSONAS } from "@/lib/qa-switcher";
import { switchQaExperience } from "@/app/actions/qa-switcher";

export const metadata: Metadata = { title: "QA experience switcher", robots: { index: false } };

/** Only the owner-listed fictional QA account sees this page; everyone else gets a 404. */
export default async function QaSwitcherPage() {
  const viewer = await getViewer();
  const db = await createClient();
  if (!viewer || !db) notFound();
  const { data: qa } = await db.from("qa_switchers").select("persona, expires_at").eq("user_id", viewer.id).maybeSingle();
  if (!qa) notFound();
  const m = await getMembership(viewer);
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="eyebrow">Quality assurance</p>
      <h1 className="display mt-3 text-4xl">Choose an experience</h1>
      <p className="mt-3 text-sm text-muted">
        Fictional test account. Switching changes only this account&apos;s complimentary access. No payment, no admin controls
        and no real member information. Access ends {new Date(qa.expires_at).toLocaleDateString("en-US", { dateStyle: "long" })}.
      </p>
      <p className="mt-6 text-sm">Currently viewing as: <span className="text-gold">{LEVEL_LABEL[m?.level ?? "free"]}</span>{qa.persona === "couples" && " (couples)"}</p>
      <ul className="mt-6 grid gap-3">
        {QA_PERSONAS.map((p) => (
          <li key={p.key}>
            <form action={switchQaExperience} className="glass flex items-center justify-between gap-4 p-4">
              <input type="hidden" name="persona" value={p.key} />
              <span><span className="display block text-xl">{p.label}</span><span className="text-xs text-muted">{p.note}</span></span>
              {qa.persona === p.key ? <span className="text-xs text-gold">Active</span> : <button className="btn btn-gold btn-sm">Switch</button>}
            </form>
          </li>
        ))}
      </ul>
      <Link href="/app/qa/participants" className="btn btn-gold mt-8 w-full">Fictional participants for In Love testing</Link>
      <Link href="/app" className="btn btn-ghost mt-3 w-full">Go to my home</Link>
    </div>
  );
}
