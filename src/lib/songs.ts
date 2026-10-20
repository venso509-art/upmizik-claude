import type { SupabaseClient } from "@supabase/supabase-js";
import type { Track } from "@/components/player/PlayerProvider";

// Kolòn nou chaje pou chak chante (ak non atis la)
export const SONG_SELECT =
  "id, title, genre, artist_id, audio_path, cover_path, duration_seconds, play_count, profiles(display_name)";

export type SongRow = {
  id: string;
  title: string;
  genre: string | null;
  artist_id: string;
  audio_path: string;
  cover_path: string | null;
  duration_seconds: number | null;
  play_count: number;
  profiles: { display_name: string } | { display_name: string }[] | null;
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
    coverUrl: s.cover_path ? supabase.storage.from("covers").getPublicUrl(s.cover_path).data.publicUrl : null,
    audioUrl: supabase.storage.from("audio").getPublicUrl(s.audio_path).data.publicUrl,
    durationSeconds: s.duration_seconds,
  };
}

export function formatDuration(seconds: number | null) {
  if (!seconds) return "--:--";
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}
