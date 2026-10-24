import type { SupabaseClient } from "@supabase/supabase-js";

// Atis ki an live kounye a: { artist_id: live_id } (vid si migration live la poko kouri)
export async function liveNowMap(supabase: SupabaseClient): Promise<Record<string, string>> {
  const { data } = await supabase.rpc("live_now");
  const map: Record<string, string> = {};
  for (const r of (data ?? []) as { live_id: string; artist_id: string }[]) map[r.artist_id] ??= r.live_id;
  return map;
}
