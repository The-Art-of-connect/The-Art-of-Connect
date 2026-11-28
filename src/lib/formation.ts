/** Business Launch Center formation requests: shared labels. Nothing here sets a price or files anything. */
export const FORMABLE: Record<string, string> = { llc: "LLC", corporation: "Corporation", nonprofit: "Nonprofit" };

export const PROVIDER_LABEL: Record<string, string> = {
  self_filed: "I'll file with the state myself; please review my details first",
  bizee: "I'd like a professional filing service to file it for me, once one is approved",
};

/** Statuses owner and finance may set while reviewing a request (the database enforces the same list). */
export const REVIEW_STATUSES = ["processing", "filed", "completed", "cancelled", "failed"] as const;

export type OrderLike = { status: string; requested_at: string | null };

/** What the member sees for an order's status. */
export function orderStatus(o: OrderLike): { label: string; tone: "draft" | "open" | "done" | "closed" } {
  if (o.status === "draft") return o.requested_at ? { label: "Request received · under review", tone: "open" } : { label: "Draft · not sent yet", tone: "draft" };
  const map: Record<string, { label: string; tone: "draft" | "open" | "done" | "closed" }> = {
    disclosed: { label: "Fees shown · waiting for your decision", tone: "open" },
    authorized: { label: "Authorized by you", tone: "open" },
    submitted: { label: "Submitted", tone: "open" },
    processing: { label: "Being prepared by our team", tone: "open" },
    filed: { label: "Filed with the state", tone: "open" },
    completed: { label: "Complete", tone: "done" },
    cancelled: { label: "Canceled", tone: "closed" },
    refunded: { label: "Refunded", tone: "closed" },
    failed: { label: "Unable to proceed", tone: "closed" },
  };
  return map[o.status] ?? { label: o.status, tone: "open" };
}

/** Members may cancel until our team begins processing (the database enforces the same rule). */
export const canCancel = (o: OrderLike) => ["draft", "disclosed", "authorized"].includes(o.status);
