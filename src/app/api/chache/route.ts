import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SONG_SELECT, toTrack, type SongRow } from "@/lib/songs";

export type Suggestions = {
  artists: { id: string; name: string; avatarUrl: string | null; verified: boolean }[];
  songs: { id: string; title: string; artistName: string; coverUrl: string | null; genre: string | null }[];
};

// Sijesyon rapid pou ba rechèch header a (kèk atis + kèk chante)
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  const empty: Suggestions = { artists: [], songs: [] };
  if (q.length < 2) return NextResponse.json(empty);

  const supabase = createClient();
  const [artistRes, songRes] = await Promise.all([
    supabase.rpc("search_artists", { p_q: q, p_limit: 4 }),
    supabase.rpc("search_songs", { p_q: q, p_limit: 6 }),
  ]);

  const ids = ((songRes.data ?? []) as { id: string }[]).map((r) => r.id);
  let rows: SongRow[] = [];
  if (ids.length) {
    const { data } = await supabase.from("songs").select(SONG_SELECT).in("id", ids).returns<SongRow[]>();
    const byId = new Map((data ?? []).map((s) => [s.id, s]));
    rows = ids.map((id) => byId.get(id)).filter((s): s is SongRow => !!s);
  }

  const result: Suggestions = {
    artists: ((artistRes.data ?? []) as { artist_id: string; display_name: string; avatar_url: string | null; is_verified: boolean }[]).map((a) => ({
      id: a.artist_id,
      name: a.display_name,
      avatarUrl: a.avatar_url,
      verified: a.is_verified,
    })),
    songs: rows.map((s) => {
      const t = toTrack(supabase, s);
      return { id: t.id, title: t.title, artistName: t.artistName, coverUrl: t.coverUrl, genre: t.genre };
    }),
  };
  return NextResponse.json(result, { headers: { "Cache-Control": "private, max-age=30" } });
}
