import { NavTabs } from "@/components/NavTabs";

export function DashboardTabs() {
  return (
    <div className="mb-8">
      <NavTabs
        tabs={[
          { href: "/dashboard", label: "📊 Apèsi" },
          { href: "/dashboard/estatistik", label: "📈 Estatistik" },
          { href: "/dashboard/finans", label: "💰 Revni & Finans" },
        ]}
      />
    </div>
  );
}
