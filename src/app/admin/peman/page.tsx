import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { getSettings } from "@/lib/settings-server";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { PaymentSettingsForm } from "@/components/admin/PaymentSettingsForm";

export const metadata: Metadata = { title: "Admin: Peman | UpMizik" };

export default async function AdminPaymentSettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminTabs />

      <h1 className="text-3xl font-extrabold tracking-tight text-white">💳 Konfigirasyon peman</h1>
      <p className="mt-1 text-zinc-400">To echanj, nimewo MonCash/NatCash ak pri yo. Chanjman yo aplike sou tout sit la touswit.</p>

      <div className="mt-8">
        <PaymentSettingsForm initial={settings} />
      </div>
    </div>
  );
}
