import Link from "next/link";
import { Wordmark } from "@/components/Emblem";
import { MobileMenu } from "@/components/MobileMenu";
import { SITE_NAV } from "@/lib/nav";
import { PreviewButton } from "@/components/PreviewButton";
import { SiteSearch } from "@/components/SiteSearch";
import { SITE_PAGES } from "@/lib/search-index";

const QUICK = ["/", "/membership", "/business/explore", "/webinars", "/love", "/life", "/legal", "/sign-in"]
  .map((h) => SITE_PAGES.find((e) => e.href === h)!)
  .filter(Boolean);

export function SiteHeader() {
  return (
    <header className="theme-dark sticky top-0 z-40 border-b border-line !bg-espresso/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-8">
        <Link href="/" aria-label="The Art of Connect — home" className="shrink-0">
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-1.5 text-[0.82rem] text-ivory/85 lg:flex xl:gap-2" aria-label="Primary">
          {SITE_NAV.map((l) => (
            <Link key={l.href} href={l.href} className="nav-pill">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <SiteSearch entries={SITE_PAGES} quick={QUICK} />
          <PreviewButton />
          <Link href="/sign-in" className="nav-pill hidden text-[0.82rem] text-ivory/85 lg:inline-flex">Sign in</Link>
          <Link href="/membership#build" className="btn btn-gold btn-sm hidden sm:inline-flex">Build Your Membership</Link>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
