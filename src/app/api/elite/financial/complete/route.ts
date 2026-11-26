import { NextResponse } from "next/server";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { completeFinancialSession } from "@/lib/elite-verification";

export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer) || viewer.viewAs) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { session } = (await req.json().catch(() => ({}))) as { session?: string };
  if (!session || !/^fcsess_[A-Za-z0-9]+$/.test(session)) return NextResponse.json({ error: "Unknown connection." }, { status: 400 });
  try {
    const r = await completeFinancialSession({ userId: viewer.id, stripeSessionId: session });
    return r.ok ? NextResponse.json(r) : NextResponse.json({ error: r.message }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "We couldn't read the connection from Stripe. Please try again." }, { status: 502 });
  }
}
