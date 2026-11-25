import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Emblem";
import { getViewer, hasRole, isInsidePreview, isStaff } from "@/lib/auth";
import { OwnerReview, SectionGate } from "@/components/OwnerReview";
import { AgreementForm } from "@/components/AgreementForm";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in?next=/app");
  // New or updated agreements must be accepted before continuing (never for staff).
  let pending: { slug: string; title: string; version_label: string; reason: string }[] = [];
  const preview = isInsidePreview(viewer);
  if (!isStaff(viewer) && !preview) {
    const supabase = await createClient();
    const { data } = (await supabase?.rpc("pending_legal_acceptances")) ?? { data: null };
    pending = (data as typeof pending | null) ?? [];
  }
  // Pages the owner has switched to "Coming soon" (read by everyone; changed only by the owner).
  const sb = await createClient();
  const { data: statusRows } = (await sb?.from("section_status").select("path, status, member_note")) ?? { data: null };
  const status = Object.fromEntries((statusRows ?? []).map((r) => [r.path, r.status]));
  const notes = Object.fromEntries((statusRows ?? []).map((r) => [r.path, r.member_note]));
  const reviewer = hasRole(viewer, ["owner", "executive"]);
  return (
    <div className="theme-ivory min-h-dvh">
      <header className="theme-dark sticky top-0 z-30 border-b border-line !bg-espresso/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
          <Link href="/app"><Wordmark /></Link>
          <div className="flex items-center gap-3">
            <Link href="/app/journey" className="hidden text-sm text-muted hover:text-text sm:inline">Journey</Link>
            <Link href="/app/membership" className="hidden text-sm text-muted hover:text-text sm:inline">My membership</Link>
            <Link href="/app/safety" className="hidden text-sm text-muted hover:text-text sm:inline">Safety</Link>
            <Link href="/legal" className="hidden text-sm text-muted hover:text-text sm:inline">Legal</Link>
            {reviewer && <Link href="/inside-preview" className="btn btn-ghost btn-sm hidden sm:inline-flex">All preview pages</Link>}
            {isStaff(viewer) && <Link href="/admin" className="btn btn-ghost btn-sm">Owner Portal</Link>}
            {preview ? (
              <a href="/" className="btn btn-ghost btn-sm">Home</a>
            ) : (
              <form action="/auth/sign-out" method="post">
                <button className="text-sm text-muted hover:text-text">Sign out</button>
              </form>
            )}
          </div>
        </div>
      </header>
      {preview && (
        <div className="border-b border-gold/30 bg-gold/10 px-4 py-2.5 text-center text-xs text-gold sm:text-sm">
          Owner review preview — you’re seeing the member area as an empty new member. Nothing can be saved.{" "}
          <a href="/inside-preview/enter?exit=1" className="font-semibold underline">End preview</a>
        </div>
      )}
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-8">
        {pending.length ? (
          <section className="glass mx-auto max-w-2xl p-7 sm:p-9">
            <p className="eyebrow">Your agreements</p>
            <h1 className="display mt-3 text-4xl">Please review our updated agreements.</h1>
            <p className="mt-3 mb-6 text-sm text-muted">We’ve published new or updated terms. Review them and confirm to continue. Questions: info@theartofconnect.com</p>
            <AgreementForm docs={pending.map((p) => ({ slug: p.slug, title: p.title, version: p.version_label, reason: p.reason }))} />
          </section>
        ) : (
          <SectionGate status={status} notes={notes} staff={isStaff(viewer) || preview}>{children}</SectionGate>
        )}
      </main>
      {reviewer && <OwnerReview status={status} />}
    </div>
  );
}
