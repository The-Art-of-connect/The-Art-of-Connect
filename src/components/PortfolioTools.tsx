"use client";
import { useState } from "react";

export function PrintButton() {
  return <button type="button" onClick={() => window.print()} className="btn btn-ghost btn-sm">Print or save as PDF</button>;
}

/** Copies one section so the member can choose what, if anything, to share. */
export function CopySection({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="no-print text-xs text-gold/80 underline-offset-2 hover:underline"
      onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); } catch { /* clipboard unavailable */ } }}>
      {done ? "Copied" : "Copy to share"}
    </button>
  );
}
