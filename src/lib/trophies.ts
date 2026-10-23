// ===== Trofe otomatik atis yo =====
// Chif yo soti nan fonksyon SQL artist_trophy_stats (migration 20261112000000_trophies.sql).
// Pou ajoute/chanje yon trofe, modifye lis TROPHIES la sèlman.

export type TrophyStats = {
  songs: number;
  best_song_plays: number;
  total_plays: number;
  likes: number;
  comments: number;
  donations: number;
  donors: number;
  fans: number;
  in_top3: boolean;
  in_top10: boolean;
  is_verified: boolean;
  approved_at: string | null;
};

import type { MedalIcon, MedalTier } from "@/components/badges/Medal";

type TrophyDef = {
  id: string;
  emoji: string; // pou tèks (notifikasyon...)
  icon: MedalIcon; // pou meday la
  tier: MedalTier;
  name: string;
  description: string;
  // Valè aktyèl la ak objektif la (pou ba pwogrè a)
  value: (s: TrophyStats) => number;
  goal: number;
};

const yearsSince = (date: string | null) => (date ? (Date.now() - new Date(date).getTime()) / (365.25 * 24 * 3600 * 1000) : 0);

export const TROPHIES: TrophyDef[] = [
  { id: "first_song", icon: "mic", tier: "bronze", emoji: "🎙️", name: "Premye pa", description: "Pibliye premye chante", value: (s) => s.songs, goal: 1 },
  { id: "songs_5", icon: "disc", tier: "silver", emoji: "💽", name: "EP", description: "Pibliye 5 chante", value: (s) => s.songs, goal: 5 },
  { id: "songs_12", icon: "layers", tier: "gold", emoji: "📀", name: "Albòm konplè", description: "Pibliye 12 chante", value: (s) => s.songs, goal: 12 },
  { id: "hit_1k", icon: "flame", tier: "ruby", emoji: "🔥", name: "Tib", description: "Yon chante ki rive 1 000 ekout", value: (s) => s.best_song_plays, goal: 1000 },
  { id: "hit_10k", icon: "zap", tier: "gold", emoji: "💥", name: "Gwo tib", description: "Yon chante ki rive 10 000 ekout", value: (s) => s.best_song_plays, goal: 10000 },
  { id: "fans_100", icon: "users", tier: "sapphire", emoji: "👥", name: "Fanatik fidèl", description: "100 koutè diferan", value: (s) => s.fans, goal: 100 },
  { id: "likes_100", icon: "heart", tier: "ruby", emoji: "❤️", name: "Renmen pa pèp la", description: "100 ❤️ sou chante yo", value: (s) => s.likes, goal: 100 },
  { id: "comments_50", icon: "message", tier: "violet", emoji: "💬", name: "Moun ap pale", description: "50 kòmantè sou chante yo", value: (s) => s.comments, goal: 50 },
  { id: "first_donation", icon: "gift", tier: "emerald", emoji: "💝", name: "Premye sipò", description: "Resevwa premye don", value: (s) => s.donations, goal: 1 },
  { id: "donors_10", icon: "coins", tier: "gold", emoji: "🤝", name: "Kominote", description: "10 moun diferan ki fè don", value: (s) => s.donors, goal: 10 },
  { id: "top10", icon: "trending", tier: "emerald", emoji: "📈", name: "Nan Top 10", description: "Yon chante nan Top 10 kounye a", value: (s) => Number(s.in_top10 || s.in_top3), goal: 1 },
  { id: "top3", icon: "trophy", tier: "gold", emoji: "🏆", name: "Nan Top 3", description: "Yon chante nan Top 3 kounye a", value: (s) => Number(s.in_top3), goal: 1 },
  { id: "verified", icon: "badgeCheck", tier: "sapphire", emoji: "✅", name: "Verifye", description: "Resevwa badj ✓ la", value: (s) => Number(s.is_verified), goal: 1 },
  { id: "anniversary", icon: "cake", tier: "violet", emoji: "🎂", name: "1 an sou UpMizik", description: "1 an depi kont lan apwouve", value: (s) => Math.floor(yearsSince(s.approved_at)), goal: 1 },
];

export type Trophy = { id: string; emoji: string; icon: MedalIcon; tier: MedalTier; name: string; description: string; earned: boolean; value: number; goal: number; progress: number };

export function computeTrophies(stats: TrophyStats | null): Trophy[] {
  return TROPHIES.map((t) => {
    const value = stats ? Number(t.value(stats)) : 0;
    return {
      id: t.id,
      emoji: t.emoji,
      icon: t.icon,
      tier: t.tier,
      name: t.name,
      description: t.description,
      earned: value >= t.goal,
      value: Math.min(value, t.goal),
      goal: t.goal,
      progress: Math.max(0, Math.min(1, value / t.goal)),
    };
  });
}
