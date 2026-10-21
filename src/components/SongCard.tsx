"use client";

import { FeaturingLinks } from "@/components/FeaturingLinks";
import Link from "next/link";
import { usePlayer, type Track } from "@/components/player/PlayerProvider";
import { SongActions } from "@/components/SongActions";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import type { SongExtras } from "@/lib/songs";
import { formatPlays } from "@/lib/levels";

export function SongCard({
  song,
  queue,
  extras,
  currentUserId,
}: {
  song: Track;
  queue: Track[];
  extras: SongExtras;
  currentUserId: string | null;
}) {
  const { current, isPlaying, playTrack } = usePlayer();
  const isCurrent = current?.id === song.id;

  return (
    <div className={`group rounded-xl p-3 transition ${isCurrent ? "bg-zinc-800" : "bg-zinc-900/60 hover:bg-zinc-800/80"}`}>
      <button
        type="button"
        onClick={() => playTrack(song, queue)}
        className="block w-full text-left"
        aria-label={`${isCurrent && isPlaying ? "Poz" : "Jwe"} ${song.title}`}
      >
        <div className="relative aspect-square overflow-hidden rounded-lg bg-gradient-to-br from-fuchsia-600/40 to-violet-800/40">
          {song.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={song.coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-5xl">🎵</div>
          )}
          {/* Kantite ekout: pou tout moun wè evolisyon chante a */}
          {typeof song.playCount === "number" && (
            <span
              className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-zinc-950/70 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white ring-1 ring-white/10 backdrop-blur-md"
              title={`${song.playCount.toLocaleString("fr-HT")} ekout`}
            >
              <svg viewBox="0 0 24 24" className="h-3 w-3 text-citron-300" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                <path d="M3 14v-2a9 9 0 0 1 18 0v2" strokeLinecap="round" />
                <rect x="3" y="14" width="4" height="7" rx="1.5" fill="currentColor" />
                <rect x="17" y="14" width="4" height="7" rx="1.5" fill="currentColor" />
              </svg>
              {formatPlays(song.playCount)}
            </span>
          )}
          <span
            className={`absolute bottom-2 right-2 flex h-11 w-11 items-center justify-center rounded-full bg-citron-400 text-zinc-950 shadow-lg transition ${
              isCurrent ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
            }`}
          >
            {isCurrent && isPlaying ? (
              <span className="flex h-4 items-end gap-0.5" aria-hidden>
                {["0s", "0.3s", "0.6s"].map((d) => (
                  <span key={d} className="h-full w-1 origin-bottom animate-equalizer rounded-full bg-zinc-950" style={{ animationDelay: d }} />
                ))}
              </span>
            ) : (
              "▶"
            )}
          </span>
        </div>
      </button>
      <h3 className={`mt-3 truncate font-semibold ${isCurrent ? "text-fuchsia-400" : "text-white"}`}>
        <Link href={`/chante/${song.id}`} className="hover:underline">
          {song.title}
        </Link>
      </h3>
      <p className="truncate text-sm text-zinc-400">
        <Link href={`/atis/${song.artistId}`} className="hover:text-white hover:underline">
          {song.artistName}
          {song.artistVerified && <VerifiedBadge />}
        </Link>
        <FeaturingLinks artists={extras?.featuring} />
        {song.genre ? ` · ${song.genre}` : ""}
      </p>
      <div className="-mx-2 mt-2">
        <SongActions songId={song.id} title={song.title} artistId={song.artistId} artistName={song.artistName} extras={extras} currentUserId={currentUserId} track={song} />
      </div>
    </div>
  );
}
