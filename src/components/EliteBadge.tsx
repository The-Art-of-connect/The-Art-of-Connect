"use client";
import { MembershipEmblem } from "@/components/MembershipEmblem";

/**
 * The Elite Concierge membership emblem (founder directive 39): signature orange-gold and black, with a crown.
 * Shown only for members with an active Elite badge (issued by the owner or by an active Elite Concierge membership);
 * never purchasable or self-assigned. Identity verification is a separate orange check (IdentityCheck).
 */
export function EliteBadge({ size = 18, interactive = true }: { size?: number; interactive?: boolean }) {
  return <MembershipEmblem tier="elite" size={size} interactive={interactive} />;
}
