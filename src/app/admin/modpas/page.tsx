import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { PasswordResetList, type AdminPasswordReset } from "@/components/admin/PasswordResetList";

export const metadata: Metadata = { title: "Admin: Modpas | UpMizik" };

const TABS = [
  { key: "pending", label: "⏳ Pou voye", statuses: ["pending"] },
  { key: "sent", label: "📨 Voye", statuses: ["sent"] },
  { key: "done", label: "✅ Fini", statuses: ["used", "locked", "cancelled"] },
] as const;

type Row = {
  id: string;
  email: string;
  contact_kind: AdminPasswordReset["contactKind"];
  contact: string;
  code: string;
  status: AdminPasswordReset["status"];
  attempts: number;
  created_at: string;
  expires_at: string;
  sent_at: string | null;
  used_at: string | null;
  user: { display_name: string } | { display_name: string }[] | null;
};

// Moun ki bliye modpas yo mande yon kòd; admin nan voye l ba yo sou WhatsApp oswa pa imèl
export default async function AdminPasswordResetsPage({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const tab = TABS.find((t) => t.key === searchParams.status) ?? TABS[0];
  const [{ data, error }, ...counts] = await Promise.all([
    supabase
      .from("password_resets")
      .select("id, email, contact_kind, contact, code, status, attempts, created_at, expires_at, sent_at, used_at, user:profiles!password_resets_user_id_fkey(display_name)")
      .in("status", [...tab.statuses])
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<Row[]>(),
    ...TABS.map((t) => supabase.from("password_resets").select("id", { count: "exact", head: true }).in("status", [...t.statuses])),
  ]);

  const requests: AdminPasswordReset[] = (data ?? []).map((r) => {
    const u = Array.isArray(r.user) ? r.user[0] : r.user;
    return {
      id: r.id,
      name: u?.display_name ?? "Itilizatè",
      email: r.email,
      contactKind: r.contact_kind,
      contact: r.contact,
      code: r.code,
      status: r.status,
      attempts: r.attempts,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      sentAt: r.sent_at,
      usedAt: r.used_at,
    };
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <AdminTabs />

      <h1 className="text-3xl font-extrabold tracking-tight text-white">🔑 Demann chanje modpas</h1>
      <p className="mt-1 text-zinc-400">
        Sit la kreye yon kòd 6 chif pou chak demann. Voye l bay moun nan sou WhatsApp oswa pa imèl: li mete l sou paj Konekte a epi li chwazi
        yon nouvo modpas. Verifye non an ak imèl la anvan w voye kòd la.
      </p>

      <nav className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t, i) => (
          <Link
            key={t.key}
            href={`/admin/modpas?status=${t.key}`}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              tab.key === t.key ? "bg-citron-400 font-semibold text-zinc-950" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {t.label} <span className="opacity-70">({counts[i].count ?? 0})</span>
          </Link>
        ))}
      </nav>

      {error ? (
        <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          Paj la pa ka chaje demann yo. Kouri migration 20261205000000_password_reset_codes.sql nan Supabase.
        </p>
      ) : (
        <div className="mt-6">
          <PasswordResetList requests={requests} />
        </div>
      )}
    </div>
  );
}
