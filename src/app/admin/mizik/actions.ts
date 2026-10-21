"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { GENRES } from "@/lib/genres";
import { normalizeUrl } from "@/lib/links";

type Result = { error?: string };

async function adminClient() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (await isAdmin(supabase, user?.id)) ? supabase : null;
}

function refresh(artistId: string, songId: string) {
  revalidatePath("/", "layout");
  revalidatePath("/admin/mizik");
  revalidatePath(`/atis/${artistId}`);
  revalidatePath(`/chante/${songId}`);
}

// Admin modifye tit, jan, lyen YouTube, ak (si l vle) pochèt yon chante
export async function adminUpdateSong(
  songId: string,
  input: { title: string; genre: string; youtubeUrl: string; coverPath: string | null },
): Promise<Result> {
  const supabase = await adminClient();
  if (!supabase) return { error: "Se sèlman admin ki ka fè sa." };

  const title = input.title.trim();
  if (!title || title.length > 200) return { error: "Tit la dwe gen ant 1 ak 200 karaktè." };
  if (input.genre && !GENRES.includes(input.genre)) return { error: "Jan mizik sa a pa valid." };
  const youtubeUrl = normalizeUrl(input.youtubeUrl);
  if (youtubeUrl === undefined) return { error: "Lyen YouTube la pa valid." };

  const { data: song } = await supabase.from("songs").select("artist_id, cover_path").eq("id", songId).maybeSingle();
  if (!song) return { error: "Chante sa a pa jwenn." };
  if (input.coverPath && !input.coverPath.startsWith(`${song.artist_id}/`)) return { error: "Pochèt la pa valid." };

  const update: Record<string, string | null> = { title, genre: input.genre || null, youtube_url: youtubeUrl };
  if (input.coverPath) update.cover_path = input.coverPath;

  const { data, error } = await supabase.from("songs").update(update).eq("id", songId).select("id");
  if (error) return { error: `Modifikasyon an echwe: ${error.message}` };
  if (!data?.length) return { error: "Modifikasyon an pa pase. Èske migration admin_songs la kouri?" };

  // Ansyen pochèt la pa sèvi ankò
  if (input.coverPath && song.cover_path && song.cover_path !== input.coverPath) {
    await supabase.storage.from("covers").remove([song.cover_path]);
  }
  refresh(song.artist_id, songId);
  return {};
}

// Admin efase yon chante nèt (ak fichye odyo a ak pochèt la)
export async function adminDeleteSong(songId: string): Promise<Result> {
  const supabase = await adminClient();
  if (!supabase) return { error: "Se sèlman admin ki ka fè sa." };

  const { data, error } = await supabase.from("songs").delete().eq("id", songId).select("artist_id, audio_path, cover_path");
  if (error) return { error: `Efasman an echwe: ${error.message}` };
  const song = data?.[0];
  if (!song) return { error: "Efasman an pa pase. Èske migration admin_songs la kouri?" };

  await supabase.storage.from("audio").remove([song.audio_path]);
  if (song.cover_path) await supabase.storage.from("covers").remove([song.cover_path]);
  refresh(song.artist_id, songId);
  return {};
}
