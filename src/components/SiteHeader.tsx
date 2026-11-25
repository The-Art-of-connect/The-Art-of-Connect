import Link from "next/link";
import { Wordmark } from "@/components/Emblem";
import { MobileMenu } from "@/components/MobileMenu";
import { PreviewButton } from "@/components/PreviewButton";
import { SiteSearch } from "@/components/SiteSearch";
import { DesktopNav } from "@/components/nav/DesktopNav";
import { ProfileMenu } from "@/components/nav/ProfileMenu";
import { SITE_PAGES } from "@/lib/search-index";
import { getNavState } from "@/lib/nav-state";

const QUICK = ["/", "/membership", "/emotional-intelligence", "/business/explore", "/webinars", "/love", "/life", "/sign-in"]
  .map((h) => SITE_PAGES.find((e) => e.href === h)!)
  .filter(Boolean);

export async function SiteHeader() {
  const state = await getNavState();
  return (
    <header className="theme-dark sticky top-0 z-40 border-b border-line !bg-espresso/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-8">
        <Link href="/" aria-label="The Art of Connect — home" className="shrink-0"><Wordmark /></Link>
        <DesktopNav state={state} />
        <div className="flex items-center gap-2 sm:gap-3">
          <SiteSearch entries={SITE_PAGES} quick={QUICK} />
          <PreviewButton />
          {state.signedIn ? <Link href="/app" className="btn btn-gold btn-sm hidden sm:inline-flex">My Dashboard</Link> : <Link href="/membership#build" className="btn btn-gold btn-sm hidden sm:inline-flex">Build Your Membership</Link>}
          <ProfileMenu state={state} />
          <MobileMenu state={state} />
        </div>
      </div>
    </header>
  );
}
