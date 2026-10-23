"use client";

import { usePlayer, type Track } from "@/components/player/PlayerProvider";
import { formatDuration } from "@/lib/songs";

export function PlayAllButton({ tracks, label = "▶ Jwe tout" }: { tracks: Track[]; label?: string }) {
  const { current, isPlaying, playTrack, toggle } = usePlayer();
  const playingThisList = isPlaying && tracks.some((t) => t.id === current?.id);

  return (
    <button
      type="button"
      onClick={() => (playingThisList ? toggle() : playTrack(tracks[0], tracks))}
      className="rounded-full btn-primary px-6 py-3 font-semibold shadow-lg transition"
    >
      {playingThisList ? "⏸ Poz" : label}
    </button>
  );
}

export function TrackList({ tracks, plays }: { tracks: Track[]; plays: Record<string, number> }) {
  const { current, isPlaying, playTrack } = usePlayer();

  return (
    <ol className="divide-y divide-zinc-800/60">
      {tracks.map((t, i) => {
        const isCurrent = current?.id === t.id;
        return (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => playTrack(t, tracks)}
              className={`group grid w-full grid-cols-[2rem_3rem_1fr_auto] items-center gap-3 rounded-lg px-2 py-2 text-left transition sm:grid-cols-[2rem_3rem_1fr_6rem_4rem] ${
                isCurrent ? "bg-zinc-800/80" : "hover:bg-zinc-900"
              }`}
            >
              <span className="text-center text-sm tabular-nums text-zinc-500">
                {isCurrent && isPlaying ? (
                  <span className="inline-flex h-3 items-end gap-0.5" aria-hidden>
                    {["0s", "0.3s", "0.6s"].map((d) => (
                      <span key={d} className="h-full w-0.5 origin-bottom animate-equalizer bg-fuchsia-400" style={{ animationDelay: d }} />
                    ))}
                  </span>
                ) : (
                  <>
                    <span className="group-hover:hidden">{i + 1}</span>
                    <span className="hidden text-white group-hover:inline">▶</span>
                  </>
                )}
              </span>
              <span className="h-12 w-12 overflow-hidden rounded bg-gradient-to-br from-fuchsia-600/40 to-violet-800/40">
                {t.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.coverUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center">🎵</span>
                )}
              </span>
              <span className="min-w-0">
                <span className={`block truncate font-medium ${isCurrent ? "text-fuchsia-400" : "text-white"}`}>{t.title}</span>
                <span className="block truncate text-xs text-zinc-500">
                  {t.genre}
                  {/* Sou telefòn kolòn ekout la kache: montre l isit la */}
                  <span className="sm:hidden">
                    {t.genre ? " · " : ""}
                    {(plays[t.id] ?? 0).toLocaleString("fr-HT")} ekout
                  </span>
                </span>
              </span>
              <span className="hidden text-right text-sm tabular-nums text-zinc-500 sm:block">
                {(plays[t.id] ?? 0).toLocaleString("fr-HT")} ekout
              </span>
              <span className="text-right text-sm tabular-nums text-zinc-500">{formatDuration(t.durationSeconds)}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
