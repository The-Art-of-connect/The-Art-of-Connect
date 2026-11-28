/**
 * Business Deal Room meeting minutes (founder directive 48). Pure: shared by pages, actions and tests.
 * Proposals are always kept separate from decisions; minutes record a discussion, never a binding agreement.
 */
export type MinutesItem = string | { text: string; owner?: string | null; due?: string | null };
export type Minutes = Partial<Record<MinutesKey, MinutesItem[]>>;

export const MINUTES_SECTIONS = [
  { key: "participants", label: "Participants and business roles" },
  { key: "topics", label: "Discussion topics" },
  { key: "decisions", label: "Decisions reached" },
  { key: "proposals", label: "Proposed arrangements (not decisions)" },
  { key: "financial", label: "Financial matters discussed" },
  { key: "questions", label: "Unresolved questions" },
  { key: "actions", label: "Assigned responsibilities", hint: "One per line: task | who | due date (YYYY-MM-DD)" },
  { key: "next_steps", label: "Next steps" },
  { key: "follow_up", label: "Suggested follow-up topics" },
] as const;
export type MinutesKey = (typeof MINUTES_SECTIONS)[number]["key"];

export const NOT_BINDING = "These minutes record a discussion and are not a legally binding agreement.";

export const RECORDING_LABEL: Record<string, string> = {
  off: "Not recording", recording: "Recording in progress", paused: "Recording paused", stopped: "Recording stopped",
};

/** Turns one form textarea into section items. Actions accept "task | who | YYYY-MM-DD". */
export function parseSection(key: MinutesKey, raw: string): MinutesItem[] {
  const lines = raw.split("\n").map((x) => x.trim().replace(/^[-•*]\s*/, "")).filter(Boolean).slice(0, 60).map((x) => x.slice(0, 600));
  if (key === "decisions") return lines.map((text) => ({ text }));
  if (key === "actions") return lines.map((l) => {
    const [text, owner, due] = l.split("|").map((x) => x.trim());
    return { text, owner: owner || null, due: /^\d{4}-\d{2}-\d{2}$/.test(due ?? "") ? due : null };
  });
  return lines;
}

export const itemText = (i: MinutesItem) => (typeof i === "string" ? i : i.text);
export function itemLine(i: MinutesItem) {
  if (typeof i === "string") return i;
  return [i.text, i.owner ? `Responsible: ${i.owner}` : null, i.due ? `Due ${i.due}` : null].filter(Boolean).join(" · ");
}
/** Back into the editor's "task | who | date" form. */
export function itemEditLine(key: MinutesKey, i: MinutesItem) {
  if (typeof i === "string" || key !== "actions") return itemText(i);
  return [i.text, i.owner ?? "", i.due ?? ""].join(" | ").replace(/( \| )+$/, "");
}

/** The typed copy: plain text used for print, email and text messages. */
export function minutesText(title: string, startedAt: string, purpose: string | null, m: Minutes) {
  const out = [title.toUpperCase(), `Meeting date: ${new Date(startedAt).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "America/New_York" })} (Eastern)`];
  if (purpose) out.push(`Purpose: ${purpose}`);
  for (const s of MINUTES_SECTIONS) {
    const items = m[s.key] ?? [];
    if (!items.length) continue;
    out.push("", s.label.toUpperCase(), ...items.map((i) => `- ${itemLine(i)}`));
  }
  out.push("", NOT_BINDING);
  return out.join("\n");
}
