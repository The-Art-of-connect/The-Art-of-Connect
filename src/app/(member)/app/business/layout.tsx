import { BusinessTabBar } from "@/components/business/BusinessTabBar";

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-24 lg:pb-0">
      {children}
      <BusinessTabBar />
    </div>
  );
}
