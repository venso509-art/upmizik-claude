"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Portal } from "@/components/Portal";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { usePlayer } from "@/components/player/PlayerProvider";
import { timeAgo } from "@/lib/posts";
import { STATUS_SECONDS, loadArtistStatuses, markSeen, statusMediaUrl, type ArtistStatus } from "@/lib/statuses";

export type StatusArtist = { id: string; name: string; avatarUrl: string | null; verified?: boolean };

// Ekran stati a (plen ekran, tankou WhatsApp): ba pwogrè anlè, tape adwat/agoch pou chanje, kenbe pou pran poz
export function StatusViewer({ artist, onClose }: { artist: StatusArtist; onClose: () => void }) {
  const { isPlaying, toggle } = usePlayer();
  const [statuses, setStatuses] = useState<ArtistStatus[] | null>(null);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0); // 0 → 1 pou stati aktyèl la
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const mediaRef = useRef<HTMLVideoElement & HTMLAudioElement>(null);
  const pausedMusic = useRef(false);
  const pressedAt = useRef(0); // pou fè diferans ant yon ti tape ak "kenbe pou poz"
  const supabase = useRef(createClient()).current;

  // Chaje stati yo; mete mizik k ap jwe a an poz pandan moun nan ap gade (tankou WhatsApp)
  useEffect(() => {
    void loadArtistStatuses(supabase, artist.id).then(setStatuses);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [artist.id, supabase]);

  useEffect(() => {
    if (isPlaying && !pausedMusic.current) {
      pausedMusic.current = true;
      toggle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = useCallback(() => {
    onClose();
    if (pausedMusic.current) toggle(); // relanse mizik la
  }, [onClose, toggle]);

  const current = statuses?.[index] ?? null;
  const next = useCallback(() => {
    if (!statuses) return;
    if (index + 1 < statuses.length) {
      setIndex(index + 1);
      setProgress(0);
    } else close();
  }, [index, statuses, close]);
  const prev = () => {
    setIndex((i) => Math.max(0, i - 1));
    setProgress(0);
  };

  // Make stati a "wè"
  useEffect(() => {
    if (current) markSeen([current.id]);
  }, [current]);

  // Tèks / foto: revèy 6 segonn. Videyo / odyo: swiv tan fichye a.
  useEffect(() => {
    if (!current || paused) return;
    if (current.kind === "video" || current.kind === "audio") return;
    const start = Date.now() - progress * STATUS_SECONDS * 1000;
    const t = setInterval(() => {
      const p = (Date.now() - start) / (STATUS_SECONDS * 1000);
      if (p >= 1) {
        clearInterval(t);
        next();
      } else setProgress(p);
    }, 50);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, paused, next]);

  useEffect(() => {
    const m = mediaRef.current;
    if (!m) return;
    if (paused) m.pause();
    else void m.play().catch(() => {});
  }, [paused, current]);

  // Klavye (òdinatè): flèch yo ak Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, next]);

  const url = current ? statusMediaUrl(supabase, current.media_path) : null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black sm:bg-black/90" role="dialog" aria-modal="true" aria-label={`Stati ${artist.name}`}>
        <div
          className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-zinc-950 sm:h-[92vh] sm:rounded-3xl"
          style={current?.kind === "text" ? { background: current.bg ?? "#0A5C36" } : undefined}
        >
          {/* Ba pwogrè yo */}
          <div className="absolute inset-x-0 top-0 z-20 flex gap-1 px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
            {(statuses ?? [null]).map((s, i) => (
              <span key={s?.id ?? i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
                <span className="block h-full bg-white" style={{ width: `${i < index ? 100 : i === index ? progress * 100 : 0}%` }} />
              </span>
            ))}
          </div>

          {/* Tèt: atis la */}
          <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-3 bg-gradient-to-b from-black/60 to-transparent px-3 pb-6 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
            <Link href={`/atis/${artist.id}`} onClick={close} className="flex min-w-0 flex-1 items-center gap-3">
              <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-800 ring-2 ring-white/70">
                {artist.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={artist.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center font-bold text-white">{artist.name.charAt(0).toUpperCase()}</span>
                )}
              </span>
              <span className="min-w-0">
                <span className="flex items-center text-sm font-semibold text-white">
                  <span className="truncate">{artist.name}</span>
                  {artist.verified && <VerifiedBadge />}
                </span>
                {current && <span className="block text-xs text-white/70">{timeAgo(current.created_at)}</span>}
              </span>
            </Link>
            {(current?.kind === "video" || current?.kind === "audio") && (
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white"
                aria-label={muted ? "Mete son an" : "Koupe son an"}
              >
                {muted ? "🔇" : "🔊"}
              </button>
            )}
            <button type="button" onClick={close} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-lg text-white" aria-label="Fèmen">
              ✕
            </button>
          </div>

          {/* Kontni an */}
          <div className="relative flex flex-1 items-center justify-center">
            {!statuses ? (
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-label="Ap chaje" />
            ) : !current ? (
              <p className="px-8 text-center text-white/80">Pa gen stati ankò. Stati yo disparèt apre 24 è.</p>
            ) : current.kind === "text" ? (
              <p className="whitespace-pre-line break-words px-8 text-center text-2xl font-bold leading-snug text-white sm:text-3xl">{current.body}</p>
            ) : current.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={current.id} src={url ?? ""} alt={current.body ?? `Stati ${artist.name}`} className="max-h-full w-full object-contain" />
            ) : current.kind === "video" ? (
              <video
                key={current.id}
                ref={mediaRef}
                src={url ?? ""}
                autoPlay
                playsInline
                muted={muted}
                className="max-h-full w-full object-contain"
                onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime / (e.currentTarget.duration || 1))}
                onEnded={next}
              />
            ) : (
              <div className="flex w-full flex-col items-center gap-6 px-8">
                <span className="flex h-28 w-28 items-center justify-center rounded-full bg-white/10 text-5xl ring-4 ring-white/20 motion-safe:animate-pulse">🎙️</span>
                <audio
                  key={current.id}
                  ref={mediaRef}
                  src={url ?? ""}
                  autoPlay
                  muted={muted}
                  onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime / (e.currentTarget.duration || 1))}
                  onEnded={next}
                />
                <p className="text-sm text-white/70">{paused ? "⏸ An poz" : "🔊 Mesaj odyo"}</p>
              </div>
            )}

            {/* Zòn pou tape: agoch = anvan, adwat = apre; kenbe = poz */}
            {statuses && current && (
              <div className="absolute inset-0 z-10 flex">
                <button
                  type="button"
                  className="h-full w-1/3"
                  aria-label="Stati anvan"
                  onClick={() => Date.now() - pressedAt.current < 300 && prev()}
                  onPointerDown={() => {
                    pressedAt.current = Date.now();
                    setPaused(true);
                  }}
                  onPointerUp={() => setPaused(false)}
                  onPointerLeave={() => setPaused(false)}
                />
                <button
                  type="button"
                  className="h-full w-2/3"
                  aria-label="Pwochen stati"
                  onClick={() => Date.now() - pressedAt.current < 300 && next()}
                  onPointerDown={() => {
                    pressedAt.current = Date.now();
                    setPaused(true);
                  }}
                  onPointerUp={() => setPaused(false)}
                  onPointerLeave={() => setPaused(false)}
                />
              </div>
            )}
          </div>

          {/* Deskripsyon (foto/videyo/odyo) */}
          {current && current.kind !== "text" && current.body && (
            <p className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-10 text-center text-sm text-white">
              {current.body}
            </p>
          )}
        </div>
      </div>
    </Portal>
  );
}
