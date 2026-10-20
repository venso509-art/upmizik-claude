// ===== Nivo atis yo (dwe matche ak migration 20261103000000_levels_verified_top10.sql) =====
export type LevelKind = "donations" | "plays";
export type Level = { threshold: number; name: string; emoji: string; plaque?: boolean };

export const DONATION_LEVELS: Level[] = [
  { threshold: 0, name: "Nouvo", emoji: "🌱" },
  { threshold: 50, name: "Zetwal k ap monte", emoji: "🔥" },
  { threshold: 150, name: "Zetwal", emoji: "⭐" },
  { threshold: 300, name: "Diaman", emoji: "💎" },
  { threshold: 1000, name: "Lejand", emoji: "👑" },
];

export const PLAY_LEVELS: Level[] = [
  { threshold: 0, name: "Debitan", emoji: "🎵" },
  { threshold: 500, name: "Kalifye pou ✓", emoji: "🎯" },
  { threshold: 1000, name: "Bwonz", emoji: "🥉" },
  { threshold: 3000, name: "Ajan", emoji: "🥈", plaque: true },
  { threshold: 10000, name: "Lò", emoji: "🥇", plaque: true },
  { threshold: 100000, name: "Platin", emoji: "💿", plaque: true },
];

// Plak fizik yo mande omwen $100 don tou
export const PLAQUE_MIN_DONATIONS_USD = 100;

export function levelsFor(kind: LevelKind) {
  return kind === "donations" ? DONATION_LEVELS : PLAY_LEVELS;
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
