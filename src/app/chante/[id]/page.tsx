import { FeaturingLinks } from "@/components/FeaturingLinks";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SONG_SELECT, formatDuration, getSongExtras, toTrack, type SongRow } from "@/lib/songs";
import { PlayAllButton } from "@/components/TrackList";
import { SongActions } from "@/components/SongActions";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Comments } from "@/components/Comments";
import { loadComments } from "@/lib/comments";
import { isAdmin } from "@/lib/admin";
import { RELEASE_LABELS, type ReleaseKind } from "@/lib/releases";

type Props = { params: { id: string } };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getSong(id: string) {
  if (!UUID_RE.test(id)) return null;
  const supabase = createClient();
  const { data } = await supabase
    .from("songs")
    .select(`${SONG_SELECT}, created_at`)
    .eq("id", id)
    .returns<(SongRow & { created_at: string })[]>()
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const song = await getSong(params.id);
  if (!song) return { title: "Chante pa jwenn | UpMizik" };
  return { title: `${song.title} – ${toTrack(createClient(), song).artistName} | UpMizik` };
}

export default async function SongPage({ params }: Props) {
  const song = await getSong(params.id);
  if (!song) notFound();

  const supabase = createClient();
  const track = toTrack(supabase, song);

  const { data: { user } } = await supabase.auth.getUser();
  const [extras, comments, admin, { data: rel }] = await Promise.all([
    getSongExtras(supabase, [song.id], user?.id ?? null),
    loadComments(supabase, { type: "song", id: song.id }, user?.id ?? null),
    isAdmin(supabase, user?.id),
    // EP / Mixtape / Album chante a fè pati (si migration piblikasyon an poko kouri, data = null)
    supabase.from("songs").select("track_number, release:releases(id, title, kind)").eq("id", song.id).maybeSingle(),
  ]);
  type Rel = { id: string; title: string; kind: ReleaseKind };
  const relRow = rel as { track_number: number | null; release: Rel | Rel[] | null } | null;
  const release = relRow ? (Array.isArray(relRow.release) ? relRow.release[0] : relRow.release) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <section className="flex flex-col items-center gap-8 text-center sm:flex-row sm:items-end sm:text-left">
        <div className="h-56 w-56 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-600/40 to-violet-800/40 shadow-2xl shadow-fuchsia-950/40">
          {track.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={track.coverUrl} alt={track.title} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-7xl">🎵</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium uppercase tracking-widest text-fuchsia-300">{release ? "Chante" : "🎵 Single"}</p>
          {release && (
            <Link
              href={`/albom/${release.id}`}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-citron-400/40 bg-citron-400/10 px-3 py-1 text-xs font-semibold text-citron-200 transition hover:bg-citron-400/20"
            >
              {RELEASE_LABELS[release.kind].icon} {RELEASE_LABELS[release.kind].label}: {release.title}
              {relRow?.track_number ? ` · #${relRow.track_number}` : ""} →
            </Link>
          )}
          <h1 className="mt-2 break-words text-4xl font-extrabold tracking-tight text-white sm:text-5xl">{track.title}</h1>
          <p className="mt-3 text-zinc-300">
            <Link href={`/atis/${track.artistId}`} className="font-semibold text-white hover:underline">
              {track.artistName}
              {track.artistVerified && <VerifiedBadge />}
            </Link>
            <FeaturingLinks artists={extras[song.id]?.featuring} className="font-semibold text-white" />
            {track.genre && <> · {track.genre}</>} · {formatDuration(track.durationSeconds)} ·{" "}
            {song.play_count.toLocaleString("fr-HT")} koute
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <PlayAllButton tracks={[track]} label="▶ Jwe" />
            <SongActions
              songId={song.id}
              title={track.title}
              artistId={track.artistId}
              artistName={track.artistName}
              extras={extras[song.id]}
              currentUserId={user?.id ?? null}
              size="lg"
              track={track}
            />
          </div>
        </div>
      </section>

      <div id="komante" className="mt-14 scroll-mt-24 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <Comments
          target={{ type: "song", id: song.id }}
          comments={comments}
          currentUserId={user?.id ?? null}
          canModerate={user?.id === song.artist_id || admin}
          placeholder="Kisa w panse de chante sa a?"
        />
      </div>
    </div>
  );
}
