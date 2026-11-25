"use client";
import { useEffect, useState } from "react";

const ZONES = [
  ["America/New_York", "Eastern (ET)"], ["America/Chicago", "Central (CT)"], ["America/Denver", "Mountain (MT)"], ["America/Phoenix", "Arizona (MST)"],
  ["America/Los_Angeles", "Pacific (PT)"], ["America/Anchorage", "Alaska (AKT)"], ["Pacific/Honolulu", "Hawaii (HT)"],
] as const;

/** Converts the chosen date/time in the chosen time zone to an exact UTC moment. */
function toUtc(local: string, zone: string) {
  if (!local) return "";
  const [d, t] = local.split("T");
  const [y, mo, da] = d.split("-").map(Number);
  const [h, mi] = t.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, da, h, mi);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(guess));
  const get = (k: string) => Number(parts.find((p) => p.type === k)?.value);
  const asZone = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return new Date(guess - (asZone - guess)).toISOString();
}

export function WebinarTimeFields({ startsAt, timeZone }: { startsAt?: string | null; timeZone?: string | null }) {
  const [zone, setZone] = useState(timeZone ?? "America/Chicago");
  const [local, setLocal] = useState("");
  useEffect(() => {
    if (!timeZone) {
      const mine = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (ZONES.some(([z]) => z === mine)) setZone(mine);
    }
    if (startsAt) {
      const f = new Intl.DateTimeFormat("sv-SE", { timeZone: timeZone ?? "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
      setLocal(f.format(new Date(startsAt)).replace(" ", "T"));
    }
  }, [startsAt, timeZone]);
  return (
    <>
      <label className="block space-y-1.5">
        <span className="text-sm font-semibold">Date and time *</span>
        <input type="datetime-local" name="startsAt" required value={local} onChange={(e) => setLocal(e.target.value)} className="field" />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-semibold">Time zone</span>
        <select name="timeZone" value={zone} onChange={(e) => setZone(e.target.value)} className="field">
          {ZONES.map(([z, l]) => <option key={z} value={z}>{l}</option>)}
        </select>
      </label>
      <input type="hidden" name="startsAtUtc" value={local ? toUtc(local, zone) : ""} />
    </>
  );
}
