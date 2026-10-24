// ===== Live UpMizik: kalite done yo ak ti zouti (navigatè + sèvè) =====

export type GiftType = { id: string; name: string; emoji: string; credits: number; sort: number };

export type LiveRow = {
  id: string;
  artist_id: string;
  title: string | null;
  status: "live" | "ended" | "stopped";
  started_at: string;
  ended_at: string | null;
  last_seen_at: string;
  peak_viewers: number;
  viewers: number;
  likes: number;
  gifts_count: number;
  stop_reason: string | null;
};

export const LIVE_COLUMNS = "id, artist_id, title, status, started_at, ended_at, last_seen_at, peak_viewers, viewers, likes, gifts_count, stop_reason";

export type LiveGiftEvent = { id: string; live_id: string; sender_id: string; sender_name: string; gift_id: string; quantity: number; credits: number; created_at: string };
export type LiveMessage = { id: string; live_id: string; user_id: string; sender_name: string; body: string; created_at: string };
export type LiveGuest = { id: string; live_id: string; user_id: string; guest_name: string; status: "requested" | "accepted" | "rejected" | "left" | "removed"; created_at: string };

// Yon live "an dirèk" = status live + atis la te bay siy lavi nan 2 dènye minit yo
export function isLiveOn(l: Pick<LiveRow, "status" | "last_seen_at">, now = Date.now()) {
  return l.status === "live" && now - new Date(l.last_seen_at).getTime() < 2 * 60 * 1000;
}

// Kapasite sèn nan (menm règ ak SQL live_capacity la)
export function stageCapacity(likes: number, giftHtg: number, htgPerUsd: number) {
  if (likes >= 100 && giftHtg >= 5 * htgPerUsd) return 5;
  if (likes >= 100) return 2;
  return 1;
}

export const HEARTBEAT_MS = 20000; // atis la di "m la" chak 20 segonn
export const LIKE_FLUSH_MS = 1000; // like yo voye an pake chak segonn

export function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("fr-HT", { maximumFractionDigits: 1 })}M`;
  if (n >= 1000) return `${(n / 1000).toLocaleString("fr-HT", { maximumFractionDigits: 1 })}K`;
  return n.toLocaleString("fr-HT");
}

export function liveDuration(startIso: string, endIso?: string | null) {
  const s = Math.max(0, Math.floor(((endIso ? new Date(endIso).getTime() : Date.now()) - new Date(startIso).getTime()) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h} è ${m} min` : `${m} min`;
}
