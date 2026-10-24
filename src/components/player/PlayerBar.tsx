"use client";

import { usePlayer } from "./PlayerProvider";
import { MobilePlayerBar } from "./MobilePlayer";
import { RepeatIcon, ShuffleIcon } from "./PlayerIcons";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const iconButton =
  "flex h-10 w-10 items-center justify-center rounded-full text-zinc-300 transition hover:text-white disabled:opacity-30 disabled:hover:text-zinc-300";

export function PlayerBar() {
  const { current, isPlaying, isLoading, error, currentTime, duration, volume, hasNext, toggle, next, prev, seek, setVolume, repeatMode, cycleRepeat, shuffle, toggleShuffle } =
    usePlayer();

  if (!current) return null;

  return (
    // data-offline-ok: chante ki deja chaje a ka kontinye jwe/kanpe san entènèt
    <div data-offline-ok className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 transform-gpu border-t border-zinc-800 bg-zinc-950/95 backdrop-blur md:bottom-0 md:z-50">
      {/* TELEFÒN: CD k ap woule, ⏪10 ▶ 10⏩, ba pou glise, epi gwo ekran "Kounye a ap jwe" */}
      <div className="sm:hidden">
        <MobilePlayerBar />
      </div>

      {/* ÒDINATÈ: menm jan l te ye a */}
      <div className="mx-auto hidden h-20 max-w-6xl items-center gap-4 px-4 sm:flex">
        {/* Chante a */}
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:w-1/4 sm:flex-none">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-fuchsia-600/40 to-violet-800/40">
            {current.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.coverUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xl">🎵</div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{current.title}</p>
            <p className={`truncate text-xs ${error ? "text-red-400" : "text-zinc-400"}`}>
              {error ?? (isLoading ? "Ap chaje..." : current.artistName)}
            </p>
          </div>
        </div>

        {/* Kontwòl yo */}
        <div className="flex flex-col items-center sm:flex-1">
          <div className="flex items-center gap-1">
            <button
              onClick={toggleShuffle}
              className={`${iconButton} ${shuffle ? "!text-citron-300" : ""}`}
              aria-pressed={shuffle}
              aria-label="Melanje"
              title={shuffle ? "Melanje: wi" : "Melanje"}
            >
              <ShuffleIcon className="h-4 w-4" />
            </button>
            <button onClick={prev} className={iconButton} aria-label="Chante anvan">
              ⏮
            </button>
            <button
              onClick={toggle}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg text-zinc-950 transition hover:scale-105"
              aria-label={isPlaying ? "Poz" : "Jwe"}
            >
              {isPlaying ? "⏸" : "▶"}
            </button>
            <button onClick={next} disabled={!hasNext} className={iconButton} aria-label="Pwochen chante">
              ⏭
            </button>
            <button
              onClick={cycleRepeat}
              className={`${iconButton} ${repeatMode !== "off" ? "!text-citron-300" : ""}`}
              aria-label="Fason jwe"
              title={repeatMode === "off" ? "Youn apre lòt" : repeatMode === "all" ? "Tout lis la an bouk" : "Chante sa a an bouk"}
            >
              <RepeatIcon one={repeatMode === "one"} className="h-4 w-4" />
            </button>
          </div>

          <div className="hidden w-full max-w-xl items-center gap-2 text-xs text-zinc-400 sm:flex">
            <span className="w-10 text-right tabular-nums">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={1}
              value={currentTime}
              onChange={(e) => seek(Number(e.target.value))}
              className="h-1 flex-1 cursor-pointer accent-fuchsia-500"
              aria-label="Pozisyon nan chante a"
            />
            <span className="w-10 tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volim */}
        <div className="hidden w-1/4 items-center justify-end gap-2 sm:flex">
          <button onClick={() => setVolume(volume > 0 ? 0 : 1)} className="text-zinc-400 hover:text-white" aria-label="Volim">
            {volume === 0 ? "🔇" : "🔊"}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="h-1 w-24 cursor-pointer accent-fuchsia-500"
            aria-label="Nivo volim"
          />
        </div>
      </div>
    </div>
  );
}
