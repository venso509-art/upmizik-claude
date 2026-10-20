import { createClient } from "@/lib/supabase/server";
import { NavTabs } from "@/components/NavTabs";

async function countPending(table: "donations" | "payouts" | "artist_registrations") {
  const { count } = await createClient().from(table).select("id", { count: "exact", head: true }).eq("status", "pending");
  return count ?? 0;
}

export async function AdminTabs() {
  const [registrations, donations, payouts] = await Promise.all([
    countPending("artist_registrations"),
    countPending("donations"),
    countPending("payouts"),
  ]);
  return (
    <div className="mb-8">
      <NavTabs
        tabs={[
          { href: "/admin", label: "🛡️ Apèsi" },
          { href: "/admin/rapo", label: "📈 Rapò" },
          { href: "/admin/enskripsyon", label: "🎤 Enskripsyon", badge: registrations },
          { href: "/admin/don", label: "💝 Don", badge: donations },
          { href: "/admin/retre", label: "💸 Retrè", badge: payouts },
          { href: "/admin/top3", label: "🏆 Top 3" },
          { href: "/admin/nivo", label: "🏅 Nivo" },
          { href: "/admin/pub", label: "📢 Pub" },
          { href: "/admin/rpa", label: "🚀 RPA" },
          { href: "/admin/sekirite", label: "🔐 Sekirite" },
          { href: "/admin/mesaj", label: "📣 Mesaj" },
        ]}
      />
    </div>
  );
}
