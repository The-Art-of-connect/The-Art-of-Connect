"use client";

/** Opens the browser's print dialog (also used to save as PDF). */
export function PrintButton({ label = "Print or save as PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-gold btn-sm no-print">
      {label}
    </button>
  );
}
