"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string };

// Bloke yon atis pou live yo pandan X jou (live k ap fèt la kanpe touswit)
export async function banLive(artistId: string, days: number, reason: string): Promise<Result> {
  const { error } = await createClient().rpc("admin_ban_live", { p_artist: artistId, p_days: Math.floor(days), p_reason: reason.trim() });
  if (error) return { error: error.message };
  revalidatePath("/admin/live");
  return {};
}

export async function unbanLive(artistId: string): Promise<Result> {
  const { error } = await createClient().rpc("admin_unban_live", { p_artist: artistId });
  if (error) return { error: error.message };
  revalidatePath("/admin/live");
  return {};
}

// Kanpe yon live san bloke atis la
export async function stopLive(liveId: string): Promise<Result> {
  const { error } = await createClient().rpc("end_live", { p_live: liveId });
  if (error) return { error: error.message };
  revalidatePath("/admin/live");
  return {};
}
