"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { GENRES } from "@/lib/genres";

export type SongActionResult = { error?: string };

// Chache chante a SÈLMAN si li pou itilizatè ki konekte a
async function getOwnSong(songId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, song: null };

  const { data: song } = await supabase
    .from("songs")
    .select("id, artist_id, audio_path, cover_path")
    .eq("id", songId)
    .eq("artist_id", user.id)
    .maybeSingle();

  return { supabase, user, song };
}

function refresh(artistId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/");
  revalidatePath(`/atis/${artistId}`);
}

export async function updateSong(songId: string, title: string, genre: string): Promise<SongActionResult> {
  const cleanTitle = title.trim();
  if (!cleanTitle || cleanTitle.length > 200) return { error: "Tit la dwe gen ant 1 ak 200 karaktè." };
  if (genre && !GENRES.includes(genre)) return { error: "Jan mizik sa a pa valid." };

  const { supabase, user, song } = await getOwnSong(songId);
  if (!user) return { error: "Ou dwe konekte." };
  if (!song) return { error: "Chante sa a pa egziste oswa li pa pou ou." };

  const { error } = await supabase
    .from("songs")
    .update({ title: cleanTitle, genre: genre || null })
    .eq("id", songId);
  if (error) return { error: `Modifikasyon an echwe: ${error.message}` };

  refresh(user.id);
  return {};
}

export async function deleteSong(songId: string): Promise<SongActionResult> {
  const { supabase, user, song } = await getOwnSong(songId);
  if (!user) return { error: "Ou dwe konekte." };
  if (!song) return { error: "Chante sa a pa egziste oswa li pa pou ou." };

  const { error } = await supabase.from("songs").delete().eq("id", songId);
  if (error) return { error: `Efasman an echwe: ${error.message}` };

  // Efase fichye yo nan depo a tou, pou yo pa pran plas pou granmesi
  await supabase.storage.from("audio").remove([song.audio_path]);
  if (song.cover_path) await supabase.storage.from("covers").remove([song.cover_path]);

  refresh(user.id);
  return {};
}
