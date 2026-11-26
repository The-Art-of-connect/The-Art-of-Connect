"use client";
import { useEffect, useState } from "react";

/** Shows a time in the viewer's own time zone (server renders a neutral form first). */
export function LocalTime({ iso, dateOnly = false }: { iso: string; dateOnly?: boolean }) {
  const d = new Date(iso);
  const fmt = (tz?: string) => d.toLocaleString("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric", ...(dateOnly ? {} : { hour: "numeric", minute: "2-digit", timeZoneName: "short" }) });
  const [text, setText] = useState(() => fmt("UTC"));
  useEffect(() => setText(fmt()), [iso]); // eslint-disable-line react-hooks/exhaustive-deps
  return <time dateTime={iso} suppressHydrationWarning>{text}</time>;
}
