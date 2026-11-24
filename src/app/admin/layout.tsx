import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Monogram } from "@/components/Emblem";
import { getViewer, isStaff } from "@/lib/auth";
import { ADMIN_SECTIONS } from "@/lib/admin";
import { getLaunchState } from "@/lib/launch";

export const metadata: Metadata = { title: "Owner Portal", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in?next=/admin");
  if (!isStaff(viewer)) redirect("/app");
  const launch = await getLaunchState();
  const sections = ADMIN_SECTIONS.filter((s) => s.roles.some((r) => viewer.roles.includes(r)));
  const groups = [...new Set(sections.map((s) => s.group))];

  return (
    <div className="theme-ivory min-h-dvh lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="theme-dark border-b border-line lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/admin" className="flex items-center gap-3">
            <Monogram height={30} />
            <span>
              <span className="display block text-lg leading-none">Owner Portal</span>
              <span className="text-[0.65rem] tracking-[0.2em] uppercase text-faint">The Art of Connect</span>
            </span>
          </Link>
        </div>
        <div className="mx-5 mb-4 rounded-xl border border-line px-3 py-2 text-xs">
          {launch.locked ? (
            <span className="text-gold">● Pre-launch — platform locked</span>
          ) : (
            <span className="text-success">● Launch lock released</span>
          )}
        </div>
        {/* Mobile: horizontal rail. Desktop: grouped sidebar. */}
        <nav className="flex gap-2 overflow-x-auto px-4 pb-4 lg:hidden" aria-label="Owner Portal">
          {sections.map((s) => (
            <Link key={s.href} href={s.href} className="chip shrink-0 normal-case tracking-normal">{s.label}</Link>
          ))}
        </nav>
        <nav className="hidden space-y-6 px-3 pb-8 lg:block" aria-label="Owner Portal">
          {groups.map((g) => (
            <div key={g}>
              <p className="px-3 pb-2 text-[0.62rem] tracking-[0.28em] uppercase text-faint">{g}</p>
              {sections.filter((s) => s.group === g).map((s) => (
                <Link key={s.href} href={s.href} className="block rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-white/5 hover:text-text">
                  {s.label}
                </Link>
              ))}
            </div>
          ))}
          <div className="border-t border-line px-3 pt-4 text-xs text-faint">
            <p className="truncate">{viewer.email}</p>
            <p className="mt-1 capitalize text-gold">{viewer.roles.join(" · ")}</p>
            <div className="mt-3 flex gap-4">
              <Link href="/app" className="hover:text-text">Member view</Link>
              <form action="/auth/sign-out" method="post"><button className="hover:text-text">Sign out</button></form>
            </div>
          </div>
        </nav>
      </aside>
      <main className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12">{children}</main>
    </div>
  );
}
