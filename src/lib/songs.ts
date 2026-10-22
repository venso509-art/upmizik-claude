import type { SupabaseClient } from "@supabase/supabase-js";
import type { Track } from "@/components/player/PlayerProvider";

// Kolòn nou chaje pou chak chante (ak non atis la).
// "!songs_artist_id_fkey" di Supabase pran pwofil ATIS la, pa moun ki like chante a
// (tablo song_likes la kreye yon dezyèm chemen ant songs ak profiles).
export const SONG_SELECT =
  "id, title, genre, artist_id, audio_path, cover_path, duration_seconds, play_count, profiles!songs_artist_id_fkey(display_name, is_verified)";

type ArtistRef = { display_name: string; is_verified?: boolean };

export type SongRow = {
  id: string;
  title: string;
  genre: string | null;
  artist_id: string;
  audio_path: string;
  cover_path: string | null;
  duration_seconds: number | null;
  play_count: number;
  profiles: ArtistRef | ArtistRef[] | null;
};

// Konvèti yon liy baz done an Track pou lektè a (ak lyen piblik fichye yo)
export function toTrack(supabase: SupabaseClient, s: SongRow): Track {
  const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
  return {
    id: s.id,
    title: s.title,
    genre: s.genre,
    artistId: s.artist_id,
    artistName: profile?.display_name ?? "Atis enkoni",
    artistVerified: profile?.is_verified ?? false,
    coverUrl: s.cover_path ? supabase.storage.from("covers").getPublicUrl(s.cover_path).data.publicUrl : null,
    audioUrl: supabase.storage.from("audio").getPublicUrl(s.audio_path).data.publicUrl,
    durationSeconds: s.duration_seconds,
    playCount: s.play_count,
  };
}

export type FeaturedArtist = { id: string; name: string; verified: boolean };

export type SongExtras = {
  likeCount: number;
  liked: boolean;
  commentCount: number;
  songYoutubeUrl: string | null; // lyen chante a li menm
  youtubeUrl: string | null; // lyen chante a, oswa chanèl atis la
  featuring: FeaturedArtist[]; // atis featuring yo (non sèlman, san pousantaj)
  shareCount?: number; // kantite fwa moun pataje chante a
};

type ProfileLinks = { youtube_url: string | null };

// Chaje likes, kòmantè ak lyen yo pou yon lis chante.
// Chak demann endepandan: si youn echwe (pa egzanp yon migration ki poko kouri),
// chante yo parèt kanmenm, jis san enfòmasyon sa a.
export async function getSongExtras(
  supabase: SupabaseClient,
  songIds: string[],
  userId: string | null,
): Promise<Record<string, SongExtras>> {
  const result: Record<string, SongExtras> = Object.fromEntries(
    songIds.map((id) => [id, { likeCount: 0, liked: false, commentCount: 0, songYoutubeUrl: null, youtubeUrl: null, featuring: [] }]),
  );
  if (songIds.length === 0) return result;

  const [likes, comments, links, mine, feat, shares] = await Promise.all([
    supabase.from("songs").select("id, song_likes(count)").in("id", songIds),
    supabase.from("songs").select("id, comments(count)").in("id", songIds),
    supabase.from("songs").select("id, youtube_url, profiles!songs_artist_id_fkey(youtube_url)").in("id", songIds),
    userId
      ? supabase.from("song_likes").select("song_id").eq("user_id", userId).in("song_id", songIds)
      : Promise.resolve({ data: [] as { song_id: string }[] }),
    supabase.rpc("song_featuring", { p_song_ids: songIds }),
    // Kantite pataj (si migration kontè pataj la poko kouri, li rete 0)
    supabase.from("songs").select("id, share_count").in("id", songIds),
  ]);

  for (const row of (shares.data ?? []) as { id: string; share_count: number }[]) {
    if (result[row.id]) result[row.id].shareCount = row.share_count;
  }

  for (const row of (feat.data ?? []) as { song_id: string; artist_id: string; display_name: string; is_verified: boolean }[]) {
    result[row.song_id]?.featuring.push({ id: row.artist_id, name: row.display_name, verified: row.is_verified });
  }

  for (const row of (likes.data ?? []) as { id: string; song_likes: { count: number }[] }[]) {
    result[row.id].likeCount = row.song_likes?.[0]?.count ?? 0;
  }
  for (const row of (comments.data ?? []) as { id: string; comments: { count: number }[] }[]) {
    result[row.id].commentCount = row.comments?.[0]?.count ?? 0;
  }
  for (const row of (links.data ?? []) as { id: string; youtube_url: string | null; profiles: ProfileLinks | ProfileLinks[] | null }[]) {
    const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    result[row.id].songYoutubeUrl = row.youtube_url;
    result[row.id].youtubeUrl = row.youtube_url ?? p?.youtube_url ?? null;
  }
  for (const row of mine.data ?? []) {
    if (result[row.song_id]) result[row.song_id].liked = true;
  }
  return result;
}

export function formatDuration(seconds: number | null) {
  if (!seconds) return "--:--";
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}
