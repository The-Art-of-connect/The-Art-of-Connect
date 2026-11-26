"use client";
import { useEffect, useState } from "react";
import { endOwnerTestSession } from "@/app/actions/owner-test";

/** Shown on every page while an owner testing session is active in this browser. */
export function OwnerTestBanner() {
  const [until, setUntil] = useState<number | null>(null);
  useEffect(() => {
    const m = document.cookie.match(/(?:^|;\s*)aoc_owner_test_on=(\d+)/);
    const exp = m ? Number(m[1]) : 0;
    setUntil(exp > Date.now() ? exp : null);
  }, []);
  if (!until) return null;
  return (
    <div className="relative z-50 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-[#7a2e3e] px-4 py-2 text-center text-xs text-[#f5ecdf]">
      <span><strong>Owner testing session</strong> · the site is open in this browser only · Stripe test mode · new accounts are test accounts · until {new Date(until).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
      <a href="/admin/qa" className="underline">QA Center</a>
      <form action={endOwnerTestSession}><button className="underline">End session</button></form>
    </div>
  );
}
