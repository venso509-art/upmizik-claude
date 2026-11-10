"use client";

import { useState } from "react";

export const MAX_FEAT_NAMES = 6;

// Netwaye lis la: san espas anplis, san doublon, 60 karaktè maks
export function cleanFeatNames(list: string[]) {
  const seen = new Set<string>();
  return list
    .map((n) => n.replace(/\s+/g, " ").trim().slice(0, 60))
    .filter((n) => n && !seen.has(n.toLowerCase()) && seen.add(n.toLowerCase()))
    .slice(0, MAX_FEAT_NAMES);
}

// 🎤 Non atis feat yo (menm si yo pa sou UpMizik): yo parèt anba tit chante a « feat. X & Y »
export function FeatNamesInput({ value, onChange, disabled }: { value: string[]; onChange: (v: string[]) => void; disabled?: boolean }) {
  const [draft, setDraft] = useState("");

  function add() {
    const next = cleanFeatNames([...value, draft]);
    onChange(next);
    setDraft("");
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <p className="font-semibold text-white">🎤 Feat</p>
      <p className="mt-0.5 text-xs text-zinc-500">
        Tape non atis ki chante avè w yo, menm si yo pa sou UpMizik. Yo ap parèt anba tit chante a. (Pou ba yo yon pousantaj, itilize seksyon featuring oswa royalties anba a.)
      </p>
      {value.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {value.map((n) => (
            <span key={n} className="flex items-center gap-1.5 rounded-full bg-fuchsia-500/15 py-1 pl-3 pr-1 text-sm text-fuchsia-100 ring-1 ring-fuchsia-500/40">
              {n}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(value.filter((x) => x !== n))}
                className="flex h-5 w-5 items-center justify-center rounded-full text-xs text-fuchsia-200 hover:bg-fuchsia-500/30"
                aria-label={`Retire ${n}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      {value.length < MAX_FEAT_NAMES && (
        <div className="mt-3 flex gap-2">
          <input
            value={draft}
            disabled={disabled}
            maxLength={60}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => draft.trim() && add()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                if (draft.trim()) add();
              }
            }}
            placeholder="Egz: Rutshelle"
            aria-label="Non atis feat la"
            className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-base text-white outline-none placeholder:text-zinc-600 focus:border-fuchsia-500"
          />
          <button
            type="button"
            disabled={disabled || !draft.trim()}
            onClick={add}
            className="shrink-0 rounded-lg border border-fuchsia-500/50 px-3 text-sm font-semibold text-fuchsia-200 hover:bg-fuchsia-500/10 disabled:opacity-40"
          >
            + Ajoute
          </button>
        </div>
      )}
    </div>
  );
}
