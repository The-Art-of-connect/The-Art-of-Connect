import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <p className="eyebrow">Members</p>
      <h1 className="display mt-4 mb-8 text-4xl">Welcome back.</h1>
      <SignInForm next={next} />
      <p className="mt-4 text-center text-sm"><Link href="/forgot-password" className="text-gold underline">Forgot your password?</Link></p>
      <p className="mt-8 text-center text-sm text-muted">
        Not a member yet? <Link href="/membership#build" className="text-gold hover:text-gold-bright">Build Your Membership</Link>
      </p>
    </>
  );
}
