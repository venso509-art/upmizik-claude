import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SongCard } from "@/components/SongCard";
import { ArtistBubbles, type BubbleArtist } from "@/components/ArtistBubbles";
import { SearchInput } from "@/components/search/SearchInput";
import { GENRES } from "@/lib/genres";
import { SONG_SELECT, getSongExtras, toTrack, type SongRow } from "@/lib/songs";

export const metadata: Metadata = { title: "Chache | UpMizik" };

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? "").trim().slice(0, 100);
  const supabase = createClient();
  const searching = q.length >= 2;

  let artists: BubbleArtist[] = [];
  let rows: SongRow[] = [];
  if (searching) {
    const [artistRes, songRes] = await Promise.all([
      supabase.rpc("search_artists", { p_q: q, p_limit: 12 }),
      supabase.rpc("search_songs", { p_q: q, p_limit: 24 }),
    ]);
    artists = (artistRes.data ?? []) as BubbleArtist[];
    const ids = ((songRes.data ?? []) as { id: string }[]).map((r) => r.id);
    if (ids.length) {
      const { data } = await supabase.from("songs").select(SONG_SELECT).in("id", ids).returns<SongRow[]>();
      // Kenbe lòd rechèch la (pi bon rezilta yo anvan)
      const byId = new Map((data ?? []).map((s) => [s.id, s]));
      rows = ids.map((id) => byId.get(id)).filter((s): s is SongRow => !!s);
    }
  }

  const songs = rows.map((s) => toTrack(supabase, s));
  const { data: { user } } = await supabase.auth.getUser();
  const extras = await getSongExtras(supabase, songs.map((s) => s.id), user?.id ?? null);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight text-white">🔍 Chache</h1>
      <div className="mt-6">
        <SearchInput initial={q} autoFocus={!q} />
      </div>

      {!searching ? (
        <section className="mt-10">
          <h2 className="text-sm font-semibold text-zinc-300">🎶 Chache pa jan</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {GENRES.map((g) => (
              <Link
                key={g}
                href={`/?jan=${encodeURIComponent(g)}#nouvo`}
                className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-200 transition hover:border-fuchsia-500 hover:text-white"
              >
                {g}
              </Link>
            ))}
          </div>
          {q.length === 1 && <p className="mt-8 text-sm text-zinc-500">Tape omwen 2 lèt pou chache.</p>}
        </section>
      ) : artists.length === 0 && songs.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-5xl">🤷🏾</p>
          <p className="mt-4 text-lg font-semibold text-white">Nou pa jwenn anyen pou « {q} »</p>
          <p className="mt-1 text-sm text-zinc-400">Eseye yon lòt mo, oswa tcheke jan w ekri l la.</p>
        </div>
      ) : (
        <>
          {artists.length > 0 && (
            <div className="-mx-4 mt-6">
              <ArtistBubbles title={`🎤 Atis (${artists.length})`} artists={artists} />
            </div>
          )}
          {songs.length > 0 && (
            <section className="mt-10">
              <h2 className="text-sm font-semibold text-zinc-300">🎵 Chante ({songs.length})</h2>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {songs.map((song) => (
                  <SongCard key={song.id} song={song} queue={songs} extras={extras[song.id]} currentUserId={user?.id ?? null} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
