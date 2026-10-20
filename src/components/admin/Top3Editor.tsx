"use client";

import { useMemo, useState, useTransition } from "react";
import { saveTop3 } from "@/app/admin/top3/actions";
import { FormMessage, inputClass } from "@/components/auth/ui";

export type SongOption = { id: string; title: string; artistName: string; plays: number; coverUrl: string | null };

const SLOTS = [
  { position: 1, emoji: "🥇", label: "1ye plas" },
  { position: 2, emoji: "🥈", label: "2yèm plas" },
  { position: 3, emoji: "🥉", label: "3yèm plas" },
];

function Cover({ url, size = "h-12 w-12" }: { url: string | null; size?: string }) {
  return (
    <span className={`block shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-fuchsia-600/40 to-violet-800/40 ${size}`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full items-center justify-center">🎵</span>
      )}
    </span>
  );
}

export function Top3Editor({ songs, initial }: { songs: SongOption[]; initial: (string | null)[] }) {
  const [slots, setSlots] = useState<(string | null)[]>([initial[0] ?? null, initial[1] ?? null, initial[2] ?? null]);
  const [active, setActive] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const byId = useMemo(() => new Map(songs.map((s) => [s.id, s])), [songs]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return songs.filter((s) => !q || s.title.toLowerCase().includes(q) || s.artistName.toLowerCase().includes(q)).slice(0, 30);
  }, [songs, query]);

  function choose(index: number, id: string | null) {
    setSlots((prev) => prev.map((v, i) => (i === index ? id : v)));
    setActive(null);
    setQuery("");
    setSaved(false);
  }

  function save(ids: (string | null)[]) {
    startTransition(async () => {
      const res = await saveTop3(ids);
      setError(res.error);
      setSaved(!res.error);
      if (!res.error && ids.length === 0) setSlots([null, null, null]);
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {SLOTS.map((slot, i) => {
          const song = slots[i] ? byId.get(slots[i]!) : undefined;
          return (
            <div key={slot.position} className={`rounded-2xl border p-4 ${active === i ? "border-fuchsia-500 bg-fuchsia-500/5" : "border-zinc-800 bg-zinc-900/60"}`}>
              <p className="text-sm font-semibold text-zinc-300">
                {slot.emoji} {slot.label}
              </p>
              {song ? (
                <div className="mt-3 flex items-center gap-3">
                  <Cover url={song.coverUrl} size="h-16 w-16" />
                  <div className="min-w-0">
                    <p className="truncate font-bold text-white">{song.title}</p>
                    <p className="truncate text-sm text-zinc-400">{song.artistName}</p>
                    <p className="text-xs text-zinc-500">🎧 {song.plays.toLocaleString("fr-HT")} ekout</p>
                  </div>
                </div>
              ) : (
                <p className="mt-3 flex h-16 items-center text-sm text-zinc-500">Plas vid</p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setActive(active === i ? null : i)}
                  className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:border-zinc-500"
                >
                  {active === i ? "Fèmen" : song ? "Chanje" : "Chwazi yon mizik"}
                </button>
                {song && (
                  <button onClick={() => choose(i, null)} className="rounded-lg px-3 py-2 text-sm text-zinc-500 hover:text-red-300" aria-label="Retire">
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {active !== null && (
        <div className="rounded-2xl border border-fuchsia-500/40 bg-zinc-900 p-4">
          <p className="mb-3 text-sm font-semibold text-white">
            Chwazi mizik pou {SLOTS[active].emoji} {SLOTS[active].label}
          </p>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔎 Chèche pa tit oswa atis..." autoFocus className={inputClass} />
          <ul className="mt-3 max-h-80 divide-y divide-zinc-800 overflow-y-auto">
            {results.length === 0 && <li className="py-6 text-center text-sm text-zinc-500">Pa gen mizik ki koresponn.</li>}
            {results.map((s) => {
              const takenAt = slots.findIndex((id, j) => id === s.id && j !== active);
              return (
                <li key={s.id}>
                  <button
                    onClick={() => choose(active, s.id)}
                    disabled={takenAt !== -1}
                    className="flex w-full items-center gap-3 px-2 py-2 text-left transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Cover url={s.coverUrl} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-white">{s.title}</span>
                      <span className="block truncate text-xs text-zinc-400">{s.artistName}</span>
                    </span>
                    <span className="text-xs text-zinc-500">{takenAt !== -1 ? `Deja ${SLOTS[takenAt].emoji}` : `🎧 ${s.plays}`}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <FormMessage error={error} message={saved ? "Top 3 la sove! Li parèt sou paj akèy la kounye a. ✅" : undefined} />

      <div className="flex flex-wrap justify-between gap-3">
        <button
          onClick={() => confirm("Retounen nan mòd otomatik? Paj akèy la ap montre 3 mizik ki pi koute yo.") && save([])}
          disabled={pending}
          className="rounded-lg px-4 py-2.5 text-sm text-zinc-400 transition hover:text-white disabled:opacity-50"
        >
          🤖 Mòd otomatik (3 pi koute yo)
        </button>
        <button
          onClick={() => save(slots)}
          disabled={pending || slots.every((s) => !s)}
          className="rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-2.5 font-bold text-amber-950 transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Ap sove..." : "Sove Top 3 la"}
        </button>
      </div>
    </div>
  );
}
