import { NextResponse } from "next/server";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { normalizeLetter, normalizeResume } from "@/lib/resume";
import { letterDocx, letterPdf, resumeDocx, resumePdf } from "@/lib/resume-docs";

export const runtime = "nodejs";

/** Complimentary PDF and Word downloads of the member's own résumé or letter (database policies limit reads to the owner). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; format: string }> }) {
  const { id, format } = await params;
  if (format !== "pdf" && format !== "docx") return NextResponse.json({ error: "Unknown format" }, { status: 404 });
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer) || viewer.viewAs) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const db = await createClient();
  const { data: r } = db ? await db.from("resumes").select("kind, template, title, data").eq("id", id).maybeSingle() : { data: null };
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const name = (r.title as string).replace(/[^\p{L}\p{N} _-]+/gu, "").trim().slice(0, 60) || "resume";
  const bytes = r.kind === "letter"
    ? (format === "pdf" ? await letterPdf(normalizeLetter(r.data), r.title) : await letterDocx(normalizeLetter(r.data), r.title))
    : (format === "pdf" ? await resumePdf(normalizeResume(r.data), r.template, r.title) : await resumeDocx(normalizeResume(r.data), r.template, r.title));
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}.${format}`,
      "Cache-Control": "private, no-store",
    },
  });
}
