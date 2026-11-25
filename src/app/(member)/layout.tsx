import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Emblem";
import { getViewer, isStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in?next=/app");
  return (
    <div className="theme-ivory min-h-dvh">
      <header className="theme-dark sticky top-0 z-30 border-b border-line !bg-espresso/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
          <Link href="/app"><Wordmark /></Link>
          <div className="flex items-center gap-3">
            <Link href="/app/membership" className="hidden text-sm text-muted hover:text-text sm:inline">My membership</Link>
            {isStaff(viewer) && <Link href="/admin" className="btn btn-ghost btn-sm">Owner Portal</Link>}
            <form action="/auth/sign-out" method="post">
              <button className="text-sm text-muted hover:text-text">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-8">{children}</main>
    </div>
  );
}
