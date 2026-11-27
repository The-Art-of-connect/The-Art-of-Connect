import "server-only";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import {
  S3Client, PutObjectCommand, GetObjectCommand, GetObjectTaggingCommand, DeleteObjectCommand,
  PutObjectTaggingCommand, DeleteObjectTaggingCommand, GetBucketLifecycleConfigurationCommand, GetBucketPolicyCommand,
  GetPublicAccessBlockCommand, GetBucketEncryptionCommand, GetBucketVersioningCommand, GetBucketCorsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { scanState, vaultKey, type ScanState } from "./vault-scan.ts";

/**
 * Document Vault storage on Amazon S3 with GuardDuty Malware Protection (testing bucket).
 *
 * Authentication: a key-only IAM user that may do nothing but assume one role, with an External ID, for 15-minute sessions.
 * Every S3 request uses those temporary credentials. Keys and session tokens are never returned, logged or stored.
 * The role and bucket policies deny reads until GuardDuty tags an object NO_THREATS_FOUND and deny all tag changes; this module
 * additionally checks the live tag before issuing any download link.
 */
export { scanState, vaultKey, type ScanState };

const env = (k: string) => (typeof window === "undefined" ? (process.env[k] ?? "").trim() : "");
export function vaultConfig() {
  const v = {
    accessKeyId: env("AOC_AWS_ACCESS_KEY_ID"), secretAccessKey: env("AOC_AWS_SECRET_ACCESS_KEY"), externalId: env("AOC_AWS_EXTERNAL_ID"),
    roleArn: env("AOC_AWS_ROLE_ARN"), region: env("AOC_AWS_REGION"), bucket: env("AOC_VAULT_BUCKET"),
  };
  const presence = {
    access_key_id: v.accessKeyId ? (/^AKIA[A-Z0-9]{16}$/.test(v.accessKeyId) ? "configured" : "unexpected_format") : "not_configured",
    secret_access_key: v.secretAccessKey ? (v.secretAccessKey.length >= 30 ? "configured" : "unexpected_format") : "not_configured",
    // AWS accepts only letters, digits and _ + = , . @ : / - in an External ID (2 to 1,224 characters).
    external_id: !v.externalId ? "not_configured" : !/^[\w+=,.@:/-]+$/.test(v.externalId) ? "invalid_characters" : v.externalId.length < 16 ? "too_short" : v.externalId.length > 1224 ? "too_long" : "configured",
    role_arn: v.roleArn ? (/^arn:aws:iam::\d{12}:role\/[\w+=,.@/-]+$/.test(v.roleArn) ? "configured" : "unexpected_format") : "not_configured",
    region: v.region || "not_configured",
    bucket: v.bucket || "not_configured",
  } as const;
  const ready = Object.values(presence).every((x) => !["not_configured", "unexpected_format", "too_short", "too_long", "invalid_characters"].includes(x));
  return { ...v, presence, ready };
}

type Session = { client: S3Client; accessKeyPrefix: string; expiresAt: Date };
let cached: Session | null = null;

/** Temporary credentials for the vault role (15 minutes), reused until a minute before they expire. */
/** Names the request fields AWS rejected (for example "externalId"), never their values. */
export function rejectedFields(e: unknown): string[] {
  const msg = String((e as Error)?.message ?? "");
  return [...new Set([...msg.matchAll(/at '([A-Za-z]+)'/g)].map((m) => m[1]))].filter((f) => /^(externalId|roleArn|roleSessionName|durationSeconds|policy|serialNumber|tokenCode)$/.test(f));
}

export async function vaultSession(force = false): Promise<Session> {
  const c = vaultConfig();
  if (!c.ready) throw new Error("vault_not_configured");
  if (!force && cached && cached.expiresAt.getTime() - Date.now() > 60_000) return cached;
  const sts = new STSClient({ region: c.region, credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey } });
  const r = await sts.send(new AssumeRoleCommand({ RoleArn: c.roleArn, RoleSessionName: `aoc-vault-${Date.now()}`, ExternalId: c.externalId, DurationSeconds: 900 }));
  const k = r.Credentials;
  if (!k?.AccessKeyId || !k.SecretAccessKey || !k.SessionToken || !k.Expiration) throw new Error("assume_role_failed");
  cached = {
    client: new S3Client({ region: c.region, credentials: { accessKeyId: k.AccessKeyId, secretAccessKey: k.SecretAccessKey, sessionToken: k.SessionToken } }),
    accessKeyPrefix: k.AccessKeyId.slice(0, 4), expiresAt: k.Expiration,
  };
  return cached;
}

/** An S3 client using the IAM user's own long-term key (for tests proving that key alone cannot reach documents). */
export function baseUserClient() {
  const c = vaultConfig();
  return new S3Client({ region: c.region, credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey } });
}

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const UPLOAD_TTL = 300;
export const DOWNLOAD_TTL = 60;

/** A 5-minute upload link bound to the exact size and type the server approved (S3 rejects any other size). */
export async function presignUpload(key: string, contentType: string, size: number, ttl = UPLOAD_TTL) {
  if (!Number.isInteger(size) || size < 1 || size > MAX_UPLOAD_BYTES) throw new Error("size_not_allowed");
  const { client } = await vaultSession();
  return getSignedUrl(client, new PutObjectCommand({ Bucket: vaultConfig().bucket, Key: key, ContentType: contentType, ContentLength: size }), {
    expiresIn: ttl, signableHeaders: new Set(["content-type", "content-length"]),
  });
}

/** The live GuardDuty result for an object. */
export async function readScan(key: string): Promise<ScanState> {
  const { client } = await vaultSession();
  try {
    const r = await client.send(new GetObjectTaggingCommand({ Bucket: vaultConfig().bucket, Key: key }));
    return scanState(r.TagSet?.find((t) => t.Key === "GuardDutyMalwareScanStatus")?.Value);
  } catch (e) {
    return (e as { name?: string }).name === "NoSuchKey" ? "missing" : "error";
  }
}

/** A 60-second download link, issued only when the live tag says NO_THREATS_FOUND (the bucket enforces the same rule). */
export async function presignDownload(key: string, fileName: string, ttl = DOWNLOAD_TTL): Promise<string | null> {
  if ((await readScan(key)) !== "clean") return null;
  const { client } = await vaultSession();
  return getSignedUrl(client, new GetObjectCommand({
    Bucket: vaultConfig().bucket, Key: key, ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  }), { expiresIn: ttl });
}

export async function removeObject(key: string) {
  const { client } = await vaultSession();
  await client.send(new DeleteObjectCommand({ Bucket: vaultConfig().bucket, Key: key }));
}

/** Low-level commands used only by the owner's security self-test. */
export const testCommands = {
  PutObjectCommand, GetObjectCommand, PutObjectTaggingCommand, DeleteObjectTaggingCommand, GetBucketLifecycleConfigurationCommand,
  GetBucketPolicyCommand, GetPublicAccessBlockCommand, GetBucketEncryptionCommand, GetBucketVersioningCommand, GetBucketCorsCommand,
};
