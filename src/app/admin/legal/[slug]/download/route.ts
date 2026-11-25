import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { getMfaStatus } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Downloads a version as a Markdown file (owner and executive, MFA-verified). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const viewer = await getViewer();
  if (!viewer || !viewer.roles.some((r) => r === "owner" || r === "executive")) return new NextResponse("Not found", { status: 404 });
  if (!(await getMfaStatus()).verified) return new NextResponse("Two-step verification required", { status: 403 });
  const { slug } = await params;
  const id = request.nextUrl.searchParams.get("v");
  const supabase = (await createClient())!;
  const q = supabase.from("legal_document_versions").select("title, version_label, status, effective_date, body, body_sha256").eq("document_slug", slug);
  const { data } = id ? await q.eq("id", id).maybeSingle() : await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return new NextResponse("Not found", { status: 404 });
  const header = `# ${data.title}\n\nThe Art of Connect, LLC · Version ${data.version_label} · Status: ${data.status}${data.effective_date ? ` · Effective ${data.effective_date}` : ""}\nSHA-256: ${data.body_sha256}\n\n---\n\n`;
  return new NextResponse(header + data.body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-${data.version_label}.md"`,
      "Cache-Control": "no-store",
    },
  });
}
