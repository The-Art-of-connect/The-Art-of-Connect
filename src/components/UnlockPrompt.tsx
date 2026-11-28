"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUpgrade, UpgradeDialog, type FeatureInfo } from "@/components/Upgrade";
import { decide, type Need } from "@/lib/gate";

/** Opens the membership-aware pop-up on arrival; closing returns the member to the page they came from. */
export function UnlockPrompt({ need, feature, href, from }: { need: Need; feature: FeatureInfo; href: string; from: string }) {
  const { gate } = useUpgrade();
  const router = useRouter();
  const decision = gate ? decide(need, gate.facts) : null;
  useEffect(() => { if (decision?.kind === "allowed") router.replace(href); }, [decision?.kind, href, router]);
  if (!gate || !decision) return <p className="text-center text-sm text-muted">Please sign in to continue.</p>;
  if (decision.kind === "allowed") return null;
  return <UpgradeDialog gate={gate} decision={decision} feature={feature} href={href} need={need} onClose={() => router.push(from)} />;
}
