import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { AlignmentType, BorderStyle, Document, Packer, Paragraph, TabStopType, TextRun } from "docx";
import { dateRange, sectionOrder, sectionTitle, type LetterData, type ResumeData } from "@/lib/resume";

/**
 * Résumé and cover-letter documents (founder directive 31). Generated on our own server: nothing is sent to any outside service.
 * Single-column layouts with standard headings and real text (no images of text), so applicant tracking systems can read them.
 */

const GOLD = rgb(0.659, 0.541, 0.361);
const INK = rgb(0.13, 0.12, 0.11);
const MUTED = rgb(0.38, 0.36, 0.33);
const GOLD_HEX = "A88A5C";

// ─── PDF ───────────────────────────────────────────────────────────────────────────────────────
type Pen = { doc: PDFDocument; page: PDFPage; y: number; serif: PDFFont; serifBold: PDFFont; sans: PDFFont; sansBold: PDFFont };
const W = 612, H = 792, M = 58;

/** Standard PDF fonts cover Western European text; anything else is replaced so a document always generates. */
function clean(font: PDFFont, text: string) {
  let out = "";
  for (const ch of text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"')) {
    try { font.encodeText(ch); out += ch; } catch { out += "?"; }
  }
  return out;
}
function wrap(font: PDFFont, text: string, size: number, width: number) {
  const lines: string[] = [];
  for (const para of clean(font, text).split(/\n+/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > width && line) { lines.push(line); line = word; } else line = next;
    }
    if (line) lines.push(line);
  }
  return lines;
}
function ensure(p: Pen, needed: number) {
  if (p.y - needed < M) { p.page = p.doc.addPage([W, H]); p.y = H - M; }
}
function text(p: Pen, s: string, opts: { font: PDFFont; size: number; color?: ReturnType<typeof rgb>; indent?: number; gap?: number; width?: number }) {
  const indent = opts.indent ?? 0;
  const lines = wrap(opts.font, s, opts.size, (opts.width ?? W - 2 * M) - indent);
  for (const l of lines) {
    ensure(p, opts.size + 3);
    p.page.drawText(l, { x: M + indent, y: p.y - opts.size, size: opts.size, font: opts.font, color: opts.color ?? INK });
    p.y -= opts.size + 3.5;
  }
  p.y -= opts.gap ?? 0;
}
function rule(p: Pen, thickness = 0.8) {
  ensure(p, 8);
  p.page.drawLine({ start: { x: M, y: p.y }, end: { x: W - M, y: p.y }, thickness, color: GOLD });
  p.y -= 10;
}
function heading(p: Pen, title: string) {
  ensure(p, 40);
  p.y -= 8;
  text(p, title.toUpperCase(), { font: p.sansBold, size: 9.5, color: GOLD });
  p.y += 1;
  rule(p, 0.6);
}
function bullet(p: Pen, s: string) {
  ensure(p, 14);
  p.page.drawText("•", { x: M + 4, y: p.y - 10, size: 10, font: p.sans, color: GOLD });
  text(p, s, { font: p.sans, size: 10, indent: 16, gap: 1 });
}

async function pen() {
  const doc = await PDFDocument.create();
  const [serif, serifBold, sans, sansBold] = await Promise.all([
    doc.embedFont(StandardFonts.TimesRoman), doc.embedFont(StandardFonts.TimesRomanBold), doc.embedFont(StandardFonts.Helvetica), doc.embedFont(StandardFonts.HelveticaBold),
  ]);
  return { doc, page: doc.addPage([W, H]), y: H - M, serif, serifBold, sans, sansBold } as Pen;
}
function header(p: Pen, c: ResumeData["contact"]) {
  text(p, c.name || "Your Name", { font: p.serifBold, size: 24 });
  if (c.headline) text(p, c.headline, { font: p.serif, size: 12.5, color: MUTED, gap: 2 });
  const line = [c.location, c.email, c.phone, ...c.links].filter(Boolean).join("   ·   ");
  if (line) text(p, line, { font: p.sans, size: 9, color: MUTED, gap: 2 });
  rule(p, 1.2);
}

export async function resumePdf(r: ResumeData, template: string, title: string) {
  const p = await pen();
  p.doc.setTitle(title); p.doc.setAuthor(r.contact.name || ""); p.doc.setCreator("The Art of Connect");
  header(p, r.contact);
  for (const section of sectionOrder(template)) {
    if (section === "summary" && r.summary) { heading(p, sectionTitle(section, template)); text(p, r.summary, { font: p.sans, size: 10.2, gap: 2 }); }
    if (section === "experience" && r.experience.length) {
      heading(p, sectionTitle(section, template));
      for (const e of r.experience) {
        ensure(p, 40);
        const dates = dateRange(e);
        const dw = p.sans.widthOfTextAtSize(clean(p.sans, dates), 9);
        p.page.drawText(clean(p.sans, dates), { x: W - M - dw, y: p.y - 11, size: 9, font: p.sans, color: MUTED });
        text(p, e.title || "Role", { font: p.serifBold, size: 11.5, width: W - 2 * M - dw - 12 });
        const org = [e.organization, e.location].filter(Boolean).join(", ");
        if (org) text(p, org, { font: p.serif, size: 10.5, color: MUTED, gap: 1 });
        for (const h of e.highlights) bullet(p, h);
        p.y -= 5;
      }
    }
    if (section === "education" && r.education.length) {
      heading(p, sectionTitle(section, template));
      for (const e of r.education) {
        text(p, [e.credential, e.field].filter(Boolean).join(", ") || e.school, { font: p.serifBold, size: 11 });
        text(p, [e.school, e.year, e.honors].filter(Boolean).join("  ·  "), { font: p.sans, size: 9.5, color: MUTED, gap: 4 });
      }
    }
    if (section === "certifications" && r.certifications.length) {
      heading(p, sectionTitle(section, template));
      for (const c of r.certifications) bullet(p, [c.name, c.issuer, c.year, c.credentialId && `Credential ${c.credentialId}`].filter(Boolean).join(" · "));
    }
    if (section === "skills" && r.skills.length) { heading(p, sectionTitle(section, template)); text(p, r.skills.join("   ·   "), { font: p.sans, size: 10, gap: 2 }); }
    if (section === "accomplishments" && r.accomplishments.length) { heading(p, sectionTitle(section, template)); for (const a of r.accomplishments) bullet(p, a); }
  }
  return p.doc.save();
}

export async function letterPdf(l: LetterData, title: string) {
  const p = await pen();
  p.doc.setTitle(title); p.doc.setCreator("The Art of Connect");
  header(p, l.contact);
  p.y -= 10;
  if (l.date) text(p, l.date, { font: p.sans, size: 10.2, gap: 8 });
  for (const s of [l.recipientName, l.recipientTitle, l.company]) if (s) text(p, s, { font: p.sans, size: 10.2 });
  p.y -= 10;
  if (l.role) text(p, `Re: ${l.role}`, { font: p.serifBold, size: 11, gap: 8 });
  text(p, `Dear ${l.recipientName || "Hiring Manager"},`, { font: p.sans, size: 10.5, gap: 6 });
  for (const para of [l.opening, ...l.body.split(/\n{2,}/), l.closing].filter(Boolean)) text(p, para, { font: p.sans, size: 10.5, gap: 7 });
  p.y -= 6;
  text(p, l.signOff || "Sincerely,", { font: p.sans, size: 10.5, gap: 14 });
  text(p, l.contact.name || "", { font: p.serifBold, size: 12 });
  return p.doc.save();
}

// ─── Word (.docx) ─────────────────────────────────────────────────────────────────────────────
const run = (t: string, o: { bold?: boolean; size?: number; color?: string; font?: string; italics?: boolean } = {}) =>
  new TextRun({ text: t, bold: o.bold, size: o.size ?? 20, color: o.color ?? "222222", font: o.font ?? "Calibri", italics: o.italics });
const para = (children: TextRun[], after = 60, extra: Record<string, unknown> = {}) => new Paragraph({ children, spacing: { after }, ...extra });
const docxHeading = (t: string) => new Paragraph({
  children: [run(t.toUpperCase(), { bold: true, size: 19, color: GOLD_HEX })],
  spacing: { before: 220, after: 80 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD_HEX, space: 2 } },
});
function docxHeader(c: ResumeData["contact"]) {
  return [
    para([run(c.name || "Your Name", { bold: true, size: 48, font: "Georgia" })], 20),
    ...(c.headline ? [para([run(c.headline, { size: 25, font: "Georgia", color: "5E5A54" })], 40)] : []),
    new Paragraph({
      children: [run([c.location, c.email, c.phone, ...c.links].filter(Boolean).join("   ·   "), { size: 18, color: "5E5A54" })],
      spacing: { after: 120 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD_HEX, space: 4 } },
    }),
  ];
}
const bulletPara = (t: string) => new Paragraph({ children: [run(t)], bullet: { level: 0 }, spacing: { after: 40 } });

export async function resumeDocx(r: ResumeData, template: string, title: string) {
  const body: Paragraph[] = [...docxHeader(r.contact)];
  for (const section of sectionOrder(template)) {
    if (section === "summary" && r.summary) body.push(docxHeading(sectionTitle(section, template)), para([run(r.summary)], 80));
    if (section === "experience" && r.experience.length) {
      body.push(docxHeading(sectionTitle(section, template)));
      for (const e of r.experience) {
        body.push(new Paragraph({
          children: [run(e.title || "Role", { bold: true, size: 23, font: "Georgia" }), run(`\t${dateRange(e)}`, { size: 18, color: "5E5A54" })],
          tabStops: [{ type: TabStopType.RIGHT, position: 9360 }], spacing: { before: 100, after: 20 },
        }));
        const org = [e.organization, e.location].filter(Boolean).join(", ");
        if (org) body.push(para([run(org, { italics: true, color: "5E5A54", font: "Georgia", size: 21 })], 40));
        for (const h of e.highlights) body.push(bulletPara(h));
      }
    }
    if (section === "education" && r.education.length) {
      body.push(docxHeading(sectionTitle(section, template)));
      for (const e of r.education) {
        body.push(para([run([e.credential, e.field].filter(Boolean).join(", ") || e.school, { bold: true, font: "Georgia", size: 22 })], 10));
        body.push(para([run([e.school, e.year, e.honors].filter(Boolean).join("  ·  "), { size: 19, color: "5E5A54" })], 80));
      }
    }
    if (section === "certifications" && r.certifications.length) {
      body.push(docxHeading(sectionTitle(section, template)));
      for (const c of r.certifications) body.push(bulletPara([c.name, c.issuer, c.year, c.credentialId && `Credential ${c.credentialId}`].filter(Boolean).join(" · ")));
    }
    if (section === "skills" && r.skills.length) body.push(docxHeading(sectionTitle(section, template)), para([run(r.skills.join("   ·   "))], 80));
    if (section === "accomplishments" && r.accomplishments.length) { body.push(docxHeading(sectionTitle(section, template))); for (const a of r.accomplishments) body.push(bulletPara(a)); }
  }
  return pack(title, r.contact.name, body);
}

export async function letterDocx(l: LetterData, title: string) {
  const body: Paragraph[] = [...docxHeader(l.contact)];
  if (l.date) body.push(para([run(l.date)], 200));
  for (const s of [l.recipientName, l.recipientTitle, l.company]) if (s) body.push(para([run(s)], 0));
  if (l.role) body.push(para([run(`Re: ${l.role}`, { bold: true, font: "Georgia", size: 22 })], 200, { spacing: { before: 200, after: 200 } }));
  body.push(para([run(`Dear ${l.recipientName || "Hiring Manager"},`)], 160));
  for (const p of [l.opening, ...l.body.split(/\n{2,}/), l.closing].filter(Boolean)) body.push(para([run(p, { size: 21 })], 160, { alignment: AlignmentType.LEFT }));
  body.push(para([run(l.signOff || "Sincerely,")], 360), para([run(l.contact.name || "", { bold: true, font: "Georgia", size: 24 })]));
  return pack(title, l.contact.name, body);
}

function pack(title: string, creator: string, children: Paragraph[]) {
  const doc = new Document({
    title, creator: creator || "The Art of Connect", description: "Created with The Art of Connect Résumé Builder",
    sections: [{ properties: { page: { margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } }, children }],
  });
  return Packer.toBuffer(doc);
}
