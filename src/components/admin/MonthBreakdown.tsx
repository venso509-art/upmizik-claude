import { formatHTG } from "@/lib/donations";
import { balanceGap, type MonthRow } from "@/lib/accounting";

function Line({ label, value, sign, strong, muted, hint }: { label: string; value: number; sign?: "−" | "+" | "="; strong?: boolean; muted?: boolean; hint?: string }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-2 ${strong ? "border-t border-zinc-700 pt-3" : ""}`}>
      <div>
        <p className={`${strong ? "font-bold text-white" : muted ? "text-zinc-500" : "text-zinc-300"}`}>
          {sign && <span className="mr-2 inline-block w-3 text-zinc-500">{sign}</span>}
          {label}
        </p>
        {hint && <p className="ml-5 text-[11px] text-zinc-500">{hint}</p>}
      </div>
      <p className={`shrink-0 tabular-nums ${strong ? "text-xl font-extrabold text-citron-300" : muted ? "text-zinc-500" : "font-semibold text-white"}`}>
        {formatHTG(value)}
      </p>
    </div>
  );
}

// Kalkil yon mwa pou yon atis, etap pa etap, ak yon verifikasyon ki asire chak goud jwenn plas li
export function MonthBreakdown({ row }: { row: MonthRow }) {
  const gap = balanceGap(row);
  const total = row.own_htg + row.featuring_in_htg;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Don sou chante atis la</p>
      <Line label={`Total don valide (${row.donations_count})`} value={row.gross_htg} />
      <Line sign="−" label="15% UpMizik (platfòm nan)" value={row.platform_htg} />
      {row.featuring_out_htg > 0 && <Line sign="−" label="Pa atis featuring yo" value={row.featuring_out_htg} hint="Yo resevwa l dirèkteman nan pwòp balans pa yo" />}
      {row.collaborators_htg > 0 && <Line sign="−" label="Pa kolaboratè deyò yo" value={row.collaborators_htg} hint="UpMizik peye yo dirèkteman" />}
      <Line sign="=" label="Pa atis la sou pwòp chante li" value={row.own_htg} />

      <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">Kont atis la pou mwa a</p>
      <Line label="Pa li sou pwòp chante li" value={row.own_htg} />
      {row.featuring_in_htg > 0 && <Line sign="+" label="Sa l touche kòm featuring" value={row.featuring_in_htg} hint="Sou chante lòt atis" />}
      <Line sign="−" label="Frè lojistik ($0.99)" value={row.fee_htg} muted={!row.closed} hint={row.closed ? undefined : "Ap retire lè mwa a fini"} />
      <Line sign="=" label={row.closed ? "Pou atis la pou mwa sa a" : "Pou atis la (mwa a poko fini)"} value={row.closed ? row.net_htg : total} strong />
      {row.paid_htg > 0 && <p className="mt-2 text-right text-xs text-zinc-400">💸 Retrè ki peye pandan mwa a: {formatHTG(row.paid_htg)}</p>}

      {/* Verifikasyon otomatik */}
      <div
        className={`mt-4 rounded-xl px-3 py-2 text-xs ${
          gap === 0 ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border border-red-500/40 bg-red-500/10 text-red-200"
        }`}
      >
        {gap === 0
          ? "✅ Kalkil la balanse: 15% UpMizik + atis la + featuring + kolaboratè = total don yo, jiska santim nan."
          : `⚠️ Kalkil la pa balanse: gen ${formatHTG(gap)} ki pa jwenn plas yo. PA peye anyen anvan ou verifye.`}
      </div>
    </div>
  );
}
