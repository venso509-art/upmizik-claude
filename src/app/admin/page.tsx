import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { countDonations, loadAdminDonations } from "@/lib/adminDonations";
import { ArtistTable, type AdminArtist } from "@/components/admin/ArtistTable";
import { DonationReview } from "@/components/admin/DonationReview";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { formatHTG } from "@/lib/donations";
import type { AccountStatus } from "./actions";

export const metadata: Metadata = { title: "Admin | UpMizik" };

type UserRow = {
  id: string;
  display_name: string;
  role: "artist" | "listener";
  status: AccountStatus;
  is_admin: boolean;
  email: string;
  created_at: string;
  song_count: number;
};

function StatCard({ icon, label, value, highlight }: { icon: string; label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${highlight && value > 0 ? "border-amber-500/40 bg-amber-500/10" : "border-zinc-800 bg-zinc-900/60"}`}>
      <p className="text-sm text-zinc-400">
        {icon} {label}
      </p>
      <p className="mt-2 text-3xl font-extrabold text-white">{value}</p>
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const [{ data: userData }, pendingDonations, pendingDonationCount, { count: pendingPayoutCount }, { data: revenueRows }] = await Promise.all([
    supabase.rpc("admin_list_users"),
    loadAdminDonations(supabase, "pending", 20),
    countDonations(supabase, "pending"),
    supabase.from("payouts").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("donations").select("platform_share_htg").eq("status", "verified"),
  ]);
  const platformRevenue = (revenueRows ?? []).reduce((sum, r) => sum + Number(r.platform_share_htg), 0);

  const users = (userData ?? []) as UserRow[];
  const artists: AdminArtist[] = users
    .filter((u) => u.role === "artist")
    .map((u) => ({
      id: u.id,
      displayName: u.display_name,
      email: u.email,
      status: u.status,
      isAdmin: u.is_admin,
      createdAt: u.created_at,
      songCount: Number(u.song_count),
    }));
  const listeners = users.filter((u) => u.role === "listener").length;
  const pendingArtists = artists.filter((a) => a.status === "pending").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminTabs />

      <p className="text-sm font-medium uppercase tracking-widest text-amber-300">🛡️ Admin</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white">Panèl administrasyon</h1>
      <p className="mt-1 text-zinc-400">Valide atis yo ak don yo.</p>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon="⏳" label="Atis ap tann" value={pendingArtists} highlight />
        <StatCard icon="💝" label="Don ap tann" value={pendingDonationCount} highlight />
        <StatCard icon="💸" label="Retrè an atant" value={pendingPayoutCount ?? 0} highlight />
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <p className="text-sm text-zinc-400">💰 Revni platfòm (15%)</p>
          <p className="mt-2 text-2xl font-extrabold text-white">{formatHTG(platformRevenue)}</p>
          <p className="mt-1 text-xs text-zinc-500">{artists.length} atis · {listeners} koutè</p>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        <Panel title="🎤 Atis yo">
          <ArtistTable artists={artists} currentUserId={user.id} />
        </Panel>

        <Panel
          title={`💝 Don ap tann (${pendingDonationCount})`}
          action={
            <Link href="/admin/don" className="text-sm font-medium text-fuchsia-400 hover:text-fuchsia-300">
              Wè tout istwa don yo →
            </Link>
          }
        >
          <DonationReview donations={pendingDonations} />
        </Panel>
      </div>
    </div>
  );
}
