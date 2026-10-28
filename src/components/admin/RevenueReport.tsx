"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatHTG, formatUSD } from "@/lib/donations";
import { KIND_ORDER, KINDS, PERIODS, summarize, type PeriodKey, type RevenueExtras, type RevenueKind, type RevenueRow } from "@/lib/revenue";

// ===== Rapò revni admin nan: tout lajan ki antre, separe "Pou sit la" / "Pou pataje" =====

const htg = (n: number) => formatHTG(Math.round(n * 100) / 100);
const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);
const DATE = new Intl.DateTimeFormat("fr-HT", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Port-au-Prince" });
const METHOD: Record<string, string> = { moncash: "MonCash", natcash: "NatCash" };

// Chif la monte soti 0 rive nan valè a (~0,9 s)
function CountUp({ value, format = htg }: { value: number; format?: (n: number) => string }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 900);
      const v = a + (value - a) * (1 - Math.pow(1 - t, 3));
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(shown)}</>;
}

// Ba ki grandi soti agoch (animasyon)
function Bar({ value, color, delay = 0, className = "h-2" }: { value: number; color: string; delay?: number; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-full bg-zinc-800 ${className}`}>
      <div
        className="h-full origin-left rounded-full motion-safe:animate-bar-grow"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color, animationDelay: `${delay}s` }}
      />
    </div>
  );
}

function Column({
  title,
  icon,
  amount,
  share,
  color,
  accent,
  parts,
  delay,
}: {
  title: string;
  icon: string;
  amount: number;
  share: number;
  color: string;
  accent: string;
  parts: { label: string; value: number }[];
  delay: number;
}) {
  const max = Math.max(...parts.map((p) => Math.abs(p.value)), 1);
  return (
    <div
      className="relative overflow-hidden rounded-3xl border bg-zinc-900/70 p-5 motion-safe:animate-fade-up sm:p-6"
      style={{ borderColor: `${color}55`, animationDelay: `${delay}s` }}
    >
      <span className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl" style={{ background: `${color}22` }} aria-hidden />
      <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest" style={{ color }}>
        <span aria-hidden>{icon}</span> {title}
      </p>
      <p className={`mt-2 text-3xl font-black tracking-tight sm:text-4xl ${accent}`}>
        <CountUp value={amount} />
      </p>
      <p className="mt-1 text-sm text-zinc-400">{share} % nan lajan ki separe yo</p>
      <ul className="mt-5 space-y-3">
        {parts.map((p, i) => (
          <li key={p.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-zinc-300">{p.label}</span>
              <span className="shrink-0 font-semibold tabular-nums text-white">{htg(p.value)}</span>
            </div>
            <Bar value={(Math.abs(p.value) / max) * 100} color={color} delay={delay + 0.15 + i * 0.08} className="mt-1.5 h-1.5" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function toCsv(rows: RevenueRow[]) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Dat", "Sous", "Kiyès ki peye", "Pou kiyès", "Detay", "Metòd", "Referans", "Total (goud)", "Total ($)", "Pou sit la (goud)", "Pou pataje (goud)", "Pataje ak"];
  const lines = rows.map((r) =>
    [DATE.format(new Date(r.at)), KINDS[r.kind].label, r.payer_name, r.target_name, r.detail, METHOD[r.method] ?? r.method, r.reference, r.total_htg, r.total_usd, r.site_htg ?? "", r.shared_htg ?? "", r.shared_with ?? ""]
      .map(esc)
      .join(","),
  );
  return "﻿" + [head.map(esc).join(","), ...lines].join("\n");
}

export function RevenueReport({
  rows,
  extras,
  period,
  from,
  to,
}: {
  rows: RevenueRow[];
  extras: RevenueExtras;
  period: PeriodKey;
  from: string;
  to: string;
}) {
  const [kind, setKind] = useState<RevenueKind | "tout">("tout");
  const [q, setQ] = useState("");
  const s = useMemo(() => summarize(rows, extras), [rows, extras]);
  const split = s.site + s.shared;

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (kind === "tout" || r.kind === kind) &&
        (!needle || [r.payer_name, r.target_name, r.detail, r.reference, r.shared_with].some((v) => v?.toLowerCase().includes(needle))),
    );
  }, [rows, kind, q]);
  const vt = visible.reduce(
    (a, r) => ({ total: a.total + Number(r.total_htg), site: a.site + Number(r.site_htg ?? 0), shared: a.shared + Number(r.shared_htg ?? 0) }),
    { total: 0, site: 0, shared: 0 },
  );

  function download() {
    const blob = new Blob([toCsv(visible)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `upmizik-revni-${from}-${to}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  return (
    <section aria-labelledby="revni-title">
      {/* ===== Tit + peryòd ===== */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="revni-title" className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            💰 Lajan ki antre
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            {new Date(`${from}T12:00:00Z`).toLocaleDateString("fr-HT", { day: "numeric", month: "long", year: "numeric" })} →{" "}
            {new Date(`${to}T12:00:00Z`).toLocaleDateString("fr-HT", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <nav className="flex flex-wrap gap-1.5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-1.5" aria-label="Peryòd">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={`/admin/rapo?peryod=${p.key}`}
              scroll={false}
              className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                p.key === period ? "bg-citron-400 text-zinc-950 shadow-lg shadow-citron-400/20" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* ===== Gwo total la ===== */}
      <div className="relative mt-6 overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-[#0B132B] via-zinc-900 to-[#0A5C36]/40 p-6 motion-safe:animate-fade-up sm:p-8">
        <span className="pointer-events-none absolute -left-10 -top-20 h-64 w-64 rounded-full bg-citron-400/10 blur-3xl" aria-hidden />
        <p className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Total lajan ki antre</p>
        <p className="mt-2 text-4xl font-black tracking-tight text-white sm:text-6xl">
          <CountUp value={s.total} />
        </p>
        <p className="mt-1 text-sm text-zinc-400">
          {rows.length} peman valide · {formatUSD(rows.reduce((a, r) => a + Number(r.total_usd), 0))}
        </p>

        {/* Ba separasyon an: jòn = sit la, vèt = pou pataje */}
        <div className="mt-6">
          <div className="flex h-4 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full origin-left bg-[#FFD700] motion-safe:animate-bar-grow" style={{ width: `${pct(s.site, split)}%` }} />
            <div className="h-full origin-left bg-[#34D399] motion-safe:animate-bar-grow" style={{ width: `${pct(s.shared, split)}%`, animationDelay: "0.2s" }} />
          </div>
          <div className="mt-2 flex justify-between text-xs font-semibold">
            <span className="text-citron-300">● Sit la {pct(s.site, split)} %</span>
            <span className="text-emerald-300">Pou pataje {pct(s.shared, split)} % ●</span>
          </div>
        </div>
      </div>

      {/* ===== 2 GWO KOLÒN: sit la / pou pataje ===== */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Column title="Pou UpMizik (sit la)" icon="🏦" amount={s.site} share={pct(s.site, split)} color="#FFD700" accent="text-citron-300" parts={s.siteParts} delay={0.1} />
        <Column title="Pou pataje ak moun" icon="🤝" amount={s.shared} share={pct(s.shared, split)} color="#34D399" accent="text-emerald-300" parts={s.sharedParts} delay={0.2} />
      </div>
      {s.credits > 0 && (
        <p className="mt-3 rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          🪙 <span className="font-semibold">{htg(s.credits)}</span> kredi live achte nan peryòd la. Yo separe sèlman lè moun yo voye kado nan live
          (kado live: {htg(Number(extras.live_gifts_htg))} nan peryòd la). Kredi ki poko depanse jodi a: {htg(Number(extras.credits_unspent_htg))}.
        </p>
      )}

      {/* ===== Chak sous lajan ===== */}
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {s.byKind.map((b, i) => {
          const k = KINDS[b.kind];
          const active = kind === b.kind;
          return (
            <button
              key={b.kind}
              type="button"
              onClick={() => setKind(active ? "tout" : b.kind)}
              aria-pressed={active}
              className={`group rounded-2xl border p-4 text-left transition duration-300 motion-safe:animate-fade-up hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30 ${
                active ? "bg-zinc-800/90" : "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900"
              }`}
              style={{ animationDelay: `${0.25 + i * 0.06}s`, borderColor: active ? k.color : undefined }}
            >
              <p className="flex items-center justify-between text-sm text-zinc-400">
                <span>
                  {k.icon} {k.label}
                </span>
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-bold text-zinc-300">{b.count}</span>
              </p>
              <p className="mt-2 truncate text-xl font-extrabold text-white">{htg(b.total)}</p>
              {b.kind === "kredi" ? (
                <p className="mt-2 text-[11px] leading-tight text-zinc-500">{k.note}</p>
              ) : (
                <>
                  <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div className="h-full bg-[#FFD700]" style={{ width: `${pct(b.site, b.total)}%` }} />
                    <div className="h-full bg-[#34D399]" style={{ width: `${pct(b.shared, b.total)}%` }} />
                  </div>
                  <p className="mt-1.5 flex justify-between text-[11px] tabular-nums">
                    <span className="text-citron-300">{htg(b.site)}</span>
                    <span className="text-emerald-300">{htg(b.shared)}</span>
                  </p>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* ===== Sa ki deja peye ===== */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/50 px-5 py-4">
          <span className="text-sm text-zinc-400">💸 Retrè atis ki peye nan peryòd la</span>
          <span className="font-bold tabular-nums text-white">{htg(Number(extras.artist_paid_htg))}</span>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/50 px-5 py-4">
          <span className="text-sm text-zinc-400">🤝 Peman manm yo nan peryòd la</span>
          <span className="font-bold tabular-nums text-white">
            {htg(Number(extras.member_paid_htg))} <span className="text-xs text-zinc-500">({formatUSD(Number(extras.member_paid_usd))})</span>
          </span>
        </div>
      </div>

      {/* ===== LIS TOUT PEMAN YO ===== */}
      <div className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-900/40 motion-safe:animate-fade-up" style={{ animationDelay: "0.35s" }}>
        <div className="flex flex-wrap items-center gap-3 border-b border-zinc-800 p-4 sm:p-5">
          <h3 className="mr-auto text-lg font-bold text-white">
            🧾 Detay chak peman <span className="text-sm font-medium text-zinc-500">({visible.length})</span>
          </h3>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Chache non, referans…"
            className="h-10 w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 text-sm text-white placeholder:text-zinc-500 focus:border-citron-400 focus:outline-none sm:w-60"
          />
          <button
            type="button"
            onClick={download}
            disabled={!visible.length}
            className="h-10 rounded-xl border border-zinc-700 px-4 text-sm font-semibold text-zinc-200 transition hover:border-citron-400 hover:text-white disabled:opacity-40"
          >
            ⬇ Telechaje (Excel)
          </button>
        </div>

        {/* Filtè sous yo */}
        <div className="flex gap-2 overflow-x-auto px-4 pt-4 [scrollbar-width:none] sm:px-5">
          {(["tout", ...KIND_ORDER] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                kind === k ? "bg-white text-zinc-950" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {k === "tout" ? "Tout" : `${KINDS[k].icon} ${KINDS[k].label}`}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="px-5 py-14 text-center text-zinc-400">Pa gen peman nan peryòd sa a.</p>
        ) : (
          <>
            {/* Òdinatè: tablo */}
            <div className="hidden overflow-x-auto p-4 md:block sm:p-5">
              <table className="w-full min-w-[56rem] text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-zinc-500">
                    <th className="pb-3 pr-3 font-semibold">Dat</th>
                    <th className="pb-3 pr-3 font-semibold">Sous</th>
                    <th className="pb-3 pr-3 font-semibold">Kiyès ki peye → pou kiyès</th>
                    <th className="pb-3 pr-3 font-semibold">Metòd</th>
                    <th className="pb-3 pr-3 text-right font-semibold">Total</th>
                    <th className="rounded-t-xl bg-[#FFD700]/10 px-3 pb-3 pt-2 text-right font-bold text-citron-300">Pou sit la</th>
                    <th className="rounded-t-xl bg-[#34D399]/10 px-3 pb-3 pt-2 text-right font-bold text-emerald-300">Pou pataje</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r, i) => {
                    const k = KINDS[r.kind];
                    return (
                      <tr
                        key={`${r.kind}-${r.id}`}
                        className="border-t border-zinc-800/70 align-top transition hover:bg-zinc-800/40 motion-safe:animate-fade-up"
                        style={{ animationDelay: `${Math.min(i, 15) * 0.03}s` }}
                      >
                        <td className="whitespace-nowrap py-3 pr-3 text-zinc-400">{DATE.format(new Date(r.at))}</td>
                        <td className="py-3 pr-3">
                          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: `${k.color}22`, color: k.color }}>
                            {k.icon} {k.label}
                          </span>
                        </td>
                        <td className="py-3 pr-3">
                          <p className="font-semibold text-white">
                            {r.payer_id ? (
                              <Link href={`/admin/kont/${r.payer_id}`} className="hover:text-citron-300">
                                {r.payer_name}
                              </Link>
                            ) : (
                              r.payer_name
                            )}{" "}
                            <span className="text-zinc-500">→</span> {r.target_name}
                          </p>
                          <p className="text-xs text-zinc-500">{r.detail}</p>
                        </td>
                        <td className="whitespace-nowrap py-3 pr-3 text-xs text-zinc-400">
                          {METHOD[r.method] ?? r.method}
                          {r.reference && <span className="block font-mono text-zinc-500">#{r.reference}</span>}
                        </td>
                        <td className="whitespace-nowrap py-3 pr-3 text-right font-bold tabular-nums text-white">
                          {htg(Number(r.total_htg))}
                          <span className="block text-xs font-normal text-zinc-500">{formatUSD(Number(r.total_usd))}</span>
                        </td>
                        <td className="whitespace-nowrap bg-[#FFD700]/[0.04] px-3 py-3 text-right font-bold tabular-nums text-citron-300">
                          {r.site_htg === null ? <span className="text-xs font-normal text-zinc-500">lè l depanse</span> : htg(Number(r.site_htg))}
                        </td>
                        <td className="bg-[#34D399]/[0.04] px-3 py-3 text-right tabular-nums">
                          {r.shared_htg === null ? (
                            <span className="text-xs text-zinc-500">lè l depanse</span>
                          ) : (
                            <>
                              <span className="font-bold text-emerald-300">{htg(Number(r.shared_htg))}</span>
                              {r.shared_with && Number(r.shared_htg) > 0 && <span className="block text-xs text-zinc-400">{r.shared_with}</span>}
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-zinc-700 text-sm font-black">
                    <td colSpan={4} className="py-3 pr-3 text-zinc-300">
                      Total ({visible.length} peman)
                    </td>
                    <td className="py-3 pr-3 text-right tabular-nums text-white">{htg(vt.total)}</td>
                    <td className="rounded-b-xl bg-[#FFD700]/10 px-3 py-3 text-right tabular-nums text-citron-300">{htg(vt.site)}</td>
                    <td className="rounded-b-xl bg-[#34D399]/10 px-3 py-3 text-right tabular-nums text-emerald-300">{htg(vt.shared)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Telefòn: kat */}
            <ul className="space-y-3 p-4 md:hidden">
              {visible.map((r, i) => {
                const k = KINDS[r.kind];
                return (
                  <li
                    key={`${r.kind}-${r.id}`}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 motion-safe:animate-fade-up"
                    style={{ animationDelay: `${Math.min(i, 10) * 0.04}s`, borderLeft: `3px solid ${k.color}` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold" style={{ color: k.color }}>
                          {k.icon} {k.label}
                        </p>
                        <p className="mt-0.5 truncate font-semibold text-white">
                          {r.payer_name} <span className="text-zinc-500">→</span> {r.target_name}
                        </p>
                        <p className="truncate text-xs text-zinc-500">{r.detail}</p>
                      </div>
                      <p className="shrink-0 text-right font-black tabular-nums text-white">
                        {htg(Number(r.total_htg))}
                        <span className="block text-[11px] font-normal text-zinc-500">{formatUSD(Number(r.total_usd))}</span>
                      </p>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-[#FFD700]/10 px-3 py-2">
                        <p className="text-zinc-400">Pou sit la</p>
                        <p className="font-bold tabular-nums text-citron-300">{r.site_htg === null ? "lè l depanse" : htg(Number(r.site_htg))}</p>
                      </div>
                      <div className="rounded-xl bg-[#34D399]/10 px-3 py-2">
                        <p className="text-zinc-400">Pou pataje</p>
                        <p className="font-bold tabular-nums text-emerald-300">{r.shared_htg === null ? "lè l depanse" : htg(Number(r.shared_htg))}</p>
                        {r.shared_with && Number(r.shared_htg) > 0 && <p className="truncate text-zinc-400">{r.shared_with}</p>}
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-zinc-500">
                      {DATE.format(new Date(r.at))} · {METHOD[r.method] ?? r.method}
                      {r.reference && ` · #${r.reference}`}
                    </p>
                  </li>
                );
              })}
              <li className="grid grid-cols-3 gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 p-3 text-center text-xs">
                <p>
                  <span className="block text-zinc-400">Total</span>
                  <span className="font-black tabular-nums text-white">{htg(vt.total)}</span>
                </p>
                <p>
                  <span className="block text-zinc-400">Sit la</span>
                  <span className="font-black tabular-nums text-citron-300">{htg(vt.site)}</span>
                </p>
                <p>
                  <span className="block text-zinc-400">Pataje</span>
                  <span className="font-black tabular-nums text-emerald-300">{htg(vt.shared)}</span>
                </p>
              </li>
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
