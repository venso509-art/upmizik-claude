// ===== Nivo atis yo (dwe matche ak migration 20261103000000_levels_verified_top10.sql) =====
export type LevelKind = "donations" | "plays";
import type { MedalIcon, MedalShape, MedalTier } from "@/components/badges/Medal";

// emoji = pou tèks; icon + tier = pou meday la (components/badges/Medal)
export type Level = { threshold: number; name: string; emoji: string; icon: MedalIcon; tier: MedalTier; shape?: MedalShape; plaque?: boolean };

export const DONATION_LEVELS: Level[] = [
  { threshold: 0, name: "Nouvo", emoji: "🌱", icon: "sprout", tier: "emerald" },
  { threshold: 50, name: "Zetwal k ap monte", emoji: "🔥", icon: "flame", tier: "bronze" },
  { threshold: 150, name: "Zetwal", emoji: "⭐", icon: "star", tier: "silver" },
  { threshold: 300, name: "Diaman", emoji: "💎", icon: "gem", tier: "platinum" },
  { threshold: 1000, name: "Lejand", emoji: "👑", icon: "crown", tier: "gold" },
];

export const PLAY_LEVELS: Level[] = [
  { threshold: 0, name: "Debitan", emoji: "🎵", icon: "music", tier: "emerald" },
  { threshold: 500, name: "Kalifye pou ✓", emoji: "🎯", icon: "target", tier: "sapphire" },
  { threshold: 1000, name: "Bwonz", emoji: "🥉", icon: "medal", tier: "bronze", shape: "disc" },
  { threshold: 3000, name: "Ajan", emoji: "🥈", icon: "medal", tier: "silver", shape: "disc", plaque: true },
  { threshold: 10000, name: "Lò", emoji: "🥇", icon: "medal", tier: "gold", shape: "disc", plaque: true },
  { threshold: 100000, name: "Platin", emoji: "💿", icon: "disc", tier: "platinum", shape: "disc", plaque: true },
];

// Plak fizik yo mande omwen $100 don tou
export const PLAQUE_MIN_DONATIONS_USD = 100;

export function levelsFor(kind: LevelKind) {
  return kind === "donations" ? DONATION_LEVELS : PLAY_LEVELS;
}

export function levelAt(kind: LevelKind, threshold: number) {
  return levelsFor(kind).find((x) => x.threshold === Number(threshold)) ?? null;
}

export function levelName(kind: LevelKind, threshold: number) {
  const l = levelsFor(kind).find((x) => x.threshold === Number(threshold));
  return l ? `${l.emoji} ${l.name}` : String(threshold);
}

// Nivo aktyèl la, pwochen an, ak pwogrè a (0 → 1) pou rive ladan l
export function progressFor(kind: LevelKind, value: number) {
  const levels = levelsFor(kind);
  let i = 0;
  while (i + 1 < levels.length && value >= levels[i + 1].threshold) i++;
  const current = levels[i];
  const next = levels[i + 1] ?? null;
  const progress = next ? (value - current.threshold) / (next.threshold - current.threshold) : 1;
  return { current, next, progress: Math.max(0, Math.min(1, progress)) };
}

export function formatPlays(n: number) {
  if (n >= 1000) return `${(n / 1000).toLocaleString("fr-HT", { maximumFractionDigits: 1 })}K`;
  return n.toLocaleString("fr-HT");
}
