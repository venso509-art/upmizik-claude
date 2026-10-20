import type { SupabaseClient } from "@supabase/supabase-js";
import type { Track } from "@/components/player/PlayerProvider";
import { SONG_SELECT, toTrack, type SongRow } from "@/lib/songs";

export type TopEntry = { position: number; track: Track; plays: number };

// Top 3 admin nan chwazi a. Si li vid, nou pran 3 mizik ki pi koute yo otomatikman.
export async function getTop3(supabase: SupabaseClient): Promise<{ entries: TopEntry[]; auto: boolean }> {
  const { data: picked } = await supabase
    .from("top_songs")
    .select(`position, song:songs(${SONG_SELECT})`)
    .order("position")
    .returns<{ position: number; song: SongRow | null }[]>();

  const chosen = (picked ?? []).filter((r): r is { position: number; song: SongRow } => r.song !== null);
  if (chosen.length > 0) {
    return {
      auto: false,
      entries: chosen.map((r) => ({ position: r.position, track: toTrack(supabase, r.song), plays: r.song.play_count })),
    };
  }

  const { data: popular } = await supabase
    .from("songs")
    .select(SONG_SELECT)
    .order("play_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(3)
    .returns<SongRow[]>();

  return {
    auto: true,
    entries: (popular ?? []).map((s, i) => ({ position: i + 1, track: toTrack(supabase, s), plays: s.play_count })),
  };
}
