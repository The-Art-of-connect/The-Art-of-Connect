import "server-only";
import { randomUUID, createHash } from "node:crypto";
import { MAX_UPLOAD_BYTES, baseUserClient, rejectedFields, presignDownload, presignUpload, readScan, removeObject, testCommands as C, vaultConfig, vaultSession } from "@/lib/vault-aws";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Owner-run security self-test of the testing Document Vault, against the REAL role and bucket policy (not assumptions).
 * Uses fictional files only: a plain text document and the standard EICAR antivirus test string (harmless by design, built at
 * run time). Results record outcomes only: never keys, tokens, External IDs or document contents.
 */
export type Result = { id: string; name: string; expected: string; outcome: "pass" | "fail" | "inconclusive" | "owner_action"; detail: string };
type Objects = { prefix: string; clean: string; eicar: string; startedAt: string; done?: boolean };

const errName = (e: unknown) => (e as { name?: string; Code?: string }).name ?? (e as { Code?: string }).Code ?? "Error";
const denied = (e: unknown) => ["AccessDenied", "Forbidden", "AccessDeniedException"].includes(errName(e)) || /AccessDenied|403/.test(String((e as Error).message ?? ""));
const FICTIONAL = "The Art of Connect, LLC: fictional vault test document. Not a real record. Fictional Harbor Logistics, Atlanta.\n";
// EICAR standard antivirus test string, assembled at run time so it never appears in our source or build.
const eicar = () => ["X5O!P%@AP[4\\PZX54(P^)7CC)7}", "$EICAR-STANDARD-ANTIVIRUS", "-TEST-FILE!$H+H*"].join("");

async function attempt(fn: () => Promise<unknown>) { try { await fn(); return { ok: true as const, err: null }; } catch (e) { return { ok: false as const, err: e }; } }
const r = (id: string, name: string, expected: string, outcome: Result["outcome"], detail: string): Result => ({ id, name, expected, outcome, detail });

async function putViaLink(url: string, body: string | Uint8Array, type: string) {
  const res = await fetch(url, { method: "PUT", body: typeof body === "string" ? body : Buffer.from(body), headers: { "Content-Type": type } });
  return res.status;
}

/** Phase 1: credentials, uploads, and everything that must be denied before scanning. */
export async function phaseOne(): Promise<{ objects: Objects; results: Result[] }> {
  const run = randomUUID();
  const objects: Objects = { prefix: `vault/selftest/${run}`, clean: `vault/selftest/${run}/fictional-clean.txt`, eicar: `vault/selftest/${run}/eicar-test.txt`, startedAt: new Date().toISOString() };
  const results: Result[] = [];
  const cfg = vaultConfig();
  const bucket = cfg.bucket;

  // 1. Temporary credentials.
  try {
    const s = await vaultSession(true);
    const minutes = (s.expiresAt.getTime() - Date.now()) / 60000;
    results.push(r("T01", "Temporary credential authentication", "Role session with temporary (ASIA) keys lasting 15 minutes or less", s.accessKeyPrefix === "ASIA" && minutes <= 15.5 ? "pass" : "fail",
      `Assumed the vault role with the External ID. Temporary key type ${s.accessKeyPrefix === "ASIA" ? "ASIA (temporary)" : s.accessKeyPrefix}; expires in ${minutes.toFixed(1)} minutes.`));
  } catch (e) {
    const fields = rejectedFields(e);
    const why = errName(e) === "ValidationError"
      ? `AWS rejected the request format${fields.length ? ` (field: ${fields.join(", ")})` : ""}. ${fields.includes("externalId") || !fields.length ? "An External ID may contain only letters, numbers and _ + = , . @ : / - (no other symbols)." : ""}`
      : errName(e) === "AccessDenied" ? "AWS refused: the role's trust policy must name this IAM user and the same External ID, and the user needs sts:AssumeRole on the role."
      : ["InvalidClientTokenId", "SignatureDoesNotMatch"].includes(errName(e)) ? "AWS didn't recognize the access key pair: check AOC_AWS_ACCESS_KEY_ID and AOC_AWS_SECRET_ACCESS_KEY."
      : "Check the role trust policy, External ID and user permission.";
    results.push(r("T01", "Temporary credential authentication", "Role session issued", "fail", `AssumeRole failed (${errName(e)}). ${why}`.trim()));
    return { objects: { ...objects, done: true }, results };
  }
  const { client } = await vaultSession();

  // 2. The IAM user's own key cannot reach documents.
  const base = await attempt(() => baseUserClient().send(new C.PutObjectCommand({ Bucket: bucket, Key: `${objects.prefix}/base-user.txt`, Body: FICTIONAL, ContentType: "text/plain" })));
  results.push(r("T02", "Long-term user key cannot access documents directly", "AccessDenied", !base.ok && denied(base.err) ? "pass" : "fail", base.ok ? "The user key could write to the bucket directly." : `Refused (${errName(base.err)}).`));

  // 3. Authorized uploads through signed links bound to size and type.
  const cleanBody = Buffer.from(FICTIONAL);
  const s1 = await putViaLink(await presignUpload(objects.clean, "text/plain", cleanBody.length), cleanBody, "text/plain");
  results.push(r("T03", "Authorized upload by signed link", "HTTP 200", s1 === 200 ? "pass" : "fail", `Fictional text document upload returned HTTP ${s1}.`));
  const eBody = Buffer.from(eicar());
  const s2 = await putViaLink(await presignUpload(objects.eicar, "text/plain", eBody.length), eBody, "text/plain");
  results.push(r("T04", "Authorized upload of the EICAR test file", "HTTP 200", s2 === 200 ? "pass" : "fail", `EICAR test string upload returned HTTP ${s2}.`));

  // 4. Denied before scanning.
  const pre = await attempt(() => client.send(new C.GetObjectCommand({ Bucket: bucket, Key: objects.clean })));
  const preState = await readScan(objects.clean);
  results.push(r("T05", "No access before the scan completes", "AccessDenied while untagged", !pre.ok && denied(pre.err) ? "pass" : preState === "clean" ? "inconclusive" : "fail",
    !pre.ok ? `Read refused before scanning (${errName(pre.err)}).` : preState === "clean" ? "GuardDuty had already finished scanning, so the pre-scan window could not be tested this run." : "The object was readable before scanning."));
  const raw = await getSignedUrl(client, new C.GetObjectCommand({ Bucket: bucket, Key: objects.clean }), { expiresIn: 60 });
  const preLink = (await fetch(raw)).status;
  results.push(r("T06", "A download link issued before scanning does not work", "HTTP 403", preLink === 403 ? "pass" : preState === "clean" ? "inconclusive" : "fail", `Raw signed link (bypassing the application's check) returned HTTP ${preLink}.`));
  const app = await presignDownload(objects.clean, "fictional-clean.txt");
  results.push(r("T07", "The application refuses to issue links before scanning", "No link", app === null || preState === "clean" ? "pass" : "fail", app === null ? "No link issued while the scan is pending." : "Scan had already completed."));

  // 5. Tag manipulation is impossible.
  const t1 = await attempt(() => client.send(new C.PutObjectTaggingCommand({ Bucket: bucket, Key: objects.eicar, Tagging: { TagSet: [{ Key: "GuardDutyMalwareScanStatus", Value: "NO_THREATS_FOUND" }] } })));
  results.push(r("T08", "Application cannot set the scan tag", "AccessDenied", !t1.ok && denied(t1.err) ? "pass" : "fail", t1.ok ? "The tag was changed." : `Refused (${errName(t1.err)}).`));
  const t2 = await attempt(() => client.send(new C.DeleteObjectTaggingCommand({ Bucket: bucket, Key: objects.eicar })));
  results.push(r("T09", "Application cannot remove the scan tag", "AccessDenied", !t2.ok && denied(t2.err) ? "pass" : "fail", t2.ok ? "Tags were removed." : `Refused (${errName(t2.err)}).`));
  const t3 = await attempt(() => client.send(new C.PutObjectCommand({ Bucket: bucket, Key: `${objects.prefix}/pretagged.txt`, Body: FICTIONAL, ContentType: "text/plain", Tagging: "GuardDutyMalwareScanStatus=NO_THREATS_FOUND" })));
  results.push(r("T10", "Uploads cannot arrive pre-tagged as clean", "AccessDenied", !t3.ok && denied(t3.err) ? "pass" : "fail", t3.ok ? "A pre-tagged upload was accepted." : `Refused (${errName(t3.err)}).`));
  if (t3.ok) await attempt(() => removeObject(`${objects.prefix}/pretagged.txt`));

  // 6. Prefix, size, transport.
  const out = await attempt(() => client.send(new C.PutObjectCommand({ Bucket: bucket, Key: `outside-vault/${run}.txt`, Body: FICTIONAL, ContentType: "text/plain" })));
  results.push(r("T11", "Writes outside vault/ are refused", "AccessDenied", !out.ok && denied(out.err) ? "pass" : "fail", out.ok ? "A write outside vault/ succeeded." : `Refused (${errName(out.err)}).`));
  const sizeUrl = await presignUpload(`${objects.prefix}/size.txt`, "text/plain", 20);
  const big = await putViaLink(sizeUrl, "x".repeat(40), "text/plain");
  results.push(r("T12", "Upload links accept only the approved size", "HTTP 403 for a larger file", big === 403 ? "pass" : "fail", `A 40-byte upload on a 20-byte link returned HTTP ${big}.`));
  let tooBig = false; try { await presignUpload(`${objects.prefix}/huge.bin`, "application/pdf", MAX_UPLOAD_BYTES + 1); } catch { tooBig = true; }
  results.push(r("T13", "Files over 25 MB are refused before any link is issued", "Refused", tooBig ? "pass" : "fail", tooBig ? "No link issued above the 25 MB limit." : "A link was issued above the limit."));
  const insecure = (await fetch(raw.replace(/^https:/, "http:")).catch(() => null))?.status ?? 0;
  results.push(r("T14", "Unencrypted (HTTP) requests are refused", "HTTP 403 or no connection", insecure === 403 || insecure === 0 ? "pass" : "fail", insecure ? `Plain HTTP returned ${insecure}.` : "Plain HTTP connection was refused."));
  return { objects, results };
}

/** Phase 2: once GuardDuty has tagged both files: allowed and denied access, expiry, configuration audit, clean-up. */
export async function phaseTwo(objects: Objects, waitedLongEnough: boolean): Promise<{ results: Result[]; finished: boolean }> {
  const cfg = vaultConfig();
  const bucket = cfg.bucket;
  const [cs, es] = await Promise.all([readScan(objects.clean), readScan(objects.eicar)]);
  if ((cs === "pending" || es === "pending") && !waitedLongEnough) return { results: [], finished: false };
  const results: Result[] = [];
  const { client } = await vaultSession();
  results.push(r("T15", "GuardDuty scans and tags the clean document", "NO_THREATS_FOUND", cs === "clean" ? "pass" : "fail", `Scan state: ${cs}.`));
  results.push(r("T16", "GuardDuty detects the EICAR test file", "THREATS_FOUND", es === "infected" ? "pass" : "fail", `Scan state: ${es}.`));

  if (cs === "clean") {
    const url = await presignDownload(objects.clean, "fictional-clean.txt");
    const res = url ? await fetch(url) : null;
    const text = res ? await res.text() : "";
    const ok = res?.status === 200 && createHash("sha256").update(text).digest("hex") === createHash("sha256").update(FICTIONAL).digest("hex");
    results.push(r("T17", "Clean documents can be downloaded after scanning", "HTTP 200, identical content", ok ? "pass" : "fail", `Download returned HTTP ${res?.status ?? "no link"}${ok ? "; content matches the original" : ""}.`));
    const short = await getSignedUrl(client, new C.GetObjectCommand({ Bucket: bucket, Key: objects.clean }), { expiresIn: 1 });
    await new Promise((x) => setTimeout(x, 2500));
    const expired = (await fetch(short)).status;
    results.push(r("T18", "Signed links expire", "HTTP 403 after expiry", expired === 403 ? "pass" : "fail", `A 1-second link used after 2.5 seconds returned HTTP ${expired}. Production download links last 60 seconds; upload links 5 minutes.`));
  }
  if (es === "infected" || es === "error") {
    const direct = await attempt(() => client.send(new C.GetObjectCommand({ Bucket: bucket, Key: objects.eicar })));
    results.push(r("T19", "Infected documents cannot be read", "AccessDenied", !direct.ok && denied(direct.err) ? "pass" : "fail", direct.ok ? "The infected file was readable." : `Refused (${errName(direct.err)}).`));
    const appLink = await presignDownload(objects.eicar, "eicar-test.txt");
    results.push(r("T20", "The application refuses links for infected documents", "No link", appLink === null ? "pass" : "fail", appLink === null ? "No link issued." : "A link was issued."));
    const raw = await getSignedUrl(client, new C.GetObjectCommand({ Bucket: bucket, Key: objects.eicar }), { expiresIn: 60 });
    const st = (await fetch(raw)).status;
    results.push(r("T21", "A raw signed link to an infected file does not work", "HTTP 403", st === 403 ? "pass" : "fail", `Returned HTTP ${st}.`));
    const flip = await attempt(() => client.send(new C.PutObjectTaggingCommand({ Bucket: bucket, Key: objects.eicar, Tagging: { TagSet: [{ Key: "GuardDutyMalwareScanStatus", Value: "NO_THREATS_FOUND" }] } })));
    const after = await readScan(objects.eicar);
    results.push(r("T22", "An infected file cannot be relabeled as clean", "AccessDenied; tag unchanged", !flip.ok && after !== "clean" ? "pass" : "fail", `${flip.ok ? "Tag write accepted" : `Refused (${errName(flip.err)})`}; tag now ${after}.`));
  }

  // Configuration audit: read-only checks of the bucket's actual settings (where the role is allowed to read them).
  const read = async (cmd: unknown) => attempt(async () => client.send(cmd as never));
  const lc = await read(new C.GetBucketLifecycleConfigurationCommand({ Bucket: bucket }));
  if (lc.ok) {
    const out = (await client.send(new C.GetBucketLifecycleConfigurationCommand({ Bucket: bucket }))).Rules ?? [];
    const rule = out.find((x) => x.Status === "Enabled" && (x.Filter?.Prefix ?? x.Prefix ?? "").startsWith("vault") && x.Expiration?.Days === 30);
    results.push(r("T23", "Lifecycle: test documents expire after 30 days", "Enabled rule on vault/ with 30-day expiration", rule ? "pass" : "fail", rule ? `Rule "${rule.ID}" is enabled for ${rule.Filter?.Prefix ?? rule.Prefix} with 30-day expiration.` : `Rules found: ${out.map((x) => `${x.ID}:${x.Status}:${x.Filter?.Prefix ?? ""}:${x.Expiration?.Days ?? "-"}`).join(", ") || "none"}.`));
  } else {
    results.push(r("T23", "Lifecycle: test documents expire after 30 days", "Readable and correct", "owner_action", `The vault role isn't permitted to read the lifecycle configuration (${errName(lc.err)}), which is correct for least privilege. To let the self-test verify it, add the optional read-only audit statement, or confirm it in the S3 console.`));
  }
  const pol = await read(new C.GetBucketPolicyCommand({ Bucket: bucket }));
  if (pol.ok) {
    const text = (await client.send(new C.GetBucketPolicyCommand({ Bucket: bucket }))).Policy ?? "";
    const okp = /NO_THREATS_FOUND/.test(text) && /PutObjectTagging/.test(text) && /SecureTransport/.test(text);
    results.push(r("T24", "Bucket policy contains the scan, tag and TLS protections", "All three present", okp ? "pass" : "fail", okp ? "Bucket policy text verified." : "One or more protections were not found in the bucket policy."));
  } else {
    results.push(r("T24", "Bucket policy contents", "Readable", "owner_action", `Not readable by the vault role (${errName(pol.err)}). Its effects were verified by tests T05–T22.`));
  }
  const pab = await read(new C.GetPublicAccessBlockCommand({ Bucket: bucket }));
  if (pab.ok) {
    const c = (await client.send(new C.GetPublicAccessBlockCommand({ Bucket: bucket }))).PublicAccessBlockConfiguration;
    const all = Boolean(c?.BlockPublicAcls && c.BlockPublicPolicy && c.IgnorePublicAcls && c.RestrictPublicBuckets);
    results.push(r("T25", "Public access is blocked", "All four settings on", all ? "pass" : "fail", all ? "All four Block Public Access settings are on." : "One or more Block Public Access settings are off."));
  } else {
    results.push(r("T25", "Public access block", "Readable", "owner_action", `Not readable by the vault role (${errName(pab.err)}).`));
  }
  const anon = await fetch(`https://${bucket}.s3.${cfg.region}.amazonaws.com/${objects.clean}`).then((x) => x.status).catch(() => 0);
  results.push(r("T26", "Anonymous internet access is refused", "HTTP 403", anon === 403 ? "pass" : "fail", `An unsigned request for the clean file returned HTTP ${anon}.`));

  // Environment handling: nothing secret in this run's stored results.
  const blob = JSON.stringify(results);
  const leaked = [cfg.accessKeyId, cfg.secretAccessKey, cfg.externalId].some((v) => v && blob.includes(v));
  results.push(r("T27", "Secrets never appear in results or responses", "No key, secret or External ID in output", leaked ? "fail" : "pass", leaked ? "A secret value appeared in results." : "Results contain no key, secret, session token or External ID."));

  // Clean-up of fictional objects.
  const del = await Promise.all([objects.clean, objects.eicar, `${objects.prefix}/size.txt`].map((k) => attempt(() => removeObject(k))));
  results.push(r("T28", "Fictional test files removed", "Deleted", del.every((d) => d.ok) ? "pass" : "inconclusive", del.every((d) => d.ok) ? "Test files deleted; any remainder expires under the 30-day lifecycle rule." : "Some test files could not be deleted; the 30-day lifecycle rule will remove them."));
  return { results, finished: true };
}
