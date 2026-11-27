/**
 * Professional Résumé Builder (founder directive 31). Complimentary for every account.
 *
 * Guided forms and prewritten educational suggestions only: nothing here writes facts for the member. Suggestions are
 * patterns and action verbs that the member must fill with their own true experience. Journey's personalized help is
 * reserved for paid memberships.
 */

export type Contact = { name: string; headline: string; email: string; phone: string; location: string; links: string[] };
export type Experience = { title: string; organization: string; location: string; start: string; end: string; current: boolean; highlights: string[] };
export type Education = { school: string; credential: string; field: string; year: string; honors: string };
export type Certification = { name: string; issuer: string; year: string; credentialId: string };
export type ResumeData = {
  contact: Contact; summary: string; experience: Experience[]; education: Education[]; skills: string[];
  certifications: Certification[]; accomplishments: string[];
};
export type LetterData = {
  contact: Contact; date: string; recipientName: string; recipientTitle: string; company: string; role: string;
  opening: string; body: string; closing: string; signOff: string;
};

export const TEMPLATES = [
  { key: "signature", name: "Signature Professional", kind: "resume", audience: "Experienced professionals", description: "Clean serif headings with a fine gold rule. Our most versatile layout." },
  { key: "executive", name: "Executive", kind: "resume", audience: "Directors, executives and business owners", description: "A leadership summary first, then selected achievements and board or advisory roles." },
  { key: "foundation", name: "Foundation", kind: "resume", audience: "Students and early-career professionals", description: "Education and skills lead; projects and volunteer work count as experience." },
  { key: "transition", name: "Career Transition", kind: "resume", audience: "Changing industries or roles", description: "Transferable skills and accomplishments come before the chronological history." },
  { key: "letter", name: "Cover Letter", kind: "letter", audience: "Every application", description: "A matching cover letter in the same refined typography." },
] as const;
export type TemplateKey = (typeof TEMPLATES)[number]["key"];
export const RESUME_TEMPLATES = TEMPLATES.filter((t) => t.kind === "resume");
export const templateName = (k: string) => TEMPLATES.find((t) => t.key === k)?.name ?? "Résumé";

/** Section order per template. Every template is a single column with standard headings, which applicant tracking systems read well. */
export function sectionOrder(template: string): (keyof Omit<ResumeData, "contact">)[] {
  switch (template) {
    case "executive": return ["summary", "accomplishments", "experience", "education", "certifications", "skills"];
    case "foundation": return ["summary", "education", "skills", "experience", "certifications", "accomplishments"];
    case "transition": return ["summary", "skills", "accomplishments", "experience", "education", "certifications"];
    default: return ["summary", "experience", "education", "certifications", "skills", "accomplishments"];
  }
}
export function sectionTitle(section: string, template: string) {
  if (section === "summary") return template === "executive" ? "Leadership Profile" : "Professional Summary";
  if (section === "accomplishments") return template === "executive" ? "Selected Achievements" : template === "transition" ? "Transferable Accomplishments" : "Accomplishments";
  if (section === "skills") return template === "transition" ? "Transferable Skills" : "Skills";
  if (section === "experience") return template === "foundation" ? "Experience & Projects" : "Professional Experience";
  return { education: "Education", certifications: "Certifications & Licenses" }[section] ?? section;
}

const emptyContact = (): Contact => ({ name: "", headline: "", email: "", phone: "", location: "", links: [] });
export const emptyResume = (): ResumeData => ({ contact: emptyContact(), summary: "", experience: [], education: [], skills: [], certifications: [], accomplishments: [] });
export const emptyLetter = (): LetterData => ({ contact: emptyContact(), date: "", recipientName: "", recipientTitle: "", company: "", role: "", opening: "", body: "", closing: "", signOff: "Sincerely," });

// ─── Normalization (all saved data passes through here; lengths are capped) ────────────────────────
const s = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+$/g, "").slice(0, max) : "");
const list = <T>(v: unknown, max: number, f: (x: unknown) => T): T[] => (Array.isArray(v) ? v.slice(0, max).map(f) : []);
const obj = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

function normContact(v: unknown): Contact {
  const c = obj(v);
  return { name: s(c.name, 120), headline: s(c.headline, 160), email: s(c.email, 160), phone: s(c.phone, 40), location: s(c.location, 120),
    links: list(c.links, 4, (x) => s(x, 200)).filter(Boolean) };
}
export function normalizeResume(v: unknown): ResumeData {
  const r = obj(v);
  return {
    contact: normContact(r.contact),
    summary: s(r.summary, 1500),
    experience: list(r.experience, 15, (x) => {
      const e = obj(x);
      return { title: s(e.title, 120), organization: s(e.organization, 160), location: s(e.location, 120), start: s(e.start, 20), end: s(e.end, 20),
        current: e.current === true, highlights: list(e.highlights, 8, (h) => s(h, 400)).filter(Boolean) };
    }),
    education: list(r.education, 8, (x) => { const e = obj(x); return { school: s(e.school, 160), credential: s(e.credential, 120), field: s(e.field, 120), year: s(e.year, 20), honors: s(e.honors, 200) }; }),
    skills: list(r.skills, 40, (x) => s(x, 60)).filter(Boolean),
    certifications: list(r.certifications, 12, (x) => { const c = obj(x); return { name: s(c.name, 160), issuer: s(c.issuer, 160), year: s(c.year, 20), credentialId: s(c.credentialId, 80) }; }),
    accomplishments: list(r.accomplishments, 10, (x) => s(x, 400)).filter(Boolean),
  };
}
export function normalizeLetter(v: unknown): LetterData {
  const r = obj(v);
  return { contact: normContact(r.contact), date: s(r.date, 40), recipientName: s(r.recipientName, 120), recipientTitle: s(r.recipientTitle, 120),
    company: s(r.company, 160), role: s(r.role, 160), opening: s(r.opening, 1500), body: s(r.body, 4000), closing: s(r.closing, 1500), signOff: s(r.signOff, 60) };
}

/** A friendly completeness check (administrative only; it never judges the member's qualifications). */
export function resumeChecklist(r: ResumeData): { label: string; done: boolean }[] {
  return [
    { label: "Your name and a professional headline", done: Boolean(r.contact.name && r.contact.headline) },
    { label: "At least one way to reach you", done: Boolean(r.contact.email || r.contact.phone) },
    { label: "A summary of two to four sentences", done: r.summary.length >= 80 },
    { label: "Experience with highlights", done: r.experience.some((e) => e.highlights.length > 0) },
    { label: "Education or training", done: r.education.length > 0 },
    { label: "Five or more skills", done: r.skills.length >= 5 },
  ];
}

export const dateRange = (e: Pick<Experience, "start" | "end" | "current">) => [e.start, e.current ? "Present" : e.end].filter(Boolean).join(" – ");

// ─── Prewritten educational guidance (examples to learn from, never facts about the member) ─────────
export const ACTION_VERBS: [string, string[]][] = [
  ["Leadership", ["Directed", "Led", "Mentored", "Oversaw", "Championed", "Built", "Established"]],
  ["Growth", ["Expanded", "Increased", "Launched", "Grew", "Secured", "Negotiated", "Opened"]],
  ["Improvement", ["Streamlined", "Reduced", "Redesigned", "Modernized", "Resolved", "Strengthened"]],
  ["Communication", ["Presented", "Advised", "Trained", "Wrote", "Represented", "Facilitated"]],
  ["Analysis", ["Analyzed", "Forecasted", "Evaluated", "Audited", "Researched", "Measured"]],
  ["Service", ["Supported", "Delivered", "Coordinated", "Managed", "Served", "Organized"]],
];

export const GUIDANCE: Record<string, { title: string; tips: string[]; pattern?: string }> = {
  summary: {
    title: "Writing your summary",
    tips: ["Two to four sentences: who you are professionally, what you're known for, and what you're looking for next.", "Use words from the roles you want, but only where they are true for you.", "Skip \"I\" and personal details such as age, marital status or photos."],
    pattern: "[Your role or field] with [number] years of experience in [your strengths]. Known for [a true, specific result]. Seeking [the role or kind of work you want].",
  },
  experience: {
    title: "Describing your experience",
    tips: ["Start each highlight with an action verb.", "Show the result: what changed because of your work? Use real numbers only when you know them.", "Three to five highlights for recent roles; fewer for older ones."],
    pattern: "[Action verb] [what you did] for [who or what], resulting in [a true, measurable outcome].",
  },
  education: { title: "Education", tips: ["List your highest level first.", "Include certificates and training programs, too.", "Only list credentials you have actually earned; write \"In progress\" with an expected date if you're still studying."] },
  skills: { title: "Skills", tips: ["Mix technical skills (software, tools, methods) with professional strengths.", "Mirror the wording in job postings where it accurately describes you.", "Eight to fifteen skills is plenty."] },
  certifications: { title: "Certifications & licenses", tips: ["Use the exact official name and the issuing organization.", "Include the year and, if you like, the credential number so employers can verify it.", "Never list a credential that has lapsed as current."] },
  accomplishments: { title: "Accomplishments", tips: ["Awards, recognitions, publications, speaking or community leadership.", "One line each, most impressive first."], pattern: "[Recognition or result], [organization], [year]." },
  letter: {
    title: "Writing your cover letter",
    tips: ["Opening: the role you're applying for and one sentence on why it fits you.", "Body: two short paragraphs connecting your real experience to what the employer needs.", "Closing: thank them and invite a conversation.", "Keep it to one page."],
  },
};
