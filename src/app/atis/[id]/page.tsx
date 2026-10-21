import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SONG_SELECT, toTrack, type SongRow } from "@/lib/songs";
import { PlayAllButton, TrackList } from "@/components/TrackList";
import { DonateButton } from "@/components/donate/DonateButton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { TrophyCase } from "@/components/TrophyCase";
import { computeTrophies, type TrophyStats } from "@/lib/trophies";

type Props = { params: { id: string } };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Artist = {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  is_verified?: boolean;
  location?: string | null;
  influences?: string | null;
  vision?: string | null;
  youtube_url?: string | null;
  instagram_url?: string | null;
  banner_url?: string | null;
};

const BASE_COLUMNS = "id, display_name, bio, avatar_url, created_at, is_verified";
const EXTRA_COLUMNS = "location, influences, vision, youtube_url, instagram_url";

async function getArtist(id: string): Promise<Artist | null> {
  if (!UUID_RE.test(id)) return null;
  const supabase = createClient();
  const query = (columns: string) =>
    supabase.from("profiles").select(columns).eq("id", id).eq("role", "artist").is("archived_at", null).maybeSingle<Artist>();

  // Si nouvo kolòn yo poko egziste (migration poko kouri), eseye ak mwens kolòn
  for (const columns of [`${BASE_COLUMNS}, ${EXTRA_COLUMNS}, banner_url`, `${BASE_COLUMNS}, ${EXTRA_COLUMNS}`]) {
    const res = await query(columns);
    if (!res.error) return res.data;
  }
  return (await query(BASE_COLUMNS)).data;
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-full border border-zinc-700 bg-zinc-900/60 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white"
    >
      {children}
    </a>
  );
}

function AboutCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <h2 className="flex items-center gap-2 font-bold text-white">
        <span>{icon}</span> {title}
      </h2>
      <p className="mt-3 whitespace-pre-line break-words text-zinc-300">{text}</p>
    </div>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const artist = await getArtist(params.id);
  return { title: artist ? `${artist.display_name} | UpMizik` : "Atis pa jwenn | UpMizik" };
}

export default async function ArtistPage({ params }: Props) {
  const artist = await getArtist(params.id);
  if (!artist) notFound();

  const supabase = createClient();
  const [{ data: rows }, { data: { user } }, { data: trophyRows }] = await Promise.all([
    supabase
      .from("songs")
      .select(SONG_SELECT)
      .eq("artist_id", artist.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .returns<SongRow[]>(),
    supabase.auth.getUser(),
    // Si migration trofe a poko kouri, data = null epi vitrin nan pa parèt
    supabase.rpc("artist_trophy_stats", { p_artist: artist.id }),
  ]);
  const trophyStats = ((trophyRows ?? []) as TrophyStats[])[0] ?? null;

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
        {artist.banner_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={artist.banner_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            {/* Fonse anba a pou tèks la toujou li byen sou nenpòt foto */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/10" />
          </>
        ) : (
          <div className="pointer-events-none absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-fuchsia-600/20 blur-3xl" />
        )}
        <div
          className={`relative mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 pb-10 text-center sm:flex-row sm:items-end sm:text-left ${
            artist.banner_url ? "pt-32 sm:pt-48" : "pt-16"
          }`}
        >
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
            <h1 className="mt-2 break-words text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
              {artist.display_name}
              {artist.is_verified && <VerifiedBadge size="lg" />}
            </h1>
            <p className="mt-3 text-sm text-zinc-300">
              <span className="font-semibold text-white">{songs.length}</span> chante ·{" "}
              <span className="font-semibold text-white">{totalPlays.toLocaleString("fr-HT")}</span> koute · Sou UpMizik depi {since}
              {artist.location && <> · 📍 {artist.location}</>}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
              {artist.youtube_url && <LinkButton href={artist.youtube_url}>▶ YouTube</LinkButton>}
              {artist.instagram_url && <LinkButton href={artist.instagram_url}>📸 Instagram</LinkButton>}
              <DonateButton
                artistId={artist.id}
                artistName={artist.display_name}
                label={`Sipòte ${artist.display_name}`}
                className="inline-flex items-center gap-2 rounded-full btn-primary px-4 py-2 text-sm font-semibold transition"
              />
              {isOwner && (
                <Link href="/pwofil" className="rounded-full border border-dashed border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition hover:text-white">
                  ✏️ Modifye pwofil
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        {(artist.bio || artist.influences || artist.vision) && (
          <div className="mb-10 grid gap-4 md:grid-cols-3">
            {artist.bio && <AboutCard icon="📖" title="Biyografi" text={artist.bio} />}
            {artist.influences && <AboutCard icon="🌟" title="Atis ki enspire m" text={artist.influences} />}
            {artist.vision && <AboutCard icon="🎯" title="Vizyon mwen pou mizik" text={artist.vision} />}
          </div>
        )}

        {trophyStats && <TrophyCase trophies={computeTrophies(trophyStats)} isOwner={isOwner} />}

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
                className="mt-6 inline-block rounded-full btn-primary px-6 py-3 font-semibold"
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
