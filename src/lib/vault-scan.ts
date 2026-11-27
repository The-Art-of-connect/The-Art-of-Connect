/** GuardDuty Malware Protection for S3 results, mapped to the vault's scan states (pure; unit-tested). */
export type ScanState = "pending" | "clean" | "infected" | "error" | "missing";

/** GuardDuty tags: NO_THREATS_FOUND, THREATS_FOUND, UNSUPPORTED, ACCESS_DENIED, FAILED. No tag yet means the scan is pending. */
export function scanState(tag: string | undefined | null): ScanState {
  switch (tag) {
    case undefined: case null: case "": return "pending";
    case "NO_THREATS_FOUND": return "clean";
    case "THREATS_FOUND": return "infected";
    default: return "error";
  }
}

/** Every vault object lives under vault/ (the only prefix the role may use). Paths come from the database, never from members. */
export function vaultKey(storagePath: string) {
  if (!/^[A-Za-z0-9/_.-]{3,480}$/.test(storagePath) || storagePath.includes("..") || storagePath.startsWith("/")) throw new Error("invalid_path");
  return `vault/${storagePath}`;
}

/** Only these states may ever be opened: "clean" alone. */
export const openable = (s: ScanState) => s === "clean";
