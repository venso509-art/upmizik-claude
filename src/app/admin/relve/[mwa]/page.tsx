import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { CloseMonthButton } from "@/components/admin/CloseMonthButton";
import { formatHTG } from "@/lib/donations";
import { MONEY_KEYS, balanceGap, currentMonthIso, monthLabel, monthParam, parseMonthParam, toNumbers } from "@/lib/accounting";

export const metadata: Metadata = { title: "Admin: Relve mwa | UpMizik" };
export const dynamic = "force-dynamic";

type Row = {
  artist_id: string;
  display_name: string;
  is_closed: boolean;
  donations_count: number;
  gross_htg: number;
  platform_htg: number;
  own_htg: number;
  featuring_in_htg: number;
  featuring_out_htg: number;
  collaborators_htg: number;
  fee_htg: number;
  net_htg: number;
  paid_htg: number;
  live_gross_htg: number;
  live_htg: number;
};

export default async function AdminMonthReportPage({ params }: { params: { mwa: string } }) {
  const month = parseMonthParam(params.mwa);
  if (!month) notFound();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const { data, error } = await supabase.rpc("admin_month_detail", { p_month: month });
  const rows = ((data ?? []) as Row[]).map((r) => toNumbers(r, [...MONEY_KEYS]));
  const isClosed = rows[0]?.is_closed ?? false;
  const isCurrent = month === currentMonthIso();
  const sum = (k: (typeof MONEY_KEYS)[number]) => rows.reduce((t, r) => t + Number(r[k]), 0);
  const totals = {
    gross_htg: sum("gross_htg"),
    platform_htg: sum("platform_htg"),
    own_htg: sum("own_htg"),
    featuring_out_htg: sum("featuring_out_htg"),
    collaborators_htg: sum("collaborators_htg"),
    fee_htg: sum("fee_htg"),
    net_htg: sum("net_htg"),
    paid_htg: sum("paid_htg"),
    live_gross_htg: sum("live_gross_htg"),
    live_htg: sum("live_htg"),
  };
  // Pa UpMizik sou kado live yo
  const livePlatform = Math.max(0, totals.live_gross_htg - totals.live_htg);
  const gap = balanceGap(totals);
  const label = monthLabel(month);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminTabs />
      <Link href="/admin/relve" className="text-sm text-zinc-400 hover:text-white">
        ← Tout mwa yo
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold capitalize tracking-tight text-white">🗂️ {label}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {isClosed ? "🔒 Mwa sa a fèmen: chif yo jele nan achiv la." : isCurrent ? "🟢 Mwa kounye a: chif yo ap chanje toujou." : "🟡 Mwa a fini men li poko fèmen."}
          </p>
        </div>
        {!isClosed && !isCurrent && rows.length > 0 && <CloseMonthButton month={month} label={label} />}
      </div>

      {/* Total mwa a */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <p className="text-sm text-zinc-400">💝 Total don</p>
          <p className="mt-2 text-2xl font-extrabold text-white">{formatHTG(totals.gross_htg)}</p>
        </div>
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
          <p className="text-sm text-zinc-400">🔴 Kado live</p>
          <p className="mt-2 text-2xl font-extrabold text-white">{formatHTG(totals.live_gross_htg)}</p>
          <p className="mt-1 text-[11px] text-zinc-500">
            Atis yo: {formatHTG(totals.live_htg)} · UpMizik: {formatHTG(livePlatform)}
          </p>
        </div>
        <div className="rounded-2xl border border-citron-400/30 bg-citron-400/5 p-5">
          <p className="text-sm text-zinc-400">🏢 UpMizik</p>
          <p className="mt-2 text-2xl font-extrabold text-citron-300">{formatHTG(totals.platform_htg + totals.fee_htg + livePlatform)}</p>
          <p className="mt-1 text-[11px] text-zinc-500">
            15%: {formatHTG(totals.platform_htg)} · Live: {formatHTG(livePlatform)} · Frè: {formatHTG(totals.fee_htg)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <p className="text-sm text-zinc-400">🎤 Pou atis yo</p>
          <p className="mt-2 text-2xl font-extrabold text-white">{formatHTG(totals.net_htg)}</p>
          {totals.collaborators_htg > 0 && <p className="mt-1 text-[11px] text-zinc-500">+ Kolaboratè: {formatHTG(totals.collaborators_htg)}</p>}
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <p className="text-sm text-zinc-400">💸 Peye pandan mwa a</p>
          <p className="mt-2 text-2xl font-extrabold text-white">{formatHTG(totals.paid_htg)}</p>
        </div>
      </div>

      <div
        className={`mt-4 rounded-xl px-4 py-3 text-sm ${
          gap === 0 ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border border-red-500/40 bg-red-500/10 text-red-200"
        }`}
      >
        {gap === 0
          ? "✅ Mwa a balanse: chak goud don yo ale kote li dwe ale (UpMizik, atis yo, featuring, kolaboratè)."
          : `⚠️ Mwa a pa balanse: ${formatHTG(gap)} pa jwenn plas yo. Verifye anvan ou peye.`}
      </div>

      {error ? (
        <p className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">Relve a pa chaje: {error.message}</p>
      ) : rows.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-zinc-800 p-10 text-center text-zinc-400">Pa gen aktivite pou mwa sa a.</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-zinc-900/80 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3">Atis</th>
                <th className="px-3 py-3 text-right">Don</th>
                <th className="px-3 py-3 text-right">Total</th>
                <th className="px-3 py-3 text-right">UpMizik 15%</th>
                <th className="px-3 py-3 text-right">Featuring/Kolab.</th>
                <th className="px-3 py-3 text-right">Pa li</th>
                <th className="px-3 py-3 text-right">🔴 Live</th>
                <th className="px-3 py-3 text-right">Frè</th>
                <th className="px-3 py-3 text-right">Pou li</th>
                <th className="px-3 py-3 text-right">Peye</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {rows.map((r) => (
                <tr key={r.artist_id} className="bg-zinc-900/30 hover:bg-zinc-900/70">
                  <td className="px-4 py-3">
                    <Link href={`/admin/kont/${r.artist_id}?mwa=${monthParam(month)}`} className="font-semibold text-white hover:underline">
                      {r.display_name}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-zinc-300">{r.donations_count}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-zinc-300">{formatHTG(r.gross_htg)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-zinc-300">{formatHTG(r.platform_htg)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-zinc-400">{formatHTG(r.featuring_out_htg + r.collaborators_htg)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-zinc-300">
                    {formatHTG(r.own_htg + r.featuring_in_htg)}
                    {r.featuring_in_htg > 0 && <span className="block text-[10px] text-zinc-500">dont featuring {formatHTG(r.featuring_in_htg)}</span>}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-zinc-300">
                    {r.live_htg > 0 ? formatHTG(r.live_htg) : "—"}
                    {r.live_gross_htg > 0 && <span className="block text-[10px] text-zinc-500">sou {formatHTG(r.live_gross_htg)} kado</span>}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-zinc-400">−{formatHTG(r.fee_htg)}</td>
                  <td className="px-3 py-3 text-right font-bold tabular-nums text-citron-300">{formatHTG(r.net_htg)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-zinc-300">{formatHTG(r.paid_htg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-zinc-500">
        &quot;Pou li&quot; = sa atis la touche pou mwa sa a (don + kado live) apre 15% ak frè $0.99 la. Mwa ki te fèmen anvan kado live yo te
        antre nan relve yo pa gen kolòn live la. Lajan an vin disponib pou retrè apre mwa a fini; ou peye l nan 💸 Retrè
        lè atis la mande l.
      </p>
    </div>
  );
}
