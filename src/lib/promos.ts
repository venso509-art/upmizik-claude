import type { SupabaseClient } from "@supabase/supabase-js";
import type { Promo } from "@/components/promos/PromoSection";
import { youtubeId } from "@/lib/youtube";

type PromoRow = {
  id: string;
  title: string;
  kind: PromoKind;
  video_path: string | null; // fichye a (videyo OSWA imaj) nan bucket "promo-videos"
  youtube_url: string | null;
  is_active: boolean;
  position: number;
  artist_id: string;
  artist: { display_name: string; is_verified: boolean; archived_at: string | null } | null;
};

export const PROMO_SELECT =
  "id, title, kind, video_path, youtube_url, is_active, position, artist_id, artist:profiles!artist_promos_artist_id_fkey(display_name, is_verified, archived_at)";

export type PromoKind = "video" | "image" | "youtube";

// Fichye RPA yo aksepte: videyo (ak son ki koupe pa defo) ak imaj (GIF yo anime)
export const PROMO_MEDIA_TYPES: Record<string, { kind: "video" | "image"; mime: string }> = {
  mp4: { kind: "video", mime: "video/mp4" },
  m4v: { kind: "video", mime: "video/mp4" },
  webm: { kind: "video", mime: "video/webm" },
  mov: { kind: "video", mime: "video/quicktime" },
  gif: { kind: "image", mime: "image/gif" },
  jpg: { kind: "image", mime: "image/jpeg" },
  jpeg: { kind: "image", mime: "image/jpeg" },
  png: { kind: "image", mime: "image/png" },
  webp: { kind: "image", mime: "image/webp" },
};
export const PROMO_ACCEPT = Object.keys(PROMO_MEDIA_TYPES).map((e) => `.${e}`).join(",");
export const PROMO_MAX_BYTES = 50 * 1024 * 1024;

export function toPromo(supabase: SupabaseClient, r: PromoRow): Promo {
  const fileUrl = r.video_path ? supabase.storage.from("promo-videos").getPublicUrl(r.video_path).data.publicUrl : null;
  return {
    id: r.id,
    title: r.title,
    artistId: r.artist_id,
    artistName: r.artist?.display_name ?? "Atis",
    artistVerified: r.artist?.is_verified ?? false,
    videoUrl: r.kind === "video" ? fileUrl : null,
    imageUrl: r.kind === "image" ? fileUrl : null,
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
