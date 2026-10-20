"use client";

import Link from "next/link";
import { usePlayer } from "@/components/player/PlayerProvider";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { formatPlays } from "@/lib/levels";
import type { Top10Entry } from "@/lib/top";

// Top 10 otomatik (#4 a #13), anba Top 3 admin nan
export function Top10Section({ entries }: { entries: Top10Entry[] }) {
  const { current, isPlaying, playTrack } = usePlayer();
  if (entries.length === 0) return null;
  const tracks = entries.map((e) => e.track);

  return (
    <section className="mx-auto max-w-6xl px-4 pb-6 pt-10">
      <h2 className="text-2xl font-extrabold tracking-tight text-white">📈 Top 10 k ap swiv</h2>
      <p className="mt-1 text-sm text-zinc-400">Klasman otomatik dapre ekout ak don 30 dènye jou yo. Plis fanatik yo koute ak sipòte, plis yon mizik monte.</p>

      <ol className="mt-6 grid gap-x-6 sm:grid-cols-2">
        {entries.map((e) => {
          const isCurrent = current?.id === e.track.id;
          return (
            <li key={e.track.id} className="flex items-center gap-3 border-b border-zinc-800/70 py-3">
              <span className="w-8 shrink-0 text-center text-xl font-black tabular-nums text-zinc-500">{e.rank}</span>
              <button
                type="button"
                onClick={() => playTrack(e.track, tracks)}
                className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-fuchsia-600/40 to-violet-800/40"
                aria-label={`${isCurrent && isPlaying ? "Poz" : "Jwe"} ${e.track.title}`}
              >
                {e.track.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.track.coverUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center">🎵</span>
                )}
                <span
                  className={`absolute inset-0 flex items-center justify-center bg-black/50 text-white transition ${
                    isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                >
                  {isCurrent && isPlaying ? "⏸" : "▶"}
                </span>
              </button>
              <div className="min-w-0 flex-1">
                <Link href={`/chante/${e.track.id}`} className={`block truncate font-semibold hover:underline ${isCurrent ? "text-fuchsia-400" : "text-white"}`}>
                  {e.track.title}
                </Link>
                <p className="truncate text-sm text-zinc-400">
                  <Link href={`/atis/${e.track.artistId}`} className="hover:text-white hover:underline">
                    {e.track.artistName}
                  </Link>
                  {e.track.artistVerified && <VerifiedBadge />}
                </p>
              </div>
              <div className="shrink-0 text-right text-xs text-zinc-500">
                <p className="tabular-nums">🎧 {formatPlays(e.plays)}</p>
                {e.donationsUsd30d > 0 && <p className="text-fuchsia-300">💝 ${e.donationsUsd30d.toLocaleString("en-US")}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
