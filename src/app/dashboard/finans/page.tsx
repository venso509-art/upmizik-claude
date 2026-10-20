import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DONATION_METHODS, formatHTG, formatUSD, type DonationMethod } from "@/lib/donations";
import { ARTIST_SHARE_PERCENT, PAYOUT_BADGE, PLATFORM_FEE_PERCENT, formatDate, toBalance, type BalanceRow, type PayoutStatus } from "@/lib/finance";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { PayoutForm } from "@/components/finance/PayoutForm";
import { StatusBadge } from "@/components/StatusBadge";

export const metadata: Metadata = { title: "Revni & Finans | UpMizik" };

type DonationRow = {
  id: string;
  donor_name: string | null;
  message: string | null;
  song_title: string | null;
  method: DonationMethod;
  amount_usd: number;
  amount_htg: number;
  artist_share_htg: number;
  received_at: string;
};

type PayoutRow = {
  id: string;
  method: DonationMethod;
  phone: string;
  amount_htg: number;
  status: PayoutStatus;
  reference: string | null;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
};

function MoneyCard({ label, value, hint, highlight }: { label: string; value: number; hint?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${highlight ? "border-fuchsia-500/40 bg-gradient-to-br from-fuchsia-900/40 to-violet-950/40" : "border-zinc-800 bg-zinc-900/60"}`}>
      <p className="text-sm text-zinc-400">{label}</p>
      <p className={`mt-2 font-extrabold tracking-tight text-white ${highlight ? "text-4xl" : "text-2xl"}`}>{formatHTG(value)}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function FinancePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");

  const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", user.id).single();
  if (profile?.role !== "artist") redirect("/dashboard");

  const [balanceRes, donationsRes, payoutsRes] = await Promise.all([
    supabase.rpc("artist_balance", { p_artist_id: user.id }),
    supabase.rpc("my_donations"),
    supabase
      .from("payouts")
      .select("id, method, phone, amount_htg, status, reference, admin_note, created_at, processed_at")
      .eq("artist_id", user.id)
      .order("created_at", { ascending: false })
      .returns<PayoutRow[]>(),
  ]);

  const balance = toBalance((balanceRes.data as BalanceRow[] | null)?.[0]);
  const donations = (donationsRes.data ?? []) as DonationRow[];
  const payouts = payoutsRes.data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <DashboardTabs />

      <h1 className="text-3xl font-extrabold tracking-tight text-white">💰 Revni & Finans</h1>
      <p className="mt-1 text-zinc-400">Swiv lajan fanatik ou yo voye ba ou, epi retire l sou MonCash oswa NatCash.</p>

      {/* ===== EKSPLIKASYON 85/15 ===== */}
      <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex h-3 overflow-hidden rounded-full">
          <div className="bg-fuchsia-500" style={{ width: `${ARTIST_SHARE_PERCENT}%` }} />
          <div className="ml-0.5 flex-1 bg-zinc-600" />
        </div>
        <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm">
          <span className="text-zinc-300">
            <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-fuchsia-500" />
            <span className="font-bold text-white">{ARTIST_SHARE_PERCENT}%</span> pou ou
          </span>
          <span className="text-zinc-400">
            <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-zinc-600" />
            <span className="font-bold text-zinc-200">{PLATFORM_FEE_PERCENT}%</span> pou platfòm UpMizik la
          </span>
        </div>
        <p className="mt-3 text-sm text-zinc-500">
          Chak don yon fanatik voye pa MonCash oswa NatCash, ou resevwa {ARTIST_SHARE_PERCENT}% ladan l depi ekip UpMizik la valide l.
          Platfòm nan kenbe {PLATFORM_FEE_PERCENT}% pou l kontinye fonksyone.
        </p>
      </section>

      {/* ===== BALANS ===== */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MoneyCard label="💵 Balans disponib" value={balance.availableHtg} hint="Sa ou ka retire kounye a" highlight />
        <MoneyCard label="📈 Total touche" value={balance.earnedHtg} hint={`${balance.donationCount} don valide`} />
        <MoneyCard label="✅ Deja peye" value={balance.paidHtg} />
        <MoneyCard label="⏳ Retrè an atant" value={balance.pendingHtg} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* ===== FÒM RETRÈ ===== */}
        <Panel title="Mande yon retrè" subtitle="Lajan an ap voye sou nimewo MonCash oswa NatCash ou.">
          <PayoutForm
            availableHtg={balance.availableHtg}
            disabledReason={profile.status !== "approved" ? "Kont ou dwe apwouve pa admin anvan ou ka mande yon retrè." : undefined}
          />
        </Panel>

        {/* ===== ISTWA RETRÈ ===== */}
        <Panel title="Demann retrè ou yo">
          {payouts.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">Ou poko mande okenn retrè.</p>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {payouts.map((p) => (
                <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-white">{formatHTG(Number(p.amount_htg))}</p>
                    <p className="text-xs text-zinc-500">
                      {DONATION_METHODS[p.method].label} · {p.phone} · {formatDate(p.created_at)}
                    </p>
                    {p.status === "paid" && p.reference && (
                      <p className="mt-1 text-xs text-emerald-300">Referans: {p.reference}</p>
                    )}
                    {p.status === "rejected" && p.admin_note && <p className="mt-1 text-xs text-red-300">Rezon: {p.admin_note}</p>}
                  </div>
                  <StatusBadge {...PAYOUT_BADGE[p.status]} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ===== ISTWA DON ===== */}
      <div className="mt-6">
        <Panel title="Istwa don ou resevwa" subtitle="Sèlman don ekip UpMizik la deja valide.">
          {donations.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-4xl">💝</p>
              <p className="mt-3 text-sm text-zinc-400">Ou poko resevwa don. Pataje mizik ou pou fanatik ou yo ka sipòte w!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-zinc-500">
                  <tr className="border-b border-zinc-800">
                    <th className="py-2 pr-3 font-medium">Dat</th>
                    <th className="py-2 pr-3 font-medium">Donatè</th>
                    <th className="py-2 pr-3 font-medium">Chante</th>
                    <th className="py-2 pr-3 text-right font-medium">Montan</th>
                    <th className="py-2 text-right font-medium">Pa w ({ARTIST_SHARE_PERCENT}%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {donations.map((d) => (
                    <tr key={d.id} className="align-top">
                      <td className="py-3 pr-3 text-zinc-400">{formatDate(d.received_at)}</td>
                      <td className="py-3 pr-3">
                        <p className="text-white">{d.donor_name ?? "Anonim"}</p>
                        {d.message && <p className="mt-0.5 max-w-xs text-xs italic text-zinc-500">« {d.message} »</p>}
                      </td>
                      <td className="py-3 pr-3 text-zinc-300">{d.song_title ?? "—"}</td>
                      <td className="py-3 pr-3 text-right tabular-nums text-zinc-300">
                        {formatUSD(Number(d.amount_usd))}
                        <span className="block text-xs text-zinc-500">{formatHTG(Number(d.amount_htg))}</span>
                      </td>
                      <td className="py-3 text-right font-semibold tabular-nums text-emerald-300">{formatHTG(Number(d.artist_share_htg))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
