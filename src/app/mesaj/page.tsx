import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Inbox, type InboxItem } from "@/components/inbox/Inbox";

export const metadata: Metadata = { title: "Mesaj | UpMizik" };

export default async function InboxPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");

  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const items: InboxItem[] = (data ?? []).map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    readAt: n.read_at,
    createdAt: n.created_at,
  }));
  const unread = items.filter((i) => !i.readAt).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight text-white">📬 Mesaj</h1>
      <p className="mt-1 text-zinc-400">
        {unread > 0 ? `Ou gen ${unread} nouvo mesaj.` : "Notifikasyon ak mesaj ekip UpMizik la."}
      </p>
      <div className="mt-8">
        <Inbox items={items} />
      </div>
    </div>
  );
}
