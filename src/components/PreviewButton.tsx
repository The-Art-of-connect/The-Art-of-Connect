"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Shown in the site header only to signed-in owner accounts. */
export function PreviewButton({ className = "" }: { className?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let live = true;
    fetch("/api/owner/reviewer", { cache: "no-store" }).then((r) => r.json()).then((d) => live && setShow(Boolean(d?.reviewer))).catch(() => null);
    return () => { live = false; };
  }, []);
  if (!show) return null;
  return <Link href="/inside-preview" className={`nav-pill inline-flex border border-gold/40 text-[0.82rem] text-champagne ${className}`}>Preview</Link>;
}
