"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Fonksyon SQL yo verifye dwa admin nan

export async function setVerified(artistId: string, verified: boolean): Promise<{ error?: string }> {
  const { error } = await createClient().rpc("set_artist_verified", { p_artist_id: artistId, p_verified: verified });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return {};
}

export async function markPlaqueShipped(eventId: string, note: string): Promise<{ error?: string }> {
  const { error } = await createClient().rpc("mark_plaque_shipped", { p_event_id: eventId, p_note: note });
  if (error) return { error: error.message };
  revalidatePath("/admin/nivo");
  return {};
}
