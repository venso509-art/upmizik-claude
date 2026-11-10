import type { SupabaseClient } from "@supabase/supabase-js";

// Pri ak "deja achte" pou yon lis chante (pou bouton 🧺 akote chak chante).
// Chante yon pwojè ki vann an antye sèlman pa parèt isit la (yo achte sou paj pwojè a).
// Si migration vant lan poko kouri, map la vid.
export type SaleInfo = { price: number; owned: boolean; mine?: boolean }; // mine: atis la sou pwòp paj li (etikèt, pa bouton)

export async function loadSaleMap(supabase: SupabaseClient, songIds: string[], userId: string | null): Promise<Record<string, SaleInfo>> {
  if (songIds.length === 0) return {};
  type Rel = { sale_price: number | null; sell_tracks: boolean };
  const { data, error } = await supabase
    .from("songs")
    .select("id, sale_price, release_id, release:releases(sale_price, sell_tracks)")
    .in("id", songIds)
    .not("sale_price", "is", null);
  if (error || !data?.length) return {};

  const rows = data as { id: string; sale_price: number; release_id: string | null; release: Rel | Rel[] | null }[];
  let ownedSongs = new Set<string>();
  let ownedReleases = new Set<string>();
  if (userId) {
    const { data: bought } = await supabase.from("music_purchases").select("song_id, release_id").eq("buyer_id", userId);
    ownedSongs = new Set((bought ?? []).map((b) => b.song_id).filter(Boolean) as string[]);
    ownedReleases = new Set((bought ?? []).map((b) => b.release_id).filter(Boolean) as string[]);
  }

  const map: Record<string, SaleInfo> = {};
  for (const r of rows) {
    const rel = Array.isArray(r.release) ? r.release[0] : r.release;
    if (rel?.sale_price && !rel.sell_tracks) continue; // pwojè a vann an antye sèlman
    map[r.id] = { price: r.sale_price, owned: ownedSongs.has(r.id) || (!!r.release_id && ownedReleases.has(r.release_id)) };
  }
  return map;
}
