import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DONATION_METHODS, formatHTG, formatUSD, type DonationMethod } from "@/lib/donations";
import {
  ARTIST_SHARE_PERCENT,
  PAYOUT_BADGE,
  PAYOUT_WAIT_MONTHS,
  PLATFORM_FEE_PERCENT,
  formatDate,
  toBalance,
  type BalanceRow,
  type PayoutStatus,
} from "@/lib/finance";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { PayoutForm } from "@/components/finance/PayoutForm";
import { PinForm } from "@/components/finance/PinForm";
import { StatusBadge } from "@/components/StatusBadge";
import { getSettings } from "@/lib/settings-server";
import { monthlyFeeHtg } from "@/lib/settings";

export const metadata: Metadata = { title: "Revni & Finans | UpMizik" };

type DonationRow = {
  id: string;
  donor_name: string | null;
  message: string | null;
  song_title: string | null;
  method: DonationMethod;
  amount_usd: number;
  amount_htg: number;
  my_share_htg: number;
  collab_share_htg: number;
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
};

type PrivateInfo = { phone: string | null; has_pin: boolean; pin_locked_until: string | null };

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
  // Espas atis la (finans enkli) louvri sèlman apre admin nan valide kont lan
  if (profile?.role !== "artist" || profile.status !== "approved") redirect("/dashboard");

  const [balanceRes, donationsRes, payoutsRes, privateRes, settings] = await Promise.all([
    supabase.rpc("artist_balance", { p_artist_id: user.id }),
    supabase.rpc("my_donations"),
    supabase
      .from("payouts")
      .select("id, method, phone, amount_htg, status, reference, admin_note, created_at")
      .eq("artist_id", user.id)
      .order("created_at", { ascending: false })
      .returns<PayoutRow[]>(),
    supabase.rpc("my_private_info"),
    getSettings(),
  ]);

  const balance = toBalance((balanceRes.data as BalanceRow[] | null)?.[0]);
  const donations = (donationsRes.data ?? []) as DonationRow[];
  const payouts = payoutsRes.data ?? [];
  const priv = ((privateRes.data as PrivateInfo[] | null) ?? [])[0];
  const hasPin = Boolean(priv?.has_pin);

  // Poukisa atis la poko ka mande retrè (si se ka a)
  const eligible = balance.eligibleFrom ? new Date(balance.eligibleFrom) <= new Date() : false;
  let disabledReason: string | undefined;
  if (!eligible)
    disabledReason = balance.eligibleFrom
      ? `Ou ka kòmanse mande retrè apati ${formatDate(balance.eligibleFrom)} (${PAYOUT_WAIT_MONTHS} mwa apre kont ou apwouve). Lajan ou ap kontinye ogmante jiska lè sa a.`
      : `Ou ka mande retrè ${PAYOUT_WAIT_MONTHS} mwa apre kont ou apwouve.`;
  else if (!hasPin) disabledReason = "Kreye PIN retrè ou anba a anvan ou mande yon retrè.";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <DashboardTabs />

      <h1 className="text-3xl font-extrabold tracking-tight text-white">💰 Revni & Finans</h1>
      <p className="mt-1 text-zinc-400">Swiv lajan fanatik ou yo voye ba ou, epi retire l sou MonCash oswa NatCash.</p>

      {/* ===== RÈG YO ===== */}
      <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex h-3 overflow-hidden rounded-full">
          <div className="bg-fuchsia-500" style={{ width: `${ARTIST_SHARE_PERCENT}%` }} />
          <div className="ml-0.5 flex-1 bg-zinc-600" />
        </div>
        <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm">
          <span className="text-zinc-300">
            <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-fuchsia-500" />
            <span className="font-bold text-white">{ARTIST_SHARE_PERCENT}%</span> pou ou ak kolaboratè ou yo
          </span>
          <span className="text-zinc-400">
            <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-zinc-600" />
            <span className="font-bold text-zinc-200">{PLATFORM_FEE_PERCENT}%</span> pou UpMizik
          </span>
        </div>
        <ul className="mt-4 grid gap-2 text-sm text-zinc-400 sm:grid-cols-2">
          <li>💝 Chak don valide: {ARTIST_SHARE_PERCENT}% pataje ant ou menm ak moun ou bay royalties sou chante a.</li>
          <li>
            📅 Chak mwa ou touche: {formatUSD(settings.monthlyFeeUsd)} ({formatHTG(monthlyFeeHtg(settings))}) frè platfòm. Mwa ou pa touche, ou pa peye anyen.
          </li>
          <li>🗓️ Lajan yon mwa vin disponib depi mwa a fini.</li>
          <li>⏳ Premye retrè posib {PAYOUT_WAIT_MONTHS} mwa apre kont ou apwouve. Apre sa, nenpòt ki lè.</li>
        </ul>
      </section>

      {/* ===== BALANS ===== */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MoneyCard label="💵 Balans disponib" value={balance.availableHtg} hint="Sa ou ka retire kounye a" highlight />
        <MoneyCard label="🗓️ Mwa sa a" value={balance.currentMonthHtg} hint="Ap disponib depi mwa a fini" />
        <MoneyCard label="📈 Total touche" value={balance.earnedHtg} hint={`${balance.donationCount} don valide (pa w apre splits)`} />
        <MoneyCard label="📅 Frè mansyèl yo" value={balance.feesHtg} hint={`${formatUSD(settings.monthlyFeeUsd)} pou chak mwa ou te touche`} />
        <MoneyCard label="✅ Deja peye" value={balance.paidHtg} />
        <MoneyCard label="⏳ Retrè an atant" value={balance.pendingHtg} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-6">
          {/* ===== PIN ===== */}
          <Panel title="🔐 PIN retrè" subtitle="Ou bezwen l pou konfime chak retrè.">
            {priv?.pin_locked_until && new Date(priv.pin_locked_until) > new Date() && (
              <p className="mb-4 rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
                Twòp move PIN. Retrè yo bloke jiska {new Date(priv.pin_locked_until).toLocaleTimeString("fr-HT", { hour: "2-digit", minute: "2-digit", timeZone: "America/Port-au-Prince" })}.
              </p>
            )}
            <PinForm hasPin={hasPin} />
          </Panel>

          {/* ===== FÒM RETRÈ ===== */}
          <Panel title="Mande yon retrè" subtitle="Lajan an ap voye sou nimewo MonCash oswa NatCash ou.">
            <PayoutForm availableHtg={balance.availableHtg} disabledReason={disabledReason} defaultPhone={priv?.phone} />
          </Panel>
        </div>

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
                    {p.status === "paid" && p.reference && <p className="mt-1 text-xs text-emerald-300">Referans: {p.reference}</p>}
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
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-zinc-500">
                  <tr className="border-b border-zinc-800">
                    <th className="py-2 pr-3 font-medium">Dat</th>
                    <th className="py-2 pr-3 font-medium">Donatè</th>
                    <th className="py-2 pr-3 font-medium">Chante</th>
                    <th className="py-2 pr-3 text-right font-medium">Montan</th>
                    <th className="py-2 pr-3 text-right font-medium">Kolaboratè</th>
                    <th className="py-2 text-right font-medium">Pa w</th>
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
                      <td className="py-3 pr-3 text-right tabular-nums text-zinc-400">
                        {Number(d.collab_share_htg) > 0 ? formatHTG(Number(d.collab_share_htg)) : "—"}
                      </td>
                      <td className="py-3 text-right font-semibold tabular-nums text-emerald-300">{formatHTG(Number(d.my_share_htg))}</td>
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
