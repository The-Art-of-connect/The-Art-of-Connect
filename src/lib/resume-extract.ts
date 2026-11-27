import "server-only";

/** Extracts plain text from an uploaded résumé on our own server (no outside service). */
export const UPLOAD_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

/** Confirms the file really is what it claims to be (PDF or Word), by its first bytes. */
export function sniff(buf: Uint8Array, mime: string) {
  if (mime === "application/pdf") return buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46; // %PDF
  return buf[0] === 0x50 && buf[1] === 0x4b; // ZIP container (docx)
}

export async function extractText(buf: Uint8Array, mime: string): Promise<string> {
  if (mime === "application/pdf") {
    const { extractText: pdfText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await pdfText(pdf, { mergePages: true });
    return String(Array.isArray(text) ? text.join("\n") : text).slice(0, 40000);
  }
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
  return value.slice(0, 40000);
}
