"use client";

import Link from "next/link";
import { usePlayer, type Track } from "@/components/player/PlayerProvider";
import { SongActions } from "@/components/SongActions";
import type { SongExtras } from "@/lib/songs";

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
          <span
            className={`absolute bottom-2 right-2 flex h-11 w-11 items-center justify-center rounded-full bg-fuchsia-500 text-white shadow-lg transition ${
              isCurrent ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
            }`}
          >
            {isCurrent && isPlaying ? (
              <span className="flex h-4 items-end gap-0.5" aria-hidden>
                {["0s", "0.3s", "0.6s"].map((d) => (
                  <span key={d} className="h-full w-1 origin-bottom animate-equalizer rounded-full bg-white" style={{ animationDelay: d }} />
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
        </Link>
        {song.genre ? ` · ${song.genre}` : ""}
      </p>
      <div className="-mx-2 mt-2">
        <SongActions songId={song.id} title={song.title} artistId={song.artistId} artistName={song.artistName} extras={extras} currentUserId={currentUserId} track={song} />
      </div>
    </div>
  );
}
