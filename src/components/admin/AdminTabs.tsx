import { createClient } from "@/lib/supabase/server";
import { NavTabs } from "@/components/NavTabs";

async function countPending(table: "donations" | "payouts" | "artist_registrations" | "pro_requests" | "password_resets") {
  const { count } = await createClient().from(table).select("id", { count: "exact", head: true }).eq("status", "pending");
  return count ?? 0;
}

export async function AdminTabs() {
  const [registrations, donations, payouts, pro, resets] = await Promise.all([
    countPending("artist_registrations"),
    countPending("donations"),
    countPending("payouts"),
    countPending("pro_requests"),
    countPending("password_resets"),
  ]);
  return (
    <div className="mb-8">
      <NavTabs
        tabs={[
          { href: "/admin", label: "🛡️ Apèsi" },
          { href: "/admin/rapo", label: "📈 Rapò" },
          { href: "/admin/mizik", label: "🎵 Mizik" },
          { href: "/admin/enskripsyon", label: "🎤 Enskripsyon", badge: registrations },
          { href: "/admin/don", label: "💝 Don", badge: donations },
          { href: "/admin/retre", label: "💸 Retrè", badge: payouts },
          { href: "/admin/kont", label: "💼 Kont atis" },
          { href: "/admin/relve", label: "🗂️ Relve mwa" },
          { href: "/admin/peman", label: "💳 Peman" },
          { href: "/admin/pro", label: "⭐ Pro", badge: pro },
          { href: "/admin/pos", label: "🗞️ Jesyon Pòs" },
          { href: "/admin/top3", label: "🏆 Top 3" },
          { href: "/admin/nivo", label: "🏅 Nivo" },
          { href: "/admin/pub", label: "📢 Pub" },
          { href: "/admin/rpa", label: "🚀 RPA" },
          { href: "/admin/sekirite", label: "🔐 Sekirite" },
          { href: "/admin/modpas", label: "🔑 Modpas", badge: resets },
          { href: "/admin/achiv", label: "🗄️ Achiv" },
          { href: "/admin/mesaj", label: "📣 Mesaj" },
        ]}
      />
    </div>
  );
}
