/**
 * Journey résumé enhancement (founder directives 33 and 34). Paid memberships only.
 *
 * Journey rewrites what the member already wrote: formatting, grammar, summary, accomplishment phrasing, industry terms and
 * ATS-friendly structure. It must never add an employer, title, date, degree, credential, number or achievement that is not in
 * the member's own text; where something is missing or vague it asks a question instead. Email addresses and phone numbers are
 * removed before the text is sent and restored from the member's own data afterwards.
 */
import { normalizeResume, type ResumeData } from "./resume.ts";

export const RESUME_REQUEST = "Please prepare the enhanced draft of my résumé from the text I provided, following your résumé instructions exactly.";

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE = /(\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;

/** Removes contact details before anything is sent to the AI provider, and returns them so they can be restored locally. */
export function stripContact(text: string) {
  const emails = [...new Set(text.match(EMAIL) ?? [])];
  const phones = [...new Set(text.match(PHONE) ?? [])];
  const cleaned = text.replace(EMAIL, "[email removed]").replace(PHONE, "[phone removed]").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return { cleaned: cleaned.slice(0, 18000), email: emails[0] ?? "", phone: phones[0] ?? "" };
}

export function resumeInstructions(industry: string | null) {
  return `# Résumé enhancement (this request only)
You are preparing an enhanced draft of the member's own résumé. The member will review every word and must approve it before it is used.

Absolute rules:
- Use ONLY facts present in the member's text. Never add or change employers, job titles, dates, locations, schools, degrees, credentials, licenses, awards, clients, numbers, percentages or achievements.
- You may rephrase for clarity, correct grammar and spelling, start highlights with strong action verbs, use accurate industry terminology, and organize content into standard sections.
- If an accomplishment would be stronger with a result or number the text does not contain, do NOT invent one: keep the wording factual and add a question asking the member for it.
- If anything is unclear, inconsistent (for example overlapping dates) or missing (for example no dates, no education), add a question.
- Do not infer or mention age, race, religion, health, family status or any other personal characteristic.
- "[email removed]" and "[phone removed]" are placeholders: leave contact email and phone empty.
${industry ? `- The member is focusing on: ${industry}. Use terminology appropriate to that field only where it truthfully describes their experience.\n` : ""}
Reply with ONLY a JSON object, no commentary, in exactly this shape:
{"resume":{"contact":{"name":"","headline":"","location":"","links":[]},"summary":"","experience":[{"title":"","organization":"","location":"","start":"","end":"","current":false,"highlights":[""]}],"education":[{"school":"","credential":"","field":"","year":"","honors":""}],"skills":[""],"certifications":[{"name":"","issuer":"","year":"","credentialId":""}],"accomplishments":[""]},
"questions":["Questions for the member about missing or unclear information"],
"changes":["Short notes describing what you improved"]}`;
}

export type Enhanced = { data: ResumeData; questions: string[]; changes: string[] };

/** Parses Journey's reply. Returns null when it isn't valid JSON in the expected shape. */
export function parseEnhanced(reply: string, contact: { email: string; phone: string }): Enhanced | null {
  const start = reply.indexOf("{"); const end = reply.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let raw: unknown;
  try { raw = JSON.parse(reply.slice(start, end + 1)); } catch { return null; }
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (!o.resume || typeof o.resume !== "object") return null;
  const data = normalizeResume(o.resume);
  data.contact.email = contact.email.slice(0, 160);
  data.contact.phone = contact.phone.slice(0, 40);
  const strings = (v: unknown, n: number) => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).slice(0, n).map((x) => String(x).slice(0, 400)) : []);
  return { data, questions: strings(o.questions, 15), changes: strings(o.changes, 12) };
}

/**
 * A guard against invented facts: every employer, school and credential in the draft must appear in the member's original text.
 * Anything that doesn't is removed and turned into a question.
 */
export function verifyAgainstSource(e: Enhanced, source: string): Enhanced {
  const hay = source.toLowerCase().replace(/\s+/g, " ");
  const present = (s: string) => !s.trim() || hay.includes(s.toLowerCase().replace(/\s+/g, " ").trim());
  const questions = [...e.questions];
  const experience = e.data.experience.filter((x) => {
    const ok = present(x.organization);
    if (!ok) questions.push(`Journey suggested an entry for "${x.organization}", which isn't in your original résumé, so it was left out. Please add it yourself if it's accurate.`);
    return ok;
  });
  const education = e.data.education.filter((x) => {
    const ok = present(x.school);
    if (!ok) questions.push(`Please confirm your education at "${x.school}"; it wasn't found in your original text, so it was left out.`);
    return ok;
  });
  const certifications = e.data.certifications.filter((x) => {
    const ok = present(x.name);
    if (!ok) questions.push(`Please confirm the credential "${x.name}"; it wasn't found in your original text, so it was left out.`);
    return ok;
  });
  return { ...e, data: { ...e.data, experience, education, certifications }, questions: questions.slice(0, 20) };
}
