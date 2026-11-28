"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const TYPES = "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,image/jpeg,image/png";

/**
 * Uploads a new version of a Deal Room document directly to the secure vault, then follows the malware scan.
 * The file goes from this browser to storage over an encrypted, single-use link bound to its exact size and type;
 * it can't be opened by anyone until the security check finds no threats.
 */
export function VaultUpload({ documentId }: { documentId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function upload(file: File) {
    setBusy(true);
    try {
      if (file.size > 25 * 1024 * 1024) { setState("Please choose a file under 25 MB."); return; }
      if (!TYPES.split(",").includes(file.type)) { setState("Please upload a PDF, Word, Excel, CSV, JPEG or PNG file."); return; }
      setState("Preparing a secure upload…");
      const sha = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()))).map((b) => b.toString(16).padStart(2, "0")).join("");
      const res = await fetch("/api/vault/upload-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId, fileName: file.name, mimeType: file.type, size: file.size, sha256: sha }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setState(j.error ?? "The upload couldn't start."); return; }
      setState("Uploading securely…");
      const put = await fetch(j.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!put.ok) { setState("The upload didn't complete. Please try again."); return; }
      setState("Uploaded. Running the security check…");
      for (let i = 0; i < 24; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        const s = await fetch(`/api/vault/status?id=${j.versionId}`).then((x) => x.json()).catch(() => ({}));
        if (s.state === "clean") { setState("Passed the security check. It's ready to open."); router.refresh(); return; }
        if (s.state === "infected" || s.state === "error") { setState("This file didn't pass the security check and has been locked."); router.refresh(); return; }
      }
      setState("The security check is still running. Refresh in a minute to see the result.");
      router.refresh();
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="text-xs">
      <label className={`btn btn-ghost btn-sm cursor-pointer ${busy ? "pointer-events-none opacity-50" : ""}`}>
        Attach a file
        <input ref={input} type="file" accept={TYPES} className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
      </label>
      {state && <p className="mt-2 text-muted" role="status">{state}</p>}
    </div>
  );
}
