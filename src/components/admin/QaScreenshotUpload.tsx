"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadQaScreenshots } from "@/app/actions/qa";

/** Shrinks a screenshot to at most 1600px and JPEG so phone screenshots upload quickly and within the server's limits. */
async function shrink(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch { return file; }
}

export function QaScreenshotUpload({ featureKey }: { featureKey: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  function upload() {
    const files = [...(input.current?.files ?? [])].slice(0, 6);
    if (!files.length) { setMsg({ ok: false, text: "Choose one or more screenshots first." }); return; }
    start(async () => {
      const fd = new FormData();
      fd.set("key", featureKey); fd.set("note", note);
      for (const f of files) fd.append("files", await shrink(f));
      const r = await uploadQaScreenshots(null, fd);
      setMsg({ ok: Boolean(r?.ok), text: r?.message ?? "Please try again." });
      if (r?.ok) { setNote(""); if (input.current) input.current.value = ""; router.refresh(); }
    });
  }
  return (
    <div className="space-y-2">
      <input ref={input} type="file" accept="image/*" multiple className="block w-full text-sm" aria-label="Screenshots" />
      <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Optional note about these screenshots" className="field w-full text-sm" />
      <button type="button" onClick={upload} disabled={pending} className="btn btn-ghost btn-sm">{pending ? "Uploading…" : "Upload screenshots"}</button>
      {msg && <p className={`text-xs ${msg.ok ? "text-success" : "text-danger"}`} role="status">{msg.text}</p>}
    </div>
  );
}
