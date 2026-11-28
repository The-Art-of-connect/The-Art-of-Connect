import type { Metadata } from "next";
import { UnlockPrompt } from "@/components/UnlockPrompt";
import { safeReturn, type Need } from "@/lib/gate";
import { brandName } from "@/lib/brand";

export const metadata: Metadata = { title: "Membership", robots: { index: false } };

const FEATURES: Record<string, { need: Need; name: string; what: string; href: string }> = {
  relationships: { need: { experience: "relationships" }, name: brandName("in-love"), what: "Experience a more intentional approach to love, relationships and compatibility.", href: "/app/relationships" },
  business: { need: { experience: "business" }, name: brandName("in-business"), what: "Connect, collaborate and grow with business owners, mentors and The Professional Society.", href: "/app/business" },
  paid: { need: { level: "one" }, name: "Your membership", what: "Connections, circles, events and Journey's personal guidance come with every paid membership.", href: "/app" },
};

/** Directive 36: a locked page opened directly shows the same pop-up as everywhere else; "Maybe later" returns the member. */
export default async function Unlock({ searchParams }: { searchParams: Promise<{ need?: string; from?: string; feature?: string }> }) {
  const sp = await searchParams;
  const f = FEATURES[sp.need ?? ""] ?? FEATURES.paid;
  return <UnlockPrompt need={f.need} feature={{ name: f.name, what: f.what }} href={f.href} from={safeReturn(sp.from) ?? "/app"} />;
}
