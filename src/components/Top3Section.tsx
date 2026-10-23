"use client";

import Link from "next/link";
import { usePlayer } from "@/components/player/PlayerProvider";
import type { TopEntry } from "@/lib/top";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { SongActions } from "@/components/SongActions";
import type { SongExtras } from "@/lib/songs";

const MEDALS: Record<number, { emoji: string; label: string; ring: string; glow: string; badge: string }> = {
  1: { emoji: "🥇", label: "1ye", ring: "ring-amber-400/70", glow: "shadow-amber-500/30", badge: "from-amber-300 to-amber-500 text-amber-950" },
  2: { emoji: "🥈", label: "2yèm", ring: "ring-zinc-300/50", glow: "shadow-zinc-400/10", badge: "from-zinc-200 to-zinc-400 text-zinc-900" },
  3: { emoji: "🥉", label: "3yèm", ring: "ring-orange-400/50", glow: "shadow-orange-500/10", badge: "from-orange-300 to-orange-600 text-orange-950" },
};

function PodiumCard({
  entry,
  queue,
  extras,
  currentUserId,
}: {
  entry: TopEntry;
  queue: TopEntry[];
  extras?: SongExtras;
  currentUserId: string | null;
}) {
  const { current, isPlaying, playTrack } = usePlayer();
  const { track, position, plays } = entry;
  const m = MEDALS[position];
  const isCurrent = current?.id === track.id;
  const first = position === 1;

  return (
    <article
      className={`group relative isolate rounded-3xl bg-zinc-900/80 shadow-2xl ring-1 transition hover:-translate-y-1 ${m.ring} ${m.glow} ${
        first ? "p-4 ring-2 md:-mt-8 md:p-5 md:ring-1" : "p-2.5 md:p-4"
      }`}
    >
      {/* Ti limyè lò dèyè #1 an (telefòn sèlman) */}
      {first && <span className="pointer-events-none absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-to-br from-amber-400/25 via-amber-500/5 to-fuchsia-500/20 blur-2xl md:hidden" />}
      <span
        className={`absolute -left-3 -top-3 z-10 flex items-center justify-center rounded-full bg-gradient-to-br font-black shadow-lg md:h-11 md:w-11 md:text-lg ${m.badge} ${
          first ? "h-12 w-12 text-xl" : "h-9 w-9 text-base"
        }`}
      >
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
          className={`absolute bottom-2 right-2 flex items-center justify-center rounded-full bg-citron-400 text-zinc-950 shadow-xl transition md:bottom-3 md:right-3 md:h-14 md:w-14 md:text-xl ${
            first ? "h-14 w-14 text-xl" : "h-10 w-10 text-base"
          } ${isCurrent ? "scale-100 opacity-100" : "scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100"}`}
        >
          {isCurrent && isPlaying ? "⏸" : "▶"}
        </span>
        <span className={`absolute left-2 top-2 drop-shadow md:left-3 md:top-3 md:text-3xl ${first ? "text-4xl" : "text-2xl"}`}>{m.emoji}</span>
      </button>

      <div className={`min-w-0 md:mt-4 md:text-left ${first ? "mt-4 text-center" : "mt-3"}`}>
        <h3 className={`truncate font-extrabold ${first ? "text-2xl sm:text-3xl md:text-2xl" : "text-sm md:text-lg"} ${isCurrent ? "text-fuchsia-400" : "text-white"}`}>
          <Link href={`/chante/${track.id}`} className="hover:underline">
            {track.title}
          </Link>
        </h3>
        <p className={`truncate text-zinc-400 md:text-sm ${first ? "text-sm sm:text-base" : "text-xs"}`}>
          <Link href={`/atis/${track.artistId}`} className="hover:text-white hover:underline">
            {track.artistName}
            {track.artistVerified && <VerifiedBadge />}
          </Link>
          {track.genre ? ` · ${track.genre}` : ""}
        </p>
        {extras ? (
          <div className="mt-3">
            <SongActions
              variant="podium"
              compact={!first}
              plays={plays}
              songId={track.id}
              title={track.title}
              artistId={track.artistId}
              artistName={track.artistName}
              extras={extras}
              currentUserId={currentUserId}
            />
          </div>
        ) : (
          <p className={`font-medium text-zinc-500 md:mt-2 md:text-xs ${first ? "mt-2 text-sm" : "mt-1 text-[11px]"}`}>🎧 {plays.toLocaleString("fr-HT")} ekout</p>
        )}
      </div>
    </article>
  );
}

export function Top3Section({
  entries,
  auto,
  extras,
  currentUserId = null,
}: {
  entries: TopEntry[];
  auto: boolean;
  extras?: Record<string, SongExtras>;
  currentUserId?: string | null;
}) {
  const { current, isPlaying, playTrack, toggle } = usePlayer();
  if (entries.length === 0) return null;

  const tracks = entries.map((e) => e.track);
  const playingTop = isPlaying && tracks.some((t) => t.id === current?.id);
  const sorted = [...entries].sort((a, b) => a.position - b.position);
  const rest = sorted.slice(1, 3);

  return (
    <section className="relative mx-auto max-w-6xl px-4 pb-6 pt-12">
      <div className="pointer-events-none absolute inset-x-0 top-10 mx-auto h-64 max-w-3xl rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-300">🏆 Top 3</p>
          <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Pi gwo mizik yo kounye a</h2>
          <p className="mt-1 text-sm text-zinc-400">{auto ? "Mizik ki gen plis ekout sou UpMizik." : "Seleksyon ekip UpMizik la."}</p>
        </div>
        <button
          type="button"
          onClick={() => (playingTop ? toggle() : playTrack(tracks[0], tracks))}
          className="rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3 font-bold text-amber-950 shadow-lg shadow-amber-900/30 transition hover:opacity-90"
        >
          {playingTop ? "⏸ Poz" : "▶ Jwe Top 3 la"}
        </button>
      </div>

      {/* TELEFÒN: #1 pou kont li anlè a, #2 ak #3 kot a kot anba l.
          ÒDINATÈ (md+): podyòm #2 · #1 · #3 sou yon sèl liy. */}
      <div className="relative mt-12 grid grid-cols-2 items-end gap-x-4 gap-y-8 md:grid-cols-3 md:gap-6">
        {sorted.map((e) => {
          const lone = e.position !== 1 && rest.length === 1; // pa gen #3: santre #2 sou telefòn
          const cls =
            e.position === 1
              ? "col-span-2 mx-auto w-full max-w-sm md:order-2 md:col-span-1 md:max-w-none"
              : `${e.position === 2 ? "md:order-1" : "md:order-3"} ${lone ? "col-span-2 mx-auto w-1/2 md:col-span-1 md:w-full" : ""}`;
          return (
            <div key={e.track.id} className={cls}>
              <PodiumCard entry={e} queue={entries} extras={extras?.[e.track.id]} currentUserId={currentUserId} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
