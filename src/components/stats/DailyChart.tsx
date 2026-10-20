"use client";

import { useState } from "react";

export type DayPoint = { day: string; realPlays: number; starts: number };

// Maksimòm aks Y la: pi piti chif "won" (1, 2, 5 × 10ⁿ) ki ≥ n
function niceMax(n: number) {
  if (n <= 5) return 5;
  const pow = 10 ** Math.floor(Math.log10(n));
  return [1, 2, 5, 10].find((s) => s * pow >= n)! * pow;
}

function fmtDay(iso: string, opts: Intl.DateTimeFormatOptions) {
  // "YYYY-MM-DD" → dat lokal san dekalaj fizo
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-HT", opts);
}

// Graf kolòn: ekout reyèl chak jou (yon sèl seri, kidonk pa gen lejand: tit la nonmen l)
export function DailyChart({ data }: { data: DayPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...data.map((d) => d.realPlays), 0));
  const total = data.reduce((s, d) => s + d.realPlays, 0);
  const labelIdx = new Set([0, Math.floor((data.length - 1) / 2), data.length - 1]);
  const h = hover !== null ? data[hover] : null;

  if (total === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 text-center">
        <p className="text-3xl">📊</p>
        <p className="mt-2 text-sm text-zinc-400">Poko gen ekout nan peryòd sa a.</p>
        <p className="text-xs text-zinc-500">Graf la ap ranpli piti piti chak jou.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="relative flex h-56 gap-2">
        {/* Aks Y: 0 ak maksimòm (chif won) */}
        <div className="flex w-8 flex-col justify-between pb-0.5 text-right text-[11px] tabular-nums text-zinc-500">
          <span>{max.toLocaleString("fr-HT")}</span>
          <span>{Math.round(max / 2).toLocaleString("fr-HT")}</span>
          <span>0</span>
        </div>

        <div className="relative flex-1" onMouseLeave={() => setHover(null)}>
          {/* Liy gid yo (fen, dous) */}
          <div className="absolute inset-x-0 top-0 border-t border-zinc-800" />
          <div className="absolute inset-x-0 top-1/2 border-t border-zinc-800/70" />
          <div className="absolute inset-x-0 bottom-0 border-t border-zinc-700" />

          <div className="absolute inset-0 flex items-end gap-[2px]">
            {data.map((d, i) => (
              <div
                key={d.day}
                className="flex h-full flex-1 cursor-default items-end justify-center"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                tabIndex={0}
                aria-label={`${fmtDay(d.day, { day: "numeric", month: "long" })}: ${d.realPlays} ekout reyèl`}
              >
                <div
                  className={`w-full max-w-6 rounded-t transition-colors ${hover === i ? "bg-fuchsia-300" : "bg-fuchsia-500"}`}
                  style={{ height: `${(d.realPlays / max) * 100}%`, minHeight: d.realPlays > 0 ? 3 : 0 }}
                />
              </div>
            ))}
          </div>

          {/* Bwat detay */}
          {h && hover !== null && (
            <div
              className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs shadow-xl"
              style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}
            >
              <p className="font-semibold text-white">{fmtDay(h.day, { weekday: "long", day: "numeric", month: "long" })}</p>
              <p className="mt-1 text-zinc-300">
                <span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-fuchsia-500" />
                {h.realPlays.toLocaleString("fr-HT")} ekout reyèl
              </p>
              <p className="text-zinc-400">{h.starts.toLocaleString("fr-HT")} kòmansman</p>
            </div>
          )}
        </div>
      </div>

      {/* Aks X: premye jou, mitan, dènye jou */}
      <div className="ml-10 mt-2 flex text-[11px] text-zinc-500">
        {data.map((d, i) => (
          <span key={d.day} className="flex-1 whitespace-nowrap text-center">
            {labelIdx.has(i) ? fmtDay(d.day, { day: "numeric", month: "short" }) : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
