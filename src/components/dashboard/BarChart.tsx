export type BarDatum = { label: string; value: number; detail?: string };

// Grafik ak ba orizontal: yon sèl koulè, valè a nan bout ba a, detay lè w pase sourit la
export function BarChart({ data, unit }: { data: BarDatum[]; unit: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.label} className="group relative grid grid-cols-[minmax(0,8rem)_1fr] items-center gap-3 sm:grid-cols-[minmax(0,11rem)_1fr]">
          <span className="truncate text-sm text-zinc-300" title={d.label}>
            {d.label}
          </span>
          <div className="flex items-center gap-2">
            {/* Ba a: 20px epè, won nan bout la, kare kote l kòmanse */}
            <div
              className="h-5 min-w-[4px] rounded-r bg-fuchsia-500 transition group-hover:bg-fuchsia-400"
              style={{ width: `${(d.value / max) * 85}%` }}
            />
            <span className="text-sm tabular-nums text-zinc-400">{d.value.toLocaleString("fr-HT")}</span>
          </div>

          {/* Ti bwat detay */}
          <div className="pointer-events-none absolute -top-10 left-1/3 z-10 whitespace-nowrap rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-100 opacity-0 shadow-xl transition group-hover:opacity-100">
            <span className="font-semibold">{d.label}</span> · {d.value.toLocaleString("fr-HT")} {unit}
            {d.detail ? <span className="text-zinc-400"> · {d.detail}</span> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
