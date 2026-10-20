import { createClient } from "@/lib/supabase/server";
import { NavTabs } from "@/components/NavTabs";

async function countPending(table: "donations" | "payouts") {
  const { count } = await createClient().from(table).select("id", { count: "exact", head: true }).eq("status", "pending");
  return count ?? 0;
}

export async function AdminTabs() {
  const [donations, payouts] = await Promise.all([countPending("donations"), countPending("payouts")]);
  return (
    <div className="mb-8">
      <NavTabs
        tabs={[
          { href: "/admin", label: "🛡️ Apèsi" },
          { href: "/admin/don", label: "💝 Don", badge: donations },
          { href: "/admin/retre", label: "💸 Retrè", badge: payouts },
        ]}
      />
    </div>
  );
}
