"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Fonksyon SQL la verifye dwa admin nan, epi li aktive kont atis la si l apwouve
export async function reviewRegistration(id: string, approve: boolean, note = ""): Promise<{ error?: string }> {
  if (!approve && !note.trim()) return { error: "Eksplike poukisa w rejte l (atis la ap wè rezon sa a)." };

  const supabase = createClient();
  const { error } = await supabase.rpc("review_artist_registration", {
    p_id: id,
    p_approve: approve,
    p_note: approve ? null : note.trim(),
  });
  if (error) return { error: error.message };

  revalidatePath("/admin", "layout");
  revalidatePath("/dashboard");
  return {};
}
