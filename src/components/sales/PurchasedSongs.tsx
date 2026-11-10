"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePlayer, type Track } from "@/components/player/PlayerProvider";
import { DownloadButton } from "@/components/offline/DownloadButton";
import { formatDuration } from "@/lib/songs";

type Row = {
  song_id: string;
  title: string;
  artist_id: string;
  artist_name: string;
  audio_path: string;
  cover_path: string | null;
  duration_seconds: number | null;
  bought_at: string;
  via_release: string | null;
};

// 🛒 Acha mwen yo: tout mizik moun nan achte. Li ka telechaje yo ankò nenpòt lè (menm si l te pèdi yo).
export function PurchasedSongs() {
  const { playTrack } = usePlayer();
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<{ row: Row; track: Track }[] | null>(null);

  useEffect(() => {
    if (!navigator.onLine) return setItems([]);
    void (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setItems([]);
      setUserId(user.id);
      const { data } = await supabase.rpc("my_purchased_songs");
      const rows = ((data ?? []) as Row[]).sort((a, b) => b.bought_at.localeCompare(a.bought_at));
      setItems(
        rows.map((r) => ({
          row: r,
          track: {
            id: r.song_id,
            title: r.title,
            genre: null,
            artistId: r.artist_id,
            artistName: r.artist_name,
            coverUrl: r.cover_path ? supabase.storage.from("covers").getPublicUrl(r.cover_path).data.publicUrl : null,
            audioUrl: supabase.storage.from("audio").getPublicUrl(r.audio_path).data.publicUrl,
            durationSeconds: r.duration_seconds,
          },
        })),
      );
    })();
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <section id="acha" className="mb-10 scroll-mt-24">
      <h2 className="flex items-center gap-2 text-xl font-bold text-white">
        🛒 Acha mwen yo <span className="text-sm font-normal text-zinc-500">({items.length})</span>
      </h2>
      <p className="mt-1 text-sm text-zinc-400">Mizik ou achte yo. Telechaje yo sou telefòn ou, oswa sove yo isit la pou koute san entènèt.</p>
      <ul className="mt-4 divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-900/40">
        {items.map(({ row, track }) => (
          <li key={row.song_id} className="flex items-center gap-3 p-3">
            <button type="button" onClick={() => playTrack(track, items.map((i) => i.track))} className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-800" aria-label={`Jwe ${row.title}`}>
              {track.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={track.coverUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center">🎵</span>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <Link href={`/chante/${row.song_id}`} className="block truncate text-sm font-semibold text-white hover:underline">
                {row.title}
              </Link>
              <p className="truncate text-xs text-zinc-500">
                {row.artist_name}
                {row.via_release && <> · 💿 {row.via_release}</>}
                {row.duration_seconds ? <> · {formatDuration(row.duration_seconds)}</> : null}
              </p>
            </div>
            <DownloadButton track={track} currentUserId={userId} className="rounded-full px-2 py-1.5 text-sm hover:bg-zinc-800" />
            <a
              href={`/api/acha/telechaje/${row.song_id}`}
              className="shrink-0 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/40 hover:bg-emerald-500/25"
            >
              ⬇️ Telechaje
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
