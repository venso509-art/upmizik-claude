"use client";

import Link from "next/link";
import { usePlayer } from "@/components/player/PlayerProvider";
import type { TopEntry } from "@/lib/top";
import { VerifiedBadge } from "@/components/VerifiedBadge";

const MEDALS: Record<number, { emoji: string; label: string; ring: string; glow: string; badge: string }> = {
  1: { emoji: "🥇", label: "1ye", ring: "ring-amber-400/70", glow: "shadow-amber-500/30", badge: "from-amber-300 to-amber-500 text-amber-950" },
  2: { emoji: "🥈", label: "2yèm", ring: "ring-zinc-300/50", glow: "shadow-zinc-400/10", badge: "from-zinc-200 to-zinc-400 text-zinc-900" },
  3: { emoji: "🥉", label: "3yèm", ring: "ring-orange-400/50", glow: "shadow-orange-500/10", badge: "from-orange-300 to-orange-600 text-orange-950" },
};

function PodiumCard({ entry, queue }: { entry: TopEntry; queue: TopEntry[] }) {
  const { current, isPlaying, playTrack } = usePlayer();
  const { track, position, plays } = entry;
  const m = MEDALS[position];
  const isCurrent = current?.id === track.id;
  const first = position === 1;

  return (
    <article
      className={`group relative rounded-3xl bg-zinc-900/80 p-4 shadow-2xl ring-1 transition hover:-translate-y-1 ${m.ring} ${m.glow} ${
        first ? "md:-mt-8 md:p-5" : ""
      }`}
    >
      <span className={`absolute -left-3 -top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br text-lg font-black shadow-lg ${m.badge}`}>
        {position}
      </span>

      <button
        type="button"
        onClick={() => playTrack(track, queue.map((e) => e.track))}
        className="relative block aspect-square w-full overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-600/40 to-violet-800/40"
        aria-label={`${isCurrent && isPlaying ? "Poz" : "Jwe"} ${track.title}`}
      >
        {track.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={track.coverUrl} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <span className="flex h-full items-center justify-center text-6xl">🎵</span>
        )}
        <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <span
          className={`absolute bottom-3 right-3 flex h-14 w-14 items-center justify-center rounded-full bg-fuchsia-500 text-xl text-white shadow-xl transition ${
            isCurrent ? "scale-100 opacity-100" : "scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100"
          }`}
        >
          {isCurrent && isPlaying ? "⏸" : "▶"}
        </span>
        <span className="absolute left-3 top-3 text-3xl drop-shadow">{m.emoji}</span>
      </button>

      <div className="mt-4 min-w-0">
        <h3 className={`truncate font-extrabold ${first ? "text-2xl" : "text-lg"} ${isCurrent ? "text-fuchsia-400" : "text-white"}`}>
          <Link href={`/chante/${track.id}`} className="hover:underline">
            {track.title}
          </Link>
        </h3>
        <p className="truncate text-sm text-zinc-400">
          <Link href={`/atis/${track.artistId}`} className="hover:text-white hover:underline">
            {track.artistName}
            {track.artistVerified && <VerifiedBadge />}
          </Link>
          {track.genre ? ` · ${track.genre}` : ""}
        </p>
        <p className="mt-2 text-xs font-medium text-zinc-500">🎧 {plays.toLocaleString("fr-HT")} ekout</p>
      </div>
    </article>
  );
}

export function Top3Section({ entries, auto }: { entries: TopEntry[]; auto: boolean }) {
  const { current, isPlaying, playTrack, toggle } = usePlayer();
  if (entries.length === 0) return null;

  const tracks = entries.map((e) => e.track);
  const playingTop = isPlaying && tracks.some((t) => t.id === current?.id);
  // Sou gwo ekran: #2 a goch, #1 nan mitan, #3 a dwat (tankou yon podyòm)
  const podiumOrder: Record<number, string> = { 1: "md:order-2", 2: "md:order-1", 3: "md:order-3" };

  return (
    <section className="relative mx-auto max-w-6xl px-4 pb-6 pt-12">
      <div className="pointer-events-none absolute inset-x-0 top-10 mx-auto h-64 max-w-3xl rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-300">🏆 Top 3</p>
          <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Pi gwo mizik yo kounye a</h2>
          <p className="mt-1 text-sm text-zinc-400">{auto ? "Mizik ki pi koute sou UpMizik." : "Seleksyon ekip UpMizik la."}</p>
        </div>
        <button
          type="button"
          onClick={() => (playingTop ? toggle() : playTrack(tracks[0], tracks))}
          className="rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3 font-bold text-amber-950 shadow-lg shadow-amber-900/30 transition hover:opacity-90"
        >
          {playingTop ? "⏸ Poz" : "▶ Jwe Top 3 la"}
        </button>
      </div>

      <div className="relative mt-12 grid items-end gap-8 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
        {entries.map((e) => (
          <div key={e.track.id} className={`${podiumOrder[e.position] ?? ""} ${e.position === 1 ? "sm:col-span-2 md:col-span-1" : ""}`}>
            <PodiumCard entry={e} queue={entries} />
          </div>
        ))}
      </div>
    </section>
  );
}
