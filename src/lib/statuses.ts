// ===== Stati atis yo (tankou WhatsApp): 24 è, 5 pa jou, atis Pro sèlman =====
// Baz done: migration 20261202000000_artist_statuses.sql (tablo artist_statuses + bucket "statuses").
import type { SupabaseClient } from "@supabase/supabase-js";

export type StatusKind = "text" | "image" | "video" | "audio";

// Sticker oswa lejand sou foto/videyo a. x, y = sant li an % kad la; s = gwosè an % lajè kad la
export type OverlayItem = { t: "sticker" | "text"; v: string; x: number; y: number; s: number; c?: string };
export type StatusOverlay = { items: OverlayItem[] };

export type ArtistStatus = {
  id: string;
  artist_id: string;
  kind: StatusKind;
  media_path: string | null;
  body: string | null;
  bg: string | null;
  created_at: string;
  expires_at: string;
  // Editè a (migration 20261203000000): null/50 si migration nan poko kouri
  overlay?: StatusOverlay | null;
  focus_x?: number;
  focus_y?: number;
  trim_start?: number | null;
  trim_end?: number | null;
};

// Fòma stati foto/videyo yo (tankou WhatsApp/Instagram)
export const STATUS_ASPECT = 9 / 16;

// Pakè stickers editè a
export const STICKER_PACKS: { name: string; icon: string; items: string[] }[] = [
  { name: "Mizik", icon: "🎵", items: ["🎵", "🎶", "🎤", "🎧", "🎼", "📻", "💿", "📀", "🔊", "🎙️", "🪩", "🎚️"] },
  { name: "Jwa", icon: "😂", items: ["😂", "🥳", "🎉", "😍", "🤩", "✨", "💃", "🕺", "🙌", "🔥", "💯", "❤️"] },
  { name: "Enstriman", icon: "🎸", items: ["🎸", "🎹", "🥁", "🎷", "🎺", "🎻", "🪕", "🪘", "🪗", "🪇", "🪈", "🔔"] },
  { name: "Machin", icon: "🚗", items: ["🚗", "🏎️", "🚙", "🚕", "🏍️", "🛵", "🚌", "🚐", "🚀", "✈️", "🚤", "🛻"] },
  { name: "Komik", icon: "🤪", items: ["🤪", "😜", "🤡", "👻", "😎", "🙈", "💥", "🤯", "🥴", "👀", "🤑", "🫠"] },
  { name: "Ayiti", icon: "🇭🇹", items: ["🇭🇹", "🌴", "☀️", "🥥", "🌺", "🏝️", "🌊", "🍍", "🥭", "⛰️", "🌶️", "🐓"] },
];

export const LEGEND_COLORS = ["#FFFFFF", "#FFD700", "#22C55E", "#F43F5E", "#38BDF8", "#0B132B"];

// Repons rapid (tankou WhatsApp)
export const QUICK_REACTIONS = ["❤️", "🔥", "😂", "😍", "👏", "🙏"];

export const STATUSES_PER_DAY = 5;
export const STATUS_MAX_BYTES = 30 * 1024 * 1024;
export const STATUS_TEXT_MAX = 500;

// Koulè fon pou stati tèks yo
export const STATUS_BACKGROUNDS = ["#0A5C36", "#0B132B", "#7C3AED", "#BE123C", "#B45309", "#0369A1", "#111827"];

// Kalite fichye (menm lis ak bucket la)
export const STATUS_MEDIA: Record<Exclude<StatusKind, "text">, { accept: string; types: Record<string, string> }> = {
  image: { accept: ".jpg,.jpeg,.png,.webp,.gif", types: { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" } },
  video: { accept: ".mp4,.mov,.webm", types: { mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm" } },
  audio: {
    accept: ".mp3,.m4a,.aac,.ogg,.wav,.webm",
    types: { mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", ogg: "audio/ogg", wav: "audio/wav", webm: "audio/webm" },
  },
};

// Konbyen tan yon stati tèks oswa foto rete sou ekran an (videyo/odyo: dire fichye a)
export const STATUS_SECONDS = 10;

export function statusMediaUrl(supabase: SupabaseClient, path: string | null) {
  return path ? supabase.storage.from("statuses").getPublicUrl(path).data.publicUrl : null;
}

// Stati vivan yon atis (pi ansyen an premye, tankou WhatsApp)
export const STATUS_COLUMNS = "id, artist_id, kind, media_path, body, bg, created_at, expires_at";
export const STATUS_EDITOR_COLUMNS = `${STATUS_COLUMNS}, overlay, focus_x, focus_y, trim_start, trim_end`;

export async function loadArtistStatuses(supabase: SupabaseClient, artistId: string) {
  const query = (cols: string) =>
    supabase
      .from("artist_statuses")
      .select(cols)
      .eq("artist_id", artistId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .returns<ArtistStatus[]>();
  const full = await query(STATUS_EDITOR_COLUMNS);
  // Si migration editè a poko kouri, chaje stati yo san stickers
  return (full.error ? (await query(STATUS_COLUMNS)).data : full.data) ?? [];
}

// Pou wonn yo: ki atis ki gen stati vivan, ak id stati yo (pou konnen si moun nan deja wè yo).
// Vid si migration stati a poko kouri.
export async function liveStatusIds(supabase: SupabaseClient, artistIds: string[]) {
  const map: Record<string, string[]> = {};
  if (artistIds.length === 0) return map;
  const { data } = await supabase
    .from("artist_statuses")
    .select("id, artist_id")
    .in("artist_id", artistIds)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });
  for (const r of (data ?? []) as { id: string; artist_id: string }[]) (map[r.artist_id] ??= []).push(r.id);
  return map;
}

// ===== Stati moun nan deja wè (navigatè a sèlman: se jis pou koulè wonn nan) =====
const SEEN_KEY = "upmizik-status-seen";

export function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function markSeen(ids: string[]) {
  try {
    const seen = readSeen();
    ids.forEach((id) => seen.add(id));
    // Kenbe sèlman 300 dènye yo (stati yo ekspire apre 24 è kanmenm)
    localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen).slice(-300)));
    window.dispatchEvent(new Event(SEEN_KEY));
  } catch {}
}

export const SEEN_EVENT = SEEN_KEY;
