import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { MessageComposer, type Recipient } from "@/components/admin/MessageComposer";

export const metadata: Metadata = { title: "Admin: Mesaj | UpMizik" };

export default async function AdminMessagesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const { data } = await supabase.rpc("admin_list_users");
  const users = (data ?? []) as { id: string; display_name: string; email: string; role: string }[];
  const byRole = (role: string): Recipient[] =>
    users
      .filter((u) => u.role === role)
      .map((u) => ({ id: u.id, name: u.display_name, email: u.email }))
      .sort((a, b) => a.name.localeCompare(b.name));
  const artists = byRole("artist");
  const listeners = byRole("listener");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminTabs />

      <h1 className="text-3xl font-extrabold tracking-tight text-white">📣 Voye yon mesaj</h1>
      <p className="mt-1 text-zinc-400">
        Kominike ofisyèl, avètisman oswa nouvèl pou atis yo, koutè yo, oswa tout moun. Mesaj la parèt nan bwat 🔔 yo, epi l
        sonnen pou moun ki konekte.
      </p>

      <div className="mt-8">
        <MessageComposer artists={artists} listeners={listeners} />
      </div>
    </div>
  );
}
