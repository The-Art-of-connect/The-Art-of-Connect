import Link from "next/link";
import { Wordmark } from "@/components/Emblem";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="theme-dark border-b border-line">
        <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-8">
          <Link href="/" aria-label="Home"><Wordmark /></Link>
        </div>
      </header>
      <main className="band theme-ivory flex flex-1 items-center justify-center px-4 py-16">
        <div className="glass glass-edge w-full max-w-md p-7 sm:p-10">{children}</div>
      </main>
    </div>
  );
}
