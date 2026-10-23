"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { VerifiedCorner } from "@/components/VerifiedCorner";

export type Featuring = { artistId: string; name: string; avatarUrl: string | null; verified: boolean; percentage: number };
type Found = { id: string; display_name: string; avatar_url: string | null; is_verified: boolean };

export const MAX_FEATURING = 10;

export function featuringTotal(list: Featuring[]) {
  return Math.round(list.reduce((s, f) => s + (Number(f.percentage) || 0), 0) * 100) / 100;
}

function Avatar({ name, url, verified }: { name: string; url: string | null; verified?: boolean }) {
  return (
    <span className="relative shrink-0">
      <span className="block h-9 w-9 overflow-hidden rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-700">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-sm font-bold text-white">{name.charAt(0).toUpperCase()}</span>
        )}
      </span>
      <VerifiedCorner show={verified} />
    </span>
  );
}

// Seksyon "Featuring": owner a chwazi lòt atis UpMizik epi li ba yo yon pousantaj.
// otherTotal = pousantaj kolaboratè deyò yo (pataj royalties), pou total la pa janm depase 100%.
export function FeaturingEditor({
  value,
  onChange,
  otherTotal,
  disabled,
}: {
  value: Featuring[];
  onChange: (v: Featuring[]) => void;
  otherTotal: number;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Found[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const featTotal = featuringTotal(value);
  const remaining = Math.round((100 - featTotal - otherTotal) * 100) / 100; // pou owner a
  const over = remaining < 0;

  // Chache atis yo pandan owner a ap tape
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const { data } = await createClient().rpc("find_artists_for_featuring", { p_q: q });
      setResults(((data ?? []) as Found[]).filter((a) => !value.some((f) => f.artistId === a.id)));
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query, value]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => !boxRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function add(a: Found) {
    if (value.length >= MAX_FEATURING) return;
    onChange([...value, { artistId: a.id, name: a.display_name, avatarUrl: a.avatar_url, verified: a.is_verified, percentage: 0 }]);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  // Pousantaj la pa ka depase sa ki rete a (owner a pa ka bay plis pase sa l genyen)
  function setPercentage(i: number, raw: string) {
    const others = featTotal - (Number(value[i].percentage) || 0);
    const max = Math.max(0, 100 - otherTotal - others);
    const n = Math.min(max, Math.max(0, Number(raw.replace(",", ".")) || 0));
    onChange(value.map((f, j) => (j === i ? { ...f, percentage: Math.round(n * 100) / 100 } : f)));
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-white">🎤 Featuring</p>
          <p className="text-xs text-zinc-500">Lòt atis UpMizik ki chante avè w. Pousantaj la opsyonèl: si w pa mete youn, ou kenbe tout.</p>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
          {value.length}/{MAX_FEATURING}
        </span>
      </div>

      {/* Rechèch atis */}
      {value.length < MAX_FEATURING && (
        <div ref={boxRef} className="relative mt-4">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            disabled={disabled}
            placeholder="🔍 Tape non yon atis (egz: Venso)…"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-fuchsia-500"
          />
          {open && query.trim() && (
            <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-1 shadow-2xl">
              {searching && results.length === 0 ? (
                <li className="px-3 py-2 text-sm text-zinc-500">Ap chache…</li>
              ) : results.length === 0 ? (
                <li className="px-3 py-2 text-sm text-zinc-500">Pa gen atis UpMizik ki rele konsa.</li>
              ) : (
                results.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => add(a)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white transition hover:bg-white/5"
                    >
                      <Avatar name={a.display_name} url={a.avatar_url} verified={a.is_verified} />
                      <span className="flex-1 truncate">
                        {a.display_name}
                        {a.is_verified && <VerifiedBadge />}
                      </span>
                      <span className="text-xs font-semibold text-citron-300">+ Ajoute</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}

      {/* Atis ki chwazi yo */}
      {value.length > 0 && (
        <ul className="mt-3 space-y-2">
          {value.map((f, i) => (
            <li key={f.artistId} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
              <Avatar name={f.name} url={f.avatarUrl} verified={f.verified} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
                feat. {f.name}
                {f.verified && <VerifiedBadge />}
              </span>
              <label className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2 focus-within:border-fuchsia-500">
                <input
                  inputMode="decimal"
                  value={f.percentage || ""}
                  onChange={(e) => setPercentage(i, e.target.value)}
                  disabled={disabled}
                  placeholder="0"
                  aria-label={`Pousantaj ${f.name}`}
                  className="w-12 bg-transparent py-1.5 text-right text-sm font-semibold text-white outline-none"
                />
                <span className="text-sm text-zinc-400">%</span>
              </label>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                disabled={disabled}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 hover:text-red-200"
                aria-label={`Retire ${f.name}`}
                title={`Retire ${f.name}`}
              >
                ✕ <span className="hidden sm:inline">Retire</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Kontè otomatik la */}
      <div className="mt-4">
        <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-zinc-800" aria-hidden>
          <div className="h-full bg-citron-400 transition-all" style={{ width: `${Math.max(0, remaining)}%` }} />
          <div className="h-full bg-fuchsia-500 transition-all" style={{ width: `${Math.min(100, featTotal)}%` }} />
          <div className="h-full bg-violet-400/70 transition-all" style={{ width: `${Math.min(100, otherTotal)}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs">
          <span className={over ? "font-semibold text-red-400" : "text-zinc-300"}>
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-citron-400" />
            {over ? "Total la depase 100%!" : (
              <>
                Rete pou ou: <span className="font-bold text-citron-300">{remaining}%</span>
              </>
            )}
          </span>
          <span className="text-zinc-400">
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-fuchsia-500" />
            Featuring: {featTotal}%
          </span>
          {otherTotal > 0 && (
            <span className="text-zinc-400">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-violet-400/70" />
              Kolaboratè: {otherTotal}%
            </span>
          )}
        </div>
        <p className="mt-2 text-[11px] text-zinc-500">
          Pousantaj yo se sou 85% &quot;pa atis yo&quot; a. Chak moun peye 15% UpMizik sou pa li, ak $0.99 frè lojistik nan mwa li touche.
        </p>
      </div>
    </div>
  );
}
