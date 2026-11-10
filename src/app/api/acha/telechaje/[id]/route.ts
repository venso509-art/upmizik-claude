import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ⬇️ Telechaje yon chante moun nan achte (oswa yon chante ki pa an vant).
// Baz done a verifye dwa a (can_download), answit nou voye fichye a ak yon bon non: « Atis - Tit.mp3 »
export async function GET(request: Request, { params }: { params: { id: string } }) {
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Chante a pa valid" }, { status: 400 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/konekte", request.url));

  const { data: allowed } = await supabase.rpc("can_download", { p_song: params.id });
  if (allowed !== true) return NextResponse.redirect(new URL(`/chante/${params.id}`, request.url));

  const { data: song } = await supabase
    .from("songs")
    .select("title, audio_path, profiles!songs_artist_id_fkey(display_name)")
    .eq("id", params.id)
    .maybeSingle<{ title: string; audio_path: string; profiles: { display_name: string } | { display_name: string }[] | null }>();
  if (!song) return NextResponse.json({ error: "Chante a pa jwenn" }, { status: 404 });

  const artist = (Array.isArray(song.profiles) ? song.profiles[0] : song.profiles)?.display_name ?? "UpMizik";
  const ext = song.audio_path.split(".").pop() ?? "mp3";
  const name = `${artist} - ${song.title}`.replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 120) + `.${ext}`;
  const url = supabase.storage.from("audio").getPublicUrl(song.audio_path, { download: name }).data.publicUrl;
  return NextResponse.redirect(url);
}
