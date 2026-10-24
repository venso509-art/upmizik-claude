import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SONG_SELECT, formatDuration, toTrack, type SongRow } from "@/lib/songs";
import { PlayAllButton, TrackList } from "@/components/TrackList";
import { SafeImage } from "@/components/SafeImage";
import { ShareLinkButton } from "@/components/donate/ShareLinkButton";
import { releaseShareText } from "@/lib/shareMessages";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { RELEASE_LABELS, type ReleaseKind } from "@/lib/releases";

type Props = { params: { id: string } };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ReleaseRow = {
  id: string;
  title: string;
  kind: ReleaseKind;
  created_at: string;
  artist_id: string;
  artist: { display_name: string; is_verified: boolean } | { display_name: string; is_verified: boolean }[] | null;
};

async function getRelease(id: string) {
  if (!UUID_RE.test(id)) return null;
  const supabase = createClient();
  const { data: release } = await supabase
    .from("releases")
    .select("id, title, kind, created_at, artist_id, artist:profiles!releases_artist_id_fkey(display_name, is_verified)")
    .eq("id", id)
    .maybeSingle<ReleaseRow>();
  if (!release) return null;
  const { data: rows } = await supabase
    .from("songs")
    .select(`${SONG_SELECT}, track_number`)
    .eq("release_id", id)
    .is("archived_at", null)
    .order("track_number", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .returns<(SongRow & { track_number: number | null })[]>();
  const artist = Array.isArray(release.artist) ? release.artist[0] : release.artist;
  return { release, artist, songs: rows ?? [], tracks: (rows ?? []).map((s) => toTrack(supabase, s)) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getRelease(params.id);
  if (!data) return { title: "Piblikasyon pa jwenn | UpMizik" };
  const label = RELEASE_LABELS[data.release.kind].label;
  const title = `${data.release.title} (${label}) – ${data.artist?.display_name ?? "Atis"} | UpMizik`;
  const description = `${label} ${data.artist?.display_name ?? ""}: ${data.tracks.length} chante. Koute l gratis sou UpMizik.`;
  const image = data.tracks.find((t) => t.coverUrl)?.coverUrl;
  return { title, description, openGraph: { title, description, images: [{ url: image ?? "/og.jpg" }] } };
}

export default async function ReleasePage({ params }: Props) {
  const data = await getRelease(params.id);
  if (!data) notFound();
  const { release, artist, songs, tracks } = data;
  const label = RELEASE_LABELS[release.kind];
  const cover = tracks.find((t) => t.coverUrl)?.coverUrl ?? null;
  const plays = Object.fromEntries(songs.map((s) => [s.id, s.play_count]));
  const totalPlays = songs.reduce((t, s) => t + s.play_count, 0);
  const totalSeconds = songs.reduce((t, s) => t + (s.duration_seconds ?? 0), 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <section className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-end sm:text-left">
        <div className="h-52 w-52 shrink-0 overflow-hidden rounded-2xl shadow-2xl shadow-black/60 ring-1 ring-white/10">
          <SafeImage
            src={cover}
            alt={release.title}
            className="h-full w-full object-cover"
            fallback={
              <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-fuchsia-700 to-violet-900 text-6xl">{label.icon}</span>
            }
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-widest text-citron-300">
            {label.icon} {label.label}
          </p>
          <h1 className="mt-2 break-words text-4xl font-black tracking-tight text-white sm:text-5xl">{release.title}</h1>
          <p className="mt-3 text-sm text-zinc-300">
            <Link href={`/atis/${release.artist_id}`} className="font-semibold text-white hover:underline">
              {artist?.display_name ?? "Atis"}
              {artist?.is_verified && <VerifiedBadge />}
            </Link>
            {" · "}
            {new Date(release.created_at).getFullYear()} · {tracks.length} chante
            {totalSeconds > 0 && ` · ${Math.round(totalSeconds / 60)} min`} · 🎧 {totalPlays.toLocaleString("fr-HT")}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            {tracks.length > 0 && <PlayAllButton tracks={tracks} label="▶ Jwe tout" />}
            <ShareLinkButton
              path={`/albom/${release.id}`}
              label="🔗 Pataje"
              title={`${release.title} – ${artist?.display_name ?? ""} sou UpMizik`}
              text={releaseShareText(label.label, release.title, artist?.display_name ?? "atis la")}
            />
          </div>
        </div>
      </section>

      <section className="mt-10">
        {tracks.length > 0 ? (
          <TrackList tracks={tracks} plays={plays} />
        ) : (
          <p className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center text-zinc-400">
            {label.icon} Pa gen chante nan {label.label} sa a pou kounye a.
          </p>
        )}
        {totalSeconds > 0 && <p className="mt-4 text-right text-xs text-zinc-500">Dire total: {formatDuration(totalSeconds)}</p>}
      </section>
    </div>
  );
}
