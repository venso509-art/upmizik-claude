import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { getSettings } from "@/lib/settings-server";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { MemberAdminList, type AdminMember } from "@/components/admin/MemberAdminList";
import { monthKey, type MemberStatus } from "@/lib/members";

export const metadata: Metadata = { title: "Admin: Manm afilye | UpMizik" };
export const dynamic = "force-dynamic";

const TABS = [
  { status: "pending", label: "⏳ Ap tann" },
  { status: "approved", label: "🤝 Aktif" },
  { status: "blocked", label: "⛔ Bloke" },
] as const;

type Row = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  city: string | null;
  motivation: string | null;
  pseudo_referral: string | null;
  objective_total: number;
  current_progress: number;
  total_earned: number;
  status: MemberStatus;
  admin_note: string | null;
  created_at: string;
};

// Manm afilye yo: apwouve (pseudo otomatik), bloke, wè pwogrè yo, epi anrejistre peman chak mwa
export default async function AdminMembersPage({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const status = TABS.find((t) => t.status === searchParams.status)?.status ?? "pending";
  const [{ data, error }, settings, ...counts] = await Promise.all([
    supabase
      .from("members")
      .select("id, user_id, full_name, email, phone, city, motivation, pseudo_referral, objective_total, current_progress, total_earned, status, admin_note, created_at")
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<Row[]>(),
    getSettings(),
    ...TABS.map((t) => supabase.from("members").select("id", { count: "exact", head: true }).eq("status", t.status)),
  ]);
  const rows = data ?? [];
  const ids = rows.map((r) => r.id);

  // Atis ki konte (apwouve) pou chak manm, pa mwa + peman yo
  const [{ data: refs }, { data: pays }] = await Promise.all([
    ids.length
      ? supabase.from("profiles").select("referred_by_member_id, referral_counted_at").in("referred_by_member_id", ids).not("referral_counted_at", "is", null)
      : Promise.resolve({ data: [] }),
    ids.length ? supabase.from("member_payouts").select("member_id, period, amount_usd").in("member_id", ids) : Promise.resolve({ data: [] }),
  ]);
  const monthCounts = new Map<string, Map<string, number>>();
  for (const r of (refs ?? []) as { referred_by_member_id: string; referral_counted_at: string }[]) {
    const k = monthKey(new Date(r.referral_counted_at));
    const m = monthCounts.get(r.referred_by_member_id) ?? new Map<string, number>();
    m.set(k, (m.get(k) ?? 0) + 1);
    monthCounts.set(r.referred_by_member_id, m);
  }
  const paidMap = new Map<string, number>();
  for (const p of (pays ?? []) as { member_id: string; period: string; amount_usd: number }[]) paidMap.set(`${p.member_id}:${p.period.slice(0, 7)}`, Number(p.amount_usd));

  const members: AdminMember[] = rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    fullName: r.full_name,
    email: r.email,
    phone: r.phone,
    city: r.city,
    motivation: r.motivation,
    pseudo: r.pseudo_referral,
    objective: r.objective_total,
    totalProgress: r.current_progress,
    totalEarned: Number(r.total_earned),
    status: r.status,
    adminNote: r.admin_note,
    createdAt: r.created_at,
    months: Array.from(monthCounts.get(r.id)?.entries() ?? [])
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, count]) => ({ key, count, paid: paidMap.get(`${r.id}:${key}`) ?? null })),
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminTabs />

      <h1 className="text-3xl font-extrabold tracking-tight text-white">🤝 Manm afilye</h1>
      <p className="mt-1 text-zinc-400">
        Moun ki ede atis yo enskri. Apwouve yo pou yo jwenn pseudo yo. Chak atis apwouve ki enskri ak pseudo a konte: 1 $ pa atis jiska objektif la, 2,50 $
        apre sa. Peye yo chak mwa isit la.
      </p>

      <nav className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t, i) => (
          <Link
            key={t.status}
            href={`/admin/manm?status=${t.status}`}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              status === t.status ? "bg-citron-400 font-semibold text-zinc-950" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {t.label} <span className="opacity-70">({counts[i].count ?? 0})</span>
          </Link>
        ))}
      </nav>

      {error ? (
        <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          Paj la pa ka chaje manm yo. Kouri migration 20261218000000_affiliate_members.sql nan Supabase.
        </p>
      ) : (
        <div className="mt-6">
          <MemberAdminList members={members} htgPerUsd={settings.htgPerUsd} thisMonth={monthKey(new Date())} />
        </div>
      )}
    </div>
  );
}
