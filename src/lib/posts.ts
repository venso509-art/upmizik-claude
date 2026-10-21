// ===== UpMizik Sosyal: pòs atis yo (migration 20261113000000_social_posts.sql + 20261115000000_post_media.sql) =====
import type { SupabaseClient } from "@supabase/supabase-js";
import { youtubeId, youtubeThumbnail } from "@/lib/youtube";

export const POST_MAX_LENGTH = 2000;
export const POST_LIFETIME_DAYS = 30;

export type PostStatus = "active" | "blocked" | "deleted";

export const POST_IMAGE_SIZE = 800; // imaj yo koupe kare 800 × 800 (tankou yon foto pwofil WhatsApp)
export const POST_IMAGE_MAX_INPUT_BYTES = 15 * 1024 * 1024; // foto orijinal la (anvan nou rapetise l)

export type FeedPost = {
  id: string;
  content: string;
  image_path: string | null;
  link_url: string | null;
  image_url?: string | null; // kalkile sou sèvè a apati image_path
  created_at: string;
  expires_at: string;
  artist_id: string;
  artist_name: string;
  artist_avatar: string | null;
  artist_verified: boolean;
};

// Ajoute lyen piblik imaj la sou chak pòs
export function withImageUrls(supabase: SupabaseClient, posts: FeedPost[]): FeedPost[] {
  return posts.map((p) => ({ ...p, image_url: postImageUrl(supabase, p.image_path) }));
}

export function postImageUrl(supabase: SupabaseClient, path: string | null) {
  return path ? supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl : null;
}

// Enfòmasyon pou afiche yon lyen: domèn nan, ak imaj YouTube la si se yon videyo YouTube
export function linkInfo(url: string) {
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {}
  const yt = youtubeId(url);
  return { host, youtubeId: yt, thumbnail: yt ? youtubeThumbnail(yt) : null };
}

// Koupe yon foto an kare (nan mitan an) epi rapetise l an JPEG 800 × 800
export async function cropSquare(file: File, size = POST_IMAGE_SIZE): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = Math.min(size, side);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Navigatè a pa ka trete imaj la.");
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Imaj la pa ka prepare."))), "image/jpeg", 0.85),
  );
}

const DAY = 24 * 60 * 60 * 1000;

// Konbyen jou ki rete anvan pòs la disparèt (0 = li ekspire)
export function daysLeft(expiresAt: string, now = Date.now()) {
  const ms = new Date(expiresAt).getTime() - now;
  return ms <= 0 ? 0 : Math.ceil(ms / DAY);
}

export function daysLeftLabel(expiresAt: string, now = Date.now()) {
  const d = daysLeft(expiresAt, now);
  if (d === 0) return "Ekspire";
  if (d === 1) return "Dènye jou";
  return `${d} jou rete`;
}

// "kounye a", "5 min", "3 è", "2 jou"
export function timeAgo(date: string, now = Date.now()) {
  const s = Math.max(0, Math.floor((now - new Date(date).getTime()) / 1000));
  if (s < 60) return "kounye a";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} è`;
  return `${Math.floor(s / 86400)} jou`;
}

// Estati yon pòs jan admin nan oswa atis la wè l
export function postState(status: PostStatus, expiresAt: string, now = Date.now()) {
  if (status === "blocked") return { label: "Bloke", tone: "red" as const };
  if (status === "deleted") return { label: "Retire", tone: "zinc" as const };
  if (daysLeft(expiresAt, now) === 0) return { label: "Ekspire", tone: "amber" as const };
  return { label: daysLeftLabel(expiresAt, now), tone: "green" as const };
}
