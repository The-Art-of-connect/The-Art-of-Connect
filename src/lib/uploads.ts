import "server-only";
import { randomUUID } from "node:crypto";

/**
 * Validates an uploaded image by its actual bytes (not its name or declared
 * type): PNG, JPEG or WebP only, up to 5 MB.
 */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function sniffImage(bytes: Uint8Array): "png" | "jpg" | "webp" | null {
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.length > 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "webp";
  return null;
}

export async function readImage(file: FormDataEntryValue | null): Promise<{ ok: true; bytes: Uint8Array; ext: string; contentType: string; name: string } | { ok: false; error: string } | null> {
  if (!file || typeof file === "string" || file.size === 0) return null;
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "Images must be 5 MB or smaller." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) return { ok: false, error: "Please upload a PNG, JPEG or WebP image." };
  const contentType = kind === "jpg" ? "image/jpeg" : `image/${kind}`;
  return { ok: true, bytes, ext: kind, contentType, name: `${randomUUID()}.${kind}` };
}
