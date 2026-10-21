"use client";

import { useState } from "react";
import type { Trophy } from "@/lib/trophies";

// Vitrin trofe yo sou paj atis la: sa ki genyen yo an koulè, rès yo fade ak yon ba pwogrè
export function TrophyCase({ trophies, isOwner }: { trophies: Trophy[]; isOwner: boolean }) {
  const earned = trophies.filter((t) => t.earned);
  const locked = trophies.filter((t) => !t.earned);
  // Vizitè yo wè sèlman trofe ki genyen yo; atis la ka wè sa k ap tann li yo tou
  const [showLocked, setShowLocked] = useState(false);

  if (earned.length === 0 && !isOwner) return null;

  return (
    <section className="mb-10 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold text-white">
          <span>🏆</span> Trofe
          <span className="text-sm font-medium text-zinc-400">
            {earned.length}/{trophies.length}
          </span>
        </h2>
        {isOwner && locked.length > 0 && (
          <button type="button" onClick={() => setShowLocked((v) => !v)} className="text-sm font-medium text-amber-300 hover:text-amber-200">
            {showLocked ? "Kache sa m poko genyen yo" : `Wè sa ki rete yo (${locked.length})`}
          </button>
        )}
      </div>

      {earned.length > 0 ? (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {earned.map((t) => (
            <li key={t.id} className="rounded-xl border border-amber-400/30 bg-zinc-900/60 p-3 text-center" title={t.description}>
              <span className="text-3xl" aria-hidden>
                {t.emoji}
              </span>
              <p className="mt-1 text-sm font-semibold text-white">{t.name}</p>
              <p className="text-xs text-zinc-400">{t.description}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-zinc-400">Ou poko genyen okenn trofe. Pibliye premye chante w pou w genyen premye a! 🎙️</p>
      )}

      {isOwner && showLocked && (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {locked.map((t) => (
            <li key={t.id} className="rounded-xl border border-dashed border-zinc-700 p-3 text-center" title={t.description}>
              <span className="text-3xl opacity-40 grayscale" aria-hidden>
                {t.emoji}
              </span>
              <p className="mt-1 text-sm font-semibold text-zinc-300">🔒 {t.name}</p>
              <p className="text-xs text-zinc-500">{t.description}</p>
              {t.goal > 1 && (
                <>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800" role="progressbar" aria-valuenow={t.value} aria-valuemin={0} aria-valuemax={t.goal}>
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${t.progress * 100}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] tabular-nums text-zinc-500">
                    {t.value.toLocaleString("fr-HT")} / {t.goal.toLocaleString("fr-HT")}
                  </p>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
