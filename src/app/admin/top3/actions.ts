"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// songIds = [mizik #1, mizik #2, mizik #3]; null = plas sa a vid. [] = mòd otomatik.
export async function saveTop3(songIds: (string | null)[]): Promise<{ error?: string }> {
  const chosen = songIds.filter(Boolean);
  if (new Set(chosen).size !== chosen.length) return { error: "Menm mizik la pa ka nan 2 plas." };

  const supabase = createClient();
  // Fonksyon SQL la verifye dwa admin nan
  const { error } = await supabase.rpc("set_top_songs", { p_song_ids: songIds });
  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/admin/top3");
  return {};
}
