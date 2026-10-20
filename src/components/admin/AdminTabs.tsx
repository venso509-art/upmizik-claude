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
          { href: "/admin/enskripsyon", label: "🎤 Enskripsyon", badge: registrations },
          { href: "/admin/don", label: "💝 Don", badge: donations },
          { href: "/admin/retre", label: "💸 Retrè", badge: payouts },
        ]}
      />
    </div>
  );
}
