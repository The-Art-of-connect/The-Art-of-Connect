import QRCode from "qrcode";
import { getPublicWebinar, publicWebinarUrl } from "@/lib/webinars";

/** Downloadable QR code that leads to the webinar's page on The Art of Connect (tagged as "qr"). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const w = await getPublicWebinar(id);
  if (!w || w.status !== "approved") return new Response("Not found", { status: 404 });
  const png = await QRCode.toBuffer(publicWebinarUrl(id, "qr"), { width: 1024, margin: 2, color: { dark: "#211C18", light: "#F8F3E9" }, errorCorrectionLevel: "M" });
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Content-Disposition": `attachment; filename="webinar-qr.png"`, "Cache-Control": "public, max-age=3600" },
  });
}
