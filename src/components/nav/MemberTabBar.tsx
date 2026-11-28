"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MEMBER_TABS } from "@/lib/nav";
import type { NavState } from "@/lib/nav-state";
import { NavIcon } from "@/components/nav/NavIcons";
import { ProfileList } from "@/components/nav/ProfileMenu";

/** Four destinations for signed-in members on phones (founder directive 35): Home · Connect · Journey · My World. */
export function MemberTabBar({ state }: { state: NavState }) {
  const path = usePathname();
  const [sheet, setSheet] = useState(false);
  useEffect(() => setSheet(false), [path]);
  const active = (t: (typeof MEMBER_TABS)[number]) => (t.href === "/app" ? path === "/app" : t.match.some((m) => path === m || path.startsWith(m + "/")));

  return (
    <>
      {sheet && (
        <div className="fixed inset-0 z-40 bg-ink/50 lg:hidden" onClick={() => setSheet(false)}>
          <div className="absolute inset-x-3 bottom-24" onClick={(e) => e.stopPropagation()}><ProfileList state={state} onNavigate={() => setSheet(false)} /></div>
        </div>
      )}
      <nav aria-label="Member" className="fixed inset-x-0 bottom-0 z-40 border-t border-champagne/50 bg-ivory/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          {MEMBER_TABS.map((t) => {
            const on = active(t);
            const cls = `flex w-full flex-col items-center gap-1 py-2.5 text-[0.7rem] transition-colors ${on ? "font-semibold text-burgundy" : "text-gold-deep"}`;
            return (
              <li key={t.label}>
                <Link href={t.href} aria-current={on ? "page" : undefined} className={cls}><NavIcon name={t.icon} className="h-6 w-6" />{t.label}</Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
