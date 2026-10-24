import { NavTabs } from "@/components/NavTabs";

export function DashboardTabs() {
  return (
    <div className="mb-8">
      <NavTabs
        tabs={[
          { href: "/dashboard", label: "📊 Apèsi" },
          { href: "/dashboard/estatistik", label: "📈 Estatistik" },
          { href: "/dashboard/revni", label: "💵 Revni mwen" },
          { href: "/dashboard/finans", label: "💰 Revni & Finans" },
          { href: "/dashboard/revni-live", label: "🔴 Revni live" },
        ]}
      />
    </div>
  );
}
