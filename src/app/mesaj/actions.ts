"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Make kèk mesaj kòm li (lè moun nan louvri yo)
export async function markRead(ids: string[]) {
  if (!ids.length) return;
  await createClient().rpc("mark_notifications_read", { p_ids: ids });
  revalidatePath("/", "layout");
}

export async function markAllRead() {
  await createClient().rpc("mark_notifications_read", { p_ids: null });
  // Rafrechi badj 🔔 nan header a sou tout paj yo
  revalidatePath("/", "layout");
}

export async function deleteNotification(id: string): Promise<{ error?: string }> {
  const { error } = await createClient().from("notifications").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/mesaj");
  return {};
}
