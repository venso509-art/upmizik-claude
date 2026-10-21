"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePlayer, type Track } from "@/components/player/PlayerProvider";
import { OFFLINE_EVENT, formatBytes, listOffline, offlineObjectUrl, removeOffline, type OfflineSong } from "@/lib/offline";
import { formatDuration } from "@/lib/songs";

export function OfflineLibrary() {
  const { current, isPlaying, playTrack, toggle } = usePlayer();
  const [songs, setSongs] = useState<OfflineSong[] | null>(null);
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let alive = true;
    const created: string[] = [];
    async function load() {
      const list = await listOffline();
      const map: Record<string, string> = {};
      for (const s of list) {
        const url = await offlineObjectUrl(s.coverUrl);
        if (url) {
          map[s.id] = url;
          created.push(url);
        }
      }
      if (alive) {
        setSongs(list);
        setCovers(map);
      }
    }
    load();
    window.addEventListener(OFFLINE_EVENT, load);

    const updateOnline = () => setOnline(navigator.onLine);
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      alive = false;
      created.forEach((u) => URL.revokeObjectURL(u));
      window.removeEventListener(OFFLINE_EVENT, load);
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  if (songs === null) return <p className="py-16 text-center text-zinc-500">Ap chaje...</p>;

  // Imaj yo soti nan memwa lokal la tou, pou yo parèt san entènèt
  const tracks: Track[] = songs.map((s) => ({ ...s, coverUrl: covers[s.id] ?? null }));
  const totalBytes = songs.reduce((sum, s) => sum + s.bytes, 0);
  const playingHere = isPlaying && tracks.some((t) => t.id === current?.id);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className={`rounded-full px-3 py-1 font-medium ${online ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
          {online ? "🟢 An liy" : "🔴 San entènèt"}
        </span>
        <span className="text-zinc-400">
          {songs.length} mizik · {formatBytes(totalBytes)}
        </span>
      </div>

      {songs.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center">
          <p className="text-5xl">📥</p>
          <p className="mt-4 font-semibold text-white">Ou poko sove okenn mizik</p>
          <p className="mt-1 text-sm text-zinc-400">
            Peze bouton 📥 sou yon mizik pou w ka koute l menm lè w pa gen entènèt.
          </p>
          <Link href="/" className="mt-6 inline-block rounded-full btn-primary px-6 py-3 font-semibold">
            Chèche mizik
          </Link>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => (playingHere ? toggle() : playTrack(tracks[0], tracks))}
            className="mt-6 rounded-full btn-primary px-6 py-3 font-semibold shadow-lg transition"
          >
            {playingHere ? "⏸ Poz" : "▶ Jwe tout"}
          </button>

          <ul className="mt-6 divide-y divide-zinc-800/70">
            {tracks.map((t, i) => {
              const isCurrent = current?.id === t.id;
              return (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <button type="button" onClick={() => playTrack(t, tracks)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-fuchsia-600/40 to-violet-800/40">
                      {t.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.coverUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full items-center justify-center">🎵</span>
                      )}
                      {isCurrent && isPlaying && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg">🔊</span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className={`block truncate font-semibold ${isCurrent ? "text-fuchsia-400" : "text-white"}`}>{t.title}</span>
                      <span className="block truncate text-sm text-zinc-400">
                        {t.artistName} · {formatDuration(t.durationSeconds)} · {formatBytes(songs[i].bytes)}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => confirm(`Retire « ${t.title} » nan mizik offline ou yo?`) && removeOffline(songs[i])}
                    className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-red-300"
                    aria-label={`Retire ${t.title}`}
                  >
                    🗑️
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
