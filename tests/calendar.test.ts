// Couples calendar: linked calendars give times only; partners learn "available" or "not available", never why.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  UNAVAILABLE_MESSAGE, availability, buildIcs, mergeIntervals, parseBusyTimes, validateCalendarUrl, zonedTimeToUtc,
} from "../src/lib/calendar.ts";

const from = new Date("2026-12-01T00:00:00Z");
const to = new Date("2027-01-01T00:00:00Z");
const iso = (d: Date) => d.toISOString();

const GOOGLE = [
  "BEGIN:VCALENDAR", "PRODID:-//Google Inc//Google Calendar 70.9054//EN", "X-WR-TIMEZONE:America/Chicago",
  "BEGIN:VEVENT", "DTSTART:20261205T150000Z", "DTEND:20261205T170000Z", "UID:a1@google.com",
  "SUMMARY:Dentist — confidential", "LOCATION:123 Private St", "DESCRIPTION:Very private notes", "END:VEVENT",
  "BEGIN:VEVENT", "DTSTART;TZID=America/Chicago:20261207T090000", "DTEND;TZID=America/Chicago:20261207T170000",
  "RRULE:FREQ=WEEKLY;BYDAY=MO,WE;COUNT=4", "UID:work@google.com", "SUMMARY:Work shift", "END:VEVENT",
  "BEGIN:VEVENT", "DTSTART;VALUE=DATE:20261224", "DTEND;VALUE=DATE:20261226", "UID:hol@google.com", "SUMMARY:Family", "END:VEVENT",
  "BEGIN:VEVENT", "DTSTART:20261210T150000Z", "DTEND:20261210T160000Z", "TRANSP:TRANSPARENT", "UID:free@google.com", "SUMMARY:Free", "END:VEVENT",
  "BEGIN:VEVENT", "DTSTART:20261211T150000Z", "DTEND:20261211T160000Z", "STATUS:CANCELLED", "UID:c@google.com", "END:VEVENT",
  "BEGIN:VEVENT", "DTSTART:20261212T150000Z", "DTEND:20261212T160000Z", "UID:alarm@google.com",
  "BEGIN:VALARM", "TRIGGER:-PT10M", "ACTION:DISPLAY", "END:VALARM", "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

test("a linked calendar yields only times — no titles, places or notes", () => {
  const busy = parseBusyTimes(GOOGLE, from, to);
  const json = JSON.stringify(busy);
  for (const secret of ["Dentist", "Private St", "private notes", "Work shift", "Family"]) assert.ok(!json.includes(secret), secret);
  assert.ok(busy.every((b) => Object.keys(b).sort().join() === "end,start"));
});

test("timed, recurring (with time zone) and all-day events are read correctly", () => {
  const busy = parseBusyTimes(GOOGLE, from, to).map((b) => [iso(b.start), iso(b.end)]);
  assert.deepEqual(busy[0], ["2026-12-05T15:00:00.000Z", "2026-12-05T17:00:00.000Z"]);
  // Work Mon/Wed 9–5 Chicago (UTC-6), 4 times: Dec 7, 9, 14, 16.
  const work = busy.filter(([s, e]) => s.endsWith("T15:00:00.000Z") && e.endsWith("T23:00:00.000Z")).map(([s]) => s);
  assert.deepEqual(work, ["2026-12-07T15:00:00.000Z", "2026-12-09T15:00:00.000Z", "2026-12-14T15:00:00.000Z", "2026-12-16T15:00:00.000Z"]);
  assert.ok(busy.some(([s]) => s === "2026-12-12T15:00:00.000Z"), "event with an alarm still counts");
  const allDay = busy.find(([s]) => s.startsWith("2026-12-24"));
  assert.deepEqual(allDay, ["2026-12-24T06:00:00.000Z", "2026-12-26T06:00:00.000Z"]);
});

test("free and cancelled events don't block anyone", () => {
  const busy = parseBusyTimes(GOOGLE, from, to);
  assert.ok(!busy.some((b) => iso(b.start).startsWith("2026-12-10") || iso(b.start).startsWith("2026-12-11")));
});

test("Apple-style feed: folded lines, daily repeat with UNTIL and an excluded day", () => {
  const apple = [
    "BEGIN:VCALENDAR", "PRODID:-//Apple Inc.//iCloud", "BEGIN:VEVENT", "UID:gym@icloud",
    "DTSTART;TZID=America/New_York:20261201T060000", "DURATION:PT1H",
    "RRULE:FREQ=DAILY;UNTIL=20261203T235959Z", "EXDATE;TZID=America/New_York:20261202T060000",
    "SUMMARY:Morning", " workout", "END:VEVENT", "END:VCALENDAR",
  ].join("\n");
  const busy = parseBusyTimes(apple, from, to).map((b) => iso(b.start));
  assert.deepEqual(busy, ["2026-12-01T11:00:00.000Z", "2026-12-03T11:00:00.000Z"]);
});

test("time zones convert across daylight saving", () => {
  assert.equal(iso(zonedTimeToUtc(2026, 7, 1, 9, 0, 0, "America/Chicago")), "2026-07-01T14:00:00.000Z");
  assert.equal(iso(zonedTimeToUtc(2026, 12, 1, 9, 0, 0, "America/Chicago")), "2026-12-01T15:00:00.000Z");
});

test("a partner only ever learns available or not available", () => {
  const busy = mergeIntervals(parseBusyTimes(GOOGLE, from, to));
  assert.equal(availability({ start: new Date("2026-12-05T16:00:00Z"), end: new Date("2026-12-05T18:00:00Z") }, busy), "unavailable");
  assert.equal(availability({ start: new Date("2026-12-05T18:00:00Z"), end: new Date("2026-12-05T20:00:00Z") }, busy), "available");
  assert.equal(UNAVAILABLE_MESSAGE, "That day doesn't work. Please choose another date.");
});

test("only Google, Apple and Outlook calendar links are accepted", () => {
  assert.deepEqual(validateCalendarUrl("https://calendar.google.com/calendar/ical/abc%40gmail.com/private-123/basic.ics"), {
    ok: true, url: "https://calendar.google.com/calendar/ical/abc%40gmail.com/private-123/basic.ics", provider: "google",
  });
  const apple = validateCalendarUrl("webcal://p52-caldav.icloud.com/published/2/MTIz");
  assert.equal(apple.ok && apple.provider, "apple");
  assert.equal(apple.ok && apple.url.startsWith("https://"), true);
  const outlook = validateCalendarUrl("https://outlook.office365.com/owa/calendar/x/y/reachcalendar.ics");
  assert.equal(outlook.ok && outlook.provider, "outlook");
  for (const bad of ["http://calendar.google.com/x.ics", "https://evil.example.com/cal.ics", "https://169.254.169.254/latest", "https://localhost/x", "https://user:pw@calendar.google.com/x", "https://calendar.google.com.evil.com/x", "not a link"])
    assert.equal(validateCalendarUrl(bad).ok, false, bad);
});

test("the shared calendar feed opens in Apple, Google and Outlook calendars", () => {
  const ics = buildIcs([
    { id: "e1", title: "Date night, rooftop; 7 pm", location: "Birmingham", notes: "Dress up\nBring flowers", start: new Date("2026-12-12T01:00:00Z"), end: new Date("2026-12-12T03:00:00Z"), allDay: false, updated: new Date("2026-11-25T15:00:00Z") },
    { id: "e2", title: "Weekend trip", start: new Date("2026-12-19T00:00:00Z"), end: new Date("2026-12-22T00:00:00Z"), allDay: true, updated: new Date("2026-11-25T15:00:00Z") },
  ]);
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /SUMMARY:Date night\\, rooftop\\; 7 pm\r\n/);
  assert.match(ics, /DESCRIPTION:Dress up\\nBring flowers/);
  assert.match(ics, /DTSTART;VALUE=DATE:20261219\r\nDTEND;VALUE=DATE:20261222/);
  assert.ok(ics.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75));
  // Round trip: our own parser reads the feed back.
  assert.equal(parseBusyTimes(ics, from, to).length, 2);
});
