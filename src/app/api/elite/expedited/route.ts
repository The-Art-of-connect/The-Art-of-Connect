import { NextResponse } from "next/server";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { allow } from "@/lib/ratelimit";
import { startExpeditedPayment } from "@/lib/elite-verification";

/** Starts Stripe Checkout for the expedited verification fee and returns the Checkout URL. */
export async function POST() {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer) || viewer.viewAs) return NextResponse.json({ error: "Please sign in with your own account (not View as or preview)." }, { status: 401 });
  if (!(await allow(`elite-fee:${viewer.id}`, 10, 3600))) return NextResponse.json({ error: "Please try again in a little while." }, { status: 429 });
  try {
    const r = await startExpeditedPayment({ userId: viewer.id, email: viewer.email });
    if (!r.ok) {
      console.warn(`[elite-fee] refused for ${viewer.id}: ${r.message}`);
      return NextResponse.json({ error: r.message }, { status: 403 });
    }
    if (!r.url) throw new Error("Stripe returned no checkout URL");
    return NextResponse.json({ url: r.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[elite-fee] checkout failed for ${viewer.id}: ${msg}`);
    return NextResponse.json({ error: "Checkout couldn't start. Nothing was charged." }, { status: 502 });
  }
}
