import { BusinessTabBar } from "@/components/business/BusinessTabBar";
import { requireExperience } from "@/lib/auth";

/** The Professional Society: only members whose membership includes it (enforced for every page beneath, including direct links). */
export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  await requireExperience("business");
  return (
    <div className="pb-24 lg:pb-0">
      {children}
      <BusinessTabBar />
    </div>
  );
}
