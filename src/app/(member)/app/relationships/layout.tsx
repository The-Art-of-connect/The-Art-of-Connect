import { requireExperience } from "@/lib/auth";

/** The Personal Society: only members whose membership includes it (enforced for every page beneath, including direct links). */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireExperience("relationships");
  return <>{children}</>;
}
