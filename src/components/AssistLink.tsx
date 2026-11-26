"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Quiet link at the foot of every member page: report a problem or suggest an idea, with the page filled in. */
export function AssistLink() {
  const path = usePathname() ?? "";
  if (path.startsWith("/app/assist")) return null;
  return (
    <p className="mx-auto mt-16 max-w-7xl px-4 text-center text-xs text-faint sm:px-8">
      Something not working, or an idea to share? <Link href={`/app/assist?from=${encodeURIComponent(path)}`} className="text-gold-deep underline underline-offset-2">Help &amp; suggestions</Link>
    </p>
  );
}
