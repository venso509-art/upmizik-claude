import type { SupabaseClient } from "@supabase/supabase-js";
import type { Promo } from "@/components/promos/PromoSection";
import { youtubeId } from "@/lib/youtube";

type PromoRow = {
  id: string;
  title: string;
  kind: "video" | "youtube";
  video_path: string | null;
  youtube_url: string | null;
  is_active: boolean;
  position: number;
  artist_id: string;
  artist: { display_name: string; is_verified: boolean; archived_at: string | null } | null;
};

export const PROMO_SELECT =
  "id, title, kind, video_path, youtube_url, is_active, position, artist_id, artist:profiles!artist_promos_artist_id_fkey(display_name, is_verified, archived_at)";

export function toPromo(supabase: SupabaseClient, r: PromoRow): Promo {
  return {
    id: r.id,
    title: r.title,
    artistId: r.artist_id,
    artistName: r.artist?.display_name ?? "Atis",
    artistVerified: r.artist?.is_verified ?? false,
    videoUrl: r.kind === "video" && r.video_path ? supabase.storage.from("promo-videos").getPublicUrl(r.video_path).data.publicUrl : null,
    youtubeId: r.kind === "youtube" ? youtubeId(r.youtube_url) : null,
    youtubeUrl: r.kind === "youtube" ? r.youtube_url : null,
  };
}

// RPA aktif yo pou paj akèy la, nan lòd admin nan chwazi a (san atis achive)
export async function getActivePromos(supabase: SupabaseClient): Promise<Promo[]> {
  const { data } = await supabase
    .from("artist_promos")
    .select(PROMO_SELECT)
    .eq("is_active", true)
    .order("position")
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<PromoRow[]>();
  return (data ?? []).filter((r) => !r.artist?.archived_at).map((r) => toPromo(supabase, r));
}

export type { PromoRow };
