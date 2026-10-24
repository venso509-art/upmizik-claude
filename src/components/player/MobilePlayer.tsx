"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Portal } from "@/components/Portal";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { usePlayer } from "./PlayerProvider";
import { VinylDisc } from "./VinylDisc";
import { ChevronDownIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon, Skip10Icon } from "./PlayerIcons";

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Ba pwogrè ou ka glise ak dwèt ou (pou avanse oswa rekile nan chante a)
function SeekBar({ big = false }: { big?: boolean }) {
  const { currentTime, duration, seek } = usePlayer();
  const [dragValue, setDragValue] = useState<number | null>(null);
  const value = dragValue ?? currentTime;
  const pct = duration ? Math.min(100, (value / duration) * 100) : 0;
  return (
    <div className={`group relative flex items-center ${big ? "h-6" : "h-4"}`}>
      <div className={`relative w-full overflow-visible rounded-full bg-white/15 ${big ? "h-1.5" : "h-1"}`}>
        <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
        <span
          className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow transition-transform ${big ? "h-4 w-4" : "h-3 w-3"} ${dragValue !== null ? "scale-125" : ""}`}
          style={{ left: `${pct}%` }}
        />
      </div>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.5}
        value={value}
        onChange={(e) => setDragValue(Number(e.target.value))}
        onPointerUp={() => {
          if (dragValue !== null) seek(dragValue);
          setDragValue(null);
        }}
        onKeyUp={() => {
          if (dragValue !== null) seek(dragValue);
          setDragValue(null);
        }}
        onTouchEnd={() => {
          if (dragValue !== null) seek(dragValue);
          setDragValue(null);
        }}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-label="Avanse oswa rekile nan chante a"
      />
    </div>
  );
}

function PlayButton({ size }: { size: "md" | "lg" }) {
  const { isPlaying, isLoading, toggle } = usePlayer();
  return (
    <button
      type="button"
      onClick={toggle}
      className={`relative flex shrink-0 items-center justify-center rounded-full bg-white text-zinc-950 shadow-lg shadow-black/40 transition active:scale-95 ${
        size === "lg" ? "h-[72px] w-[72px]" : "h-11 w-11"
      }`}
      aria-label={isPlaying ? "Poz" : "Jwe"}
    >
      {/* Ti alo ki respire pandan mizik la ap jwe */}
      {isPlaying && <span className="absolute -inset-1.5 rounded-full ring-2 ring-white/25 motion-safe:animate-pulse" aria-hidden />}
      {isLoading ? (
        <span className={`relative animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-950 ${size === "lg" ? "h-7 w-7" : "h-5 w-5"}`} />
      ) : isPlaying ? (
        <PauseIcon className={`relative ${size === "lg" ? "h-8 w-8" : "h-5 w-5"}`} />
      ) : (
        <PlayIcon className={`relative ${size === "lg" ? "ml-1 h-8 w-8" : "ml-0.5 h-5 w-5"}`} />
      )}
    </button>
  );
}

// Ba lektè sou TELEFÒN: CD k ap woule, non chante a, ⏪10 ▶ 10⏩, ak yon ba pou glise. Tape l = gwo ekran.
export function MobilePlayerBar() {
  const { current, isPlaying, isLoading, error, currentTime, duration, seek } = usePlayer();
  const [open, setOpen] = useState(false);
  if (!current) return null;
  const skip = (d: number) => seek(Math.min(Math.max(0, currentTime + d), duration || currentTime + d));

  return (
    <>
      <div className="px-3 pb-2 pt-1">
        <SeekBar />
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setOpen(true)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label="Louvri lektè a">
            <VinylDisc coverUrl={current.coverUrl} spinning={isPlaying} className="h-12 w-12" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-white">{current.title}</span>
              <span className={`block truncate text-xs ${error ? "text-red-400" : "text-zinc-400"}`}>{error ?? (isLoading ? "Ap chaje…" : current.artistName)}</span>
            </span>
          </button>
          <button type="button" onClick={() => skip(-10)} className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-200 active:scale-90" aria-label="Rekile 10 segonn">
            <Skip10Icon direction="back" className="h-6 w-6" />
          </button>
          <PlayButton size="md" />
          <button type="button" onClick={() => skip(10)} className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-200 active:scale-90" aria-label="Avanse 10 segonn">
            <Skip10Icon direction="forward" className="h-6 w-6" />
          </button>
        </div>
      </div>
      {open && <NowPlaying onClose={() => setOpen(false)} />}
    </>
  );
}

// Gwo ekran "Kounye a ap jwe" (telefòn)
function NowPlaying({ onClose }: { onClose: () => void }) {
  const { current, isPlaying, error, currentTime, duration, hasNext, next, prev, seek } = usePlayer();

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!current) return null;
  const skip = (d: number) => seek(Math.min(Math.max(0, currentTime + d), duration || currentTime + d));

  return (
    <Portal>
      <div className="fixed inset-0 z-[80] flex flex-col overflow-hidden bg-zinc-950 text-white sm:hidden" role="dialog" aria-modal="true" aria-label="Kounye a ap jwe">
        {/* Fon: poster la flou */}
        {current.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.coverUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-40 blur-3xl" aria-hidden />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-zinc-950/70 to-zinc-950" aria-hidden />

        <div className="relative flex items-center justify-between px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10" aria-label="Fèmen">
            <ChevronDownIcon />
          </button>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Kounye a ap jwe</p>
          <span className="h-10 w-10" />
        </div>

        <div className="relative flex flex-1 flex-col items-center justify-center px-8">
          <VinylDisc coverUrl={current.coverUrl} spinning={isPlaying} labelRatio={0.46} className="aspect-square w-[min(78vw,340px)]" />
        </div>

        <div className="relative px-6 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
          <p className="truncate text-2xl font-extrabold">{current.title}</p>
          <Link href={`/atis/${current.artistId}`} onClick={onClose} className="mt-0.5 flex items-center text-base text-white/70 hover:text-white">
            <span className="truncate">{current.artistName}</span>
            {current.artistVerified && <VerifiedBadge />}
          </Link>
          {error && <p className="mt-1 text-sm text-red-400">{error}</p>}

          <div className="mt-6">
            <SeekBar big />
            <div className="mt-1 flex justify-between text-xs tabular-nums text-white/60">
              <span>{formatTime(currentTime)}</span>
              <span>-{formatTime(Math.max(0, duration - currentTime))}</span>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button type="button" onClick={prev} className="flex h-12 w-12 items-center justify-center rounded-full text-white/90 active:scale-90" aria-label="Chante anvan">
              <PrevIcon className="h-7 w-7" />
            </button>
            <button type="button" onClick={() => skip(-10)} className="flex h-12 w-12 items-center justify-center rounded-full text-white/90 active:scale-90" aria-label="Rekile 10 segonn">
              <Skip10Icon direction="back" className="h-8 w-8" />
            </button>
            <PlayButton size="lg" />
            <button type="button" onClick={() => skip(10)} className="flex h-12 w-12 items-center justify-center rounded-full text-white/90 active:scale-90" aria-label="Avanse 10 segonn">
              <Skip10Icon direction="forward" className="h-8 w-8" />
            </button>
            <button
              type="button"
              onClick={next}
              disabled={!hasNext}
              className="flex h-12 w-12 items-center justify-center rounded-full text-white/90 active:scale-90 disabled:opacity-30"
              aria-label="Pwochen chante"
            >
              <NextIcon className="h-7 w-7" />
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
