// ===== UpMizik Sosyal: pòs atis yo (migration 20261113000000_social_posts.sql) =====
export const POST_MAX_LENGTH = 2000;
export const POST_LIFETIME_DAYS = 30;

export type PostStatus = "active" | "blocked" | "deleted";

export type FeedPost = {
  id: string;
  content: string;
  created_at: string;
  expires_at: string;
  artist_id: string;
  artist_name: string;
  artist_avatar: string | null;
  artist_verified: boolean;
};

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
