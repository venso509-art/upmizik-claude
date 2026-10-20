import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SONG_SELECT, toTrack, type SongRow } from "@/lib/songs";
import { PlayAllButton, TrackList } from "@/components/TrackList";

type Props = { params: { id: string } };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getArtist(id: string) {
  if (!UUID_RE.test(id)) return null;
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, bio, avatar_url, role, created_at")
    .eq("id", id)
    .eq("role", "artist")
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const artist = await getArtist(params.id);
  return { title: artist ? `${artist.display_name} | UpMizik` : "Atis pa jwenn | UpMizik" };
}

export default async function ArtistPage({ params }: Props) {
  const artist = await getArtist(params.id);
  if (!artist) notFound();

  const supabase = createClient();
  const [{ data: rows }, { data: { user } }] = await Promise.all([
    supabase
      .from("songs")
      .select(SONG_SELECT)
      .eq("artist_id", artist.id)
      .order("created_at", { ascending: false })
      .returns<SongRow[]>(),
    supabase.auth.getUser(),
  ]);

  const songs = rows ?? [];
  const tracks = songs.map((s) => toTrack(supabase, s));
  const plays = Object.fromEntries(songs.map((s) => [s.id, s.play_count]));
  const totalPlays = songs.reduce((sum, s) => sum + s.play_count, 0);
  const isOwner = user?.id === artist.id;
  const initials = artist.display_name
    .split(/\s+/)
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const since = new Date(artist.created_at).getFullYear();

  return (
    <>
      {/* ===== BANYÈ ===== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-fuchsia-900/40 via-violet-950/30 to-zinc-950">
        <div className="pointer-events-none absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 pb-10 pt-16 text-center sm:flex-row sm:items-end sm:text-left">
          <div className="h-40 w-40 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-700 shadow-2xl shadow-black/50">
            {artist.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={artist.avatar_url} alt={artist.display_name} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center text-5xl font-extrabold text-white">{initials}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium uppercase tracking-widest text-fuchsia-300">🎤 Atis</p>
            <h1 className="mt-2 break-words text-4xl font-extrabold tracking-tight text-white sm:text-6xl">{artist.display_name}</h1>
            <p className="mt-3 text-sm text-zinc-300">
              <span className="font-semibold text-white">{songs.length}</span> chante ·{" "}
              <span className="font-semibold text-white">{totalPlays.toLocaleString("fr-HT")}</span> koute · Sou UpMizik depi {since}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        {artist.bio && <p className="mb-8 max-w-2xl whitespace-pre-line text-zinc-300">{artist.bio}</p>}

        {tracks.length > 0 ? (
          <>
            <div className="mb-6">
              <PlayAllButton tracks={tracks} />
            </div>
            <TrackList tracks={tracks} plays={plays} />
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center">
            <p className="text-4xl">🎶</p>
            <p className="mt-4 font-semibold text-white">
              {isOwner ? "Ou poko pibliye okenn chante." : `${artist.display_name} poko pibliye okenn chante.`}
            </p>
            {isOwner && (
              <Link
                href="/upload"
                className="mt-6 inline-block rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 px-6 py-3 font-semibold text-white"
              >
                + Pibliye premye chante w
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  );
}
