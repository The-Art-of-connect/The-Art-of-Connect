import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Emblem";
import { getViewer, hasRole, isInsidePreview, isStaff } from "@/lib/auth";
import { OwnerReview, SectionGate } from "@/components/OwnerReview";
import { ViewAsBar } from "@/components/ViewAsBar";
import { AgreementForm } from "@/components/AgreementForm";
import { createClient } from "@/lib/supabase/server";
import { SiteSearch } from "@/components/SiteSearch";
import { DesktopNav } from "@/components/nav/DesktopNav";
import { ProfileMenu } from "@/components/nav/ProfileMenu";
import { MemberTabBar } from "@/components/nav/MemberTabBar";
import { MobileMenu } from "@/components/MobileMenu";
import { getNavState } from "@/lib/nav-state";
import { entriesFor, pick } from "@/lib/search-scope";
import { JourneyCompanion } from "@/components/JourneyCompanion";
import { guideAccess } from "@/lib/journey-guide-access";
import { avatarById } from "@/lib/journey-customize";

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
  const reviewer = hasRole(viewer, ["owner", "executive"]) && !viewer.viewAs;
  const searchable = entriesFor(viewer);
  const [nav, journeyAccess] = await Promise.all([getNavState(), guideAccess()]);
  const { data: look } = !preview && sb ? await sb.from("journey_voice_preferences").select("avatar").eq("user_id", viewer.id).maybeSingle() : { data: null };
  const quick = pick(searchable, ["/app", "/app/journey", "/app/business", "/app/relationships", "/app/counseling", "/app/membership", "/app/safety", "/"]);
  return (
    <div className="theme-ivory min-h-dvh">
      <header className="theme-dark sticky top-0 z-30 border-b border-line !bg-espresso/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-8">
          <Link href="/app" aria-label="My dashboard"><Wordmark /></Link>
          <DesktopNav state={nav} />
          <div className="flex items-center gap-2 sm:gap-3">
            <SiteSearch entries={searchable} quick={quick} home={{ href: "/app", label: "My dashboard" }} />
            {reviewer && <Link href="/inside-preview" className="btn btn-ghost btn-sm hidden xl:inline-flex">All preview pages</Link>}
            {preview ? <a href="/" className="btn btn-ghost btn-sm">Home</a> : <ProfileMenu state={nav} />}
            <MobileMenu state={nav} />
          </div>
        </div>
      </header>
      {hasRole(viewer, ["owner"]) && !preview && <ViewAsBar current={viewer.viewAs} />}
      {preview && (
        <div className="border-b border-gold/30 bg-gold/10 px-4 py-2.5 text-center text-xs text-gold sm:text-sm">
          Owner review preview — you’re seeing the member area as an empty new member. Nothing can be saved.{" "}
          <a href="/inside-preview/enter?exit=1" className="font-semibold underline">End preview</a>
        </div>
      )}
      <main className="mx-auto max-w-7xl px-4 pb-28 pt-10 sm:px-8 lg:pb-10">
        {pending.length ? (
          <section className="glass mx-auto max-w-2xl p-7 sm:p-9">
            <p className="eyebrow">Your agreements</p>
            <h1 className="display mt-3 text-4xl">Please review our updated agreements.</h1>
            <p className="mt-3 mb-6 text-sm text-muted">We’ve published new or updated terms. Review them and confirm to continue. Questions: info@theartofconnect.com</p>
            <AgreementForm docs={pending.map((p) => ({ slug: p.slug, title: p.title, version: p.version_label, reason: p.reason }))} />
          </section>
        ) : (
          <SectionGate status={status} notes={notes} staff={isStaff(viewer) || preview || Boolean(viewer.viewAs)}>{children}</SectionGate>
        )}
      </main>
      {reviewer && <OwnerReview status={status} />}
      {!preview && !pending.length && <JourneyCompanion access={journeyAccess} avatar={look?.avatar ? avatarById(look.avatar).image ?? null : null} />}
      {!preview && <MemberTabBar state={nav} />}
    </div>
  );
}
