"use client";
import { useState } from "react";

/** A date-and-time picker that submits the exact moment (with the member's own time zone). */
export function LocalDateTimeField({ name, label, required = true }: { name: string; label: string; required?: boolean }) {
  const [iso, setIso] = useState("");
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold">{label}</span>
      <input type="datetime-local" required={required} className="field" onChange={(e) => setIso(e.target.value ? new Date(e.target.value).toISOString() : "")} />
      <input type="hidden" name={name} value={iso} />
    </label>
  );
}

/** Shows a moment in the reader's own time zone. */
export function LocalTime({ iso, withTime = true }: { iso: string; withTime?: boolean }) {
  const d = new Date(iso);
  return <time dateTime={iso} suppressHydrationWarning>{d.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" })}{withTime ? ` · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : ""}</time>;
}
