"use client";
import { useActionState, useMemo, useState } from "react";
import { UNAVAILABLE_MESSAGE, availability } from "@/lib/calendar";
import {
  addBusyTime, addSharedEvent, createSubscribeLink, linkCalendar, refreshCalendars, removeBusyTime, removeSharedEvent, unlinkCalendar,
} from "@/app/actions/couples-calendar";

export type CalEvent = { id: string; title: string; kind: string; location: string | null; start: string; end: string; allDay: boolean };
export type Busy = { start: string; end: string; mine: boolean };
export type MyBusy = { id: string; label: string | null; start: string; end: string; source: string };
export type Link = { id: string; provider: string; last_synced_at: string | null; last_error: string | null };

const C = { espresso: "#211C18", ink2: "#2E2722", line: "#4A4038", gold: "#C5A572", goldLight: "#E2CBA0", burgundy: "#781F35", ivory: "#F8F3E9", cream: "#E8D9C5", goldText: "#6F5222" };
const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const KINDS: Record<string, string> = { date_night: "Date night", trip: "Trip", anniversary: "Anniversary", activity: "Activity", other: "Plans" };

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

function Result({ s }: { s: { ok: boolean; message: string } | null }) {
  return s ? <p className="mt-2 text-sm" style={{ color: s.ok ? C.goldLight : "#e8a0a0" }} role="status">{s.message}</p> : null;
}

export function CouplesCalendar({ events, busy, mine, links, paired, preview }: { events: CalEvent[]; busy: Busy[]; mine: MyBusy[]; links: Link[]; paired: boolean; preview: boolean }) {
  const today = startOfDay(new Date());
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Date>(today);
  const [check, setCheck] = useState<string | null>(null);
  const zone = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";

  const [addState, addAction, adding] = useActionState(addSharedEvent, null);
  const [busyState, busyAction, savingBusy] = useActionState(addBusyTime, null);
  const [linkState, linkAction, linking] = useActionState(linkCalendar, null);
  const [syncState, syncAction, syncing] = useActionState(refreshCalendars, null);
  const [subState, subAction, subbing] = useActionState(createSubscribeLink, null);
  const [, removeEvent] = useActionState(removeSharedEvent, null);
  const [, removeBusy] = useActionState(removeBusyTime, null);
  const [, unlink] = useActionState(unlinkCalendar, null);

  const byDay = useMemo(() => {
    const m = new Map<string, { ours: CalEvent[]; busy: boolean }>();
    const touch = (d: Date) => { const k = dayKey(d); if (!m.has(k)) m.set(k, { ours: [], busy: false }); return m.get(k)!; };
    for (const e of events) for (let d = startOfDay(new Date(e.start)); d < new Date(e.end); d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) touch(d).ours.push(e);
    for (const b of busy) for (let d = startOfDay(new Date(b.start)); d < new Date(b.end); d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) touch(d).busy = true;
    return m;
  }, [events, busy]);

  const cells: (Date | null)[] = [];
  const first = month.getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));

  const sel = byDay.get(dayKey(selected));
  const selEnd = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() + 1);
  const myToday = mine.filter((b) => new Date(b.start) < selEnd && new Date(b.end) > selected);
  const partnerBusyToday = busy.some((b) => !b.mine && new Date(b.start) < selEnd && new Date(b.end) > selected);
  const intervals = busy.map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
  const defaultStart = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 19, 0);
  const defaultEnd = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 21, 0);

  function guard(e: React.FormEvent<HTMLFormElement>) {
    const f = new FormData(e.currentTarget);
    const s = new Date(String(f.get("startLocal"))), en = new Date(String(f.get("endLocal")));
    if (!(en > s)) { e.preventDefault(); setCheck("The end must be after the start."); return; }
    if (availability({ start: s, end: en }, intervals) === "unavailable") { e.preventDefault(); setCheck(UNAVAILABLE_MESSAGE); return; }
    setCheck(null);
    (e.currentTarget.elements.namedItem("start") as HTMLInputElement).value = s.toISOString();
    (e.currentTarget.elements.namedItem("end") as HTMLInputElement).value = en.toISOString();
  }
  function toIso(e: React.FormEvent<HTMLFormElement>) {
    const f = new FormData(e.currentTarget);
    (e.currentTarget.elements.namedItem("start") as HTMLInputElement).value = new Date(String(f.get("startLocal"))).toISOString();
    (e.currentTarget.elements.namedItem("end") as HTMLInputElement).value = new Date(String(f.get("endLocal"))).toISOString();
  }

  const panel = { background: C.ink2, border: `0.5px solid ${C.line}` };
  const input = "w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2";
  const inputStyle = { background: "rgba(248,243,233,0.06)", border: `1px solid ${C.line}`, color: C.ivory };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] p-5 sm:p-8" style={{ background: C.espresso, color: C.ivory }}>
        <p className="text-xs tracking-[0.25em] uppercase" style={{ color: C.gold }}>The Personal Society · couples</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="display text-5xl" style={{ color: C.goldLight }}>Just us</h1>
            <p className="mt-1 text-sm" style={{ color: C.cream }}>Your shared calendar. Only the two of you can see it.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-full px-3 py-1.5 text-sm" style={{ border: `1px solid ${C.line}` }} aria-label="Previous month">‹</button>
            <span className="min-w-36 text-center font-semibold" style={{ color: C.goldLight }}>{month.toLocaleDateString([], { month: "long", year: "numeric" })}</span>
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-full px-3 py-1.5 text-sm" style={{ border: `1px solid ${C.line}` }} aria-label="Next month">›</button>
          </div>
        </div>
        <div className="my-5 h-px" style={{ background: C.gold, opacity: 0.4 }} />
        {!paired && <p className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ ...panel, color: C.goldLight }}>Your shared calendar opens when your partner accepts your invitation. You can add your private busy times now.</p>}
        <div className="grid grid-cols-7 gap-1.5 text-center text-[0.7rem] sm:gap-2 sm:text-xs" style={{ color: C.gold }}>
          {WEEK.map((w) => <div key={w} className="py-1">{w}</div>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1.5 sm:gap-2">
          {cells.map((d, i) => {
            if (!d) return <div key={`x${i}`} />;
            const info = byDay.get(dayKey(d));
            const ours = Boolean(info?.ours.length);
            const isSel = dayKey(d) === dayKey(selected);
            const past = d < today;
            const bg = ours ? C.burgundy : info?.busy || past ? C.ink2 : C.ivory;
            const fg = ours ? C.ivory : info?.busy ? C.cream : past ? "#8a7d6e" : C.espresso;
            return (
              <button key={d.toISOString()} onClick={() => { setSelected(d); setCheck(null); }}
                className="flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition sm:aspect-auto sm:h-20 sm:items-start sm:justify-between sm:p-2"
                style={{ background: bg, color: fg, opacity: past && ours ? 0.6 : 1, border: `${isSel ? 2 : 0.5}px solid ${isSel || ours ? C.gold : info?.busy || past ? C.line : C.cream}` }}
                aria-label={`${d.toDateString()}${ours ? ", plans together" : info?.busy ? ", not available" : ", free"}`}>
                <span className="font-semibold">{d.getDate()}</span>
                <span className="text-[0.6rem] leading-none sm:text-[0.68rem]" style={{ color: ours ? C.goldLight : info?.busy ? C.goldLight : C.goldText }}>
                  {ours ? "♡" : info?.busy ? "🔒︎" : ""}<span className="hidden sm:inline">{ours ? ` ${KINDS[info!.ours[0].kind]}` : info?.busy ? " Unavailable" : ""}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs" style={{ color: C.cream }}>
          <span><span style={{ color: C.gold }}>♡</span> Planned together</span>
          <span><span style={{ color: C.goldLight }}>🔒︎</span> Not available</span>
          <span><span className="inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: C.ivory }} /> Free</span>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[1.75rem] p-6 sm:p-7" style={{ background: C.espresso, color: C.ivory }}>
          <p className="text-xs tracking-[0.25em] uppercase" style={{ color: C.gold }}>{selected.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</p>
          {sel?.ours.length ? (
            <ul className="mt-4 space-y-2">
              {sel.ours.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-3 rounded-xl px-4 py-3" style={{ background: C.burgundy, border: `0.5px solid ${C.gold}` }}>
                  <span>
                    <span className="block font-semibold">{e.title}</span>
                    <span className="block text-xs" style={{ color: C.goldLight }}>{e.allDay ? "All day" : `${time(e.start)} – ${time(e.end)}`}{e.location ? ` · ${e.location}` : ""}</span>
                  </span>
                  {!preview && <form action={removeEvent}><input type="hidden" name="id" value={e.id} /><button className="text-xs underline" style={{ color: C.goldLight }}>Remove</button></form>}
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm" style={{ color: C.cream }}>{partnerBusyToday || myToday.length ? "Part of this day isn't available." : "You're both free. Plan something together?"}</p>}

          {paired && (
            <form action={addAction} onSubmit={guard} className="mt-6 space-y-3">
              <p className="display text-2xl" style={{ color: C.goldLight }}>Plan something together</p>
              <input name="title" required maxLength={120} placeholder="Date night at our favorite place" className={input} style={inputStyle} />
              <div className="grid grid-cols-2 gap-3">
                <select name="kind" className={input} style={inputStyle} defaultValue="date_night">
                  {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k} style={{ color: C.espresso }}>{v}</option>)}
                </select>
                <input name="location" maxLength={200} placeholder="Where (optional)" className={input} style={inputStyle} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs" style={{ color: C.cream }}>Starts<input type="datetime-local" name="startLocal" required defaultValue={toLocalInput(defaultStart)} key={`s${selected.toISOString()}`} className={`${input} mt-1`} style={inputStyle} /></label>
                <label className="text-xs" style={{ color: C.cream }}>Ends<input type="datetime-local" name="endLocal" required defaultValue={toLocalInput(defaultEnd)} key={`e${selected.toISOString()}`} className={`${input} mt-1`} style={inputStyle} /></label>
              </div>
              <input type="hidden" name="start" /><input type="hidden" name="end" />
              <label className="flex items-center gap-2 text-sm" style={{ color: C.cream }}><input type="checkbox" name="allDay" /> All day</label>
              <textarea name="notes" rows={2} maxLength={2000} placeholder="A note for you both (optional)" className={input} style={inputStyle} />
              <button className="w-full rounded-full py-3 font-semibold" style={{ background: C.gold, color: C.espresso }} disabled={adding || preview}>{adding ? "Saving…" : "Add to our calendar"}</button>
              {check && <p className="rounded-xl px-4 py-3 text-sm" style={{ ...panel, color: C.goldLight, border: `1px solid ${C.gold}` }} role="status">{check}</p>}
              <Result s={addState} />
            </form>
          )}
        </section>

        <section className="rounded-[1.75rem] p-6 sm:p-7" style={{ background: C.cream, color: C.espresso }}>
          <p className="display text-2xl" style={{ color: C.burgundy }}>My private schedule</p>
          <p className="mt-1 text-sm" style={{ color: C.goldText }}>Only you see what these are. Your partner only sees &ldquo;not available.&rdquo;</p>
          {myToday.length > 0 && (
            <ul className="mt-4 space-y-2">
              {myToday.map((b) => (
                <li key={b.id} className="flex items-center justify-between rounded-xl px-4 py-2.5 text-sm" style={{ background: C.ivory }}>
                  <span>{b.label ?? (b.source === "manual" ? "Busy" : `From ${b.source[0].toUpperCase()}${b.source.slice(1)} calendar`)} · {time(b.start)} – {time(b.end)}</span>
                  {b.source === "manual" && !preview && <form action={removeBusy}><input type="hidden" name="id" value={b.id} /><button className="text-xs underline" style={{ color: C.goldText }}>Remove</button></form>}
                </li>
              ))}
            </ul>
          )}
          <form action={busyAction} onSubmit={toIso} className="mt-5 space-y-3">
            <input name="label" maxLength={80} placeholder="Work, appointment… (only you see this)" className="field w-full" />
            <div className="grid gap-3 sm:grid-cols-2">
              <input type="datetime-local" name="startLocal" required defaultValue={toLocalInput(new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 9))} key={`bs${selected.toISOString()}`} className="field" aria-label="Busy from" />
              <input type="datetime-local" name="endLocal" required defaultValue={toLocalInput(new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 17))} key={`be${selected.toISOString()}`} className="field" aria-label="Busy until" />
            </div>
            <input type="hidden" name="start" /><input type="hidden" name="end" />
            <button className="btn btn-ghost w-full" disabled={savingBusy || preview}>Block this time privately</button>
            <Result s={busyState} />
          </form>
        </section>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="glass p-6 sm:p-7">
          <p className="display text-2xl">Link your calendars</p>
          <p className="mt-1 text-sm text-muted">Bring in busy times from Google, Apple (iPhone, iPad, Mac) or Outlook automatically. We read only when you&rsquo;re busy — never what the events are.</p>
          {links.length > 0 && (
            <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
              {links.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span>
                    <span className="block font-semibold capitalize">{l.provider === "apple" ? "Apple iCloud" : l.provider} calendar</span>
                    <span className="block text-xs text-faint">{l.last_error ? l.last_error : l.last_synced_at ? `Updated ${new Date(l.last_synced_at).toLocaleString()}` : "Waiting to update"}</span>
                  </span>
                  {!preview && <form action={unlink}><input type="hidden" name="id" value={l.id} /><button className="text-xs text-gold-deep underline">Unlink</button></form>}
                </li>
              ))}
            </ul>
          )}
          <form action={linkAction} className="mt-4 space-y-2">
            <input type="hidden" name="zone" value={zone} />
            <input name="url" required placeholder="Paste your private calendar link" className="field w-full" aria-label="Private calendar link" />
            <button className="btn btn-gold w-full" disabled={linking || preview}>{linking ? "Linking…" : "Link calendar"}</button>
            <Result s={linkState} />
          </form>
          {links.length > 0 && (
            <form action={syncAction} className="mt-2"><input type="hidden" name="zone" value={zone} /><button className="text-sm text-gold-deep underline" disabled={syncing || preview}>Refresh now</button><Result s={syncState} /></form>
          )}
          <details className="mt-5 text-sm text-muted">
            <summary className="cursor-pointer font-semibold text-text">Where do I find my private link?</summary>
            <div className="mt-3 space-y-3">
              <p><strong className="text-text">Google Calendar</strong> (on a computer): Settings → choose your calendar → Integrate calendar → copy <em>Secret address in iCal format</em>.</p>
              <p><strong className="text-text">Apple (iPhone, iPad or Mac)</strong>: open iCloud.com → Calendar → tap the share icon next to your calendar → turn on <em>Public Calendar</em> → copy the link. Only you will have this link.</p>
              <p><strong className="text-text">Outlook</strong>: Settings → Calendar → Shared calendars → Publish a calendar → <em>Can view when I&rsquo;m busy</em> → copy the ICS link.</p>
            </div>
          </details>
        </div>

        <div className="theme-dark rounded-[1.75rem] p-6 sm:p-7" style={{ background: C.burgundy }}>
          <p className="display text-2xl" style={{ color: C.goldLight }}>Add &ldquo;Just us&rdquo; to your phone</p>
          <p className="mt-1 text-sm" style={{ color: C.cream }}>See your shared plans in the calendar you already use — iPhone, Android, Mac, Windows or the web. Your private schedule is never included.</p>
          <form action={subAction} className="mt-5">
            <button className="w-full rounded-full py-3 font-semibold" style={{ background: C.gold, color: C.espresso }} disabled={subbing || preview}>Create my private subscribe link</button>
          </form>
          {subState?.url && (
            <div className="mt-4 space-y-3">
              <a href={subState.url} className="block rounded-full py-3 text-center font-semibold" style={{ border: `1px solid ${C.gold}`, color: C.goldLight }}>Open in my calendar app</a>
              <input readOnly value={subState.url.replace(/^webcal:/, "https:")} onFocus={(e) => e.currentTarget.select()} className="w-full rounded-xl px-3 py-2 text-xs" style={{ background: "rgba(0,0,0,0.25)", color: C.ivory, border: `1px solid ${C.gold}` }} aria-label="Subscribe link" />
              <p className="text-xs" style={{ color: C.cream }}>Google Calendar: Other calendars → + → From URL → paste. Outlook: Add calendar → Subscribe from web → paste.</p>
            </div>
          )}
          <Result s={subState} />
        </div>
      </section>
    </div>
  );
}
