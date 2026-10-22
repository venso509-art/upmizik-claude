// ===== Piblikasyon: Single, EP, Mixtape, Album (migration 20261127000000_releases.sql) =====
export type ReleaseKind = "ep" | "mixtape" | "album";
export type ReleaseChoice = "single" | ReleaseKind;

export const RELEASE_LABELS: Record<ReleaseChoice, { label: string; icon: string; hint: string }> = {
  single: { label: "Single", icon: "🎵", hint: "Yon chante pou kont li" },
  ep: { label: "EP", icon: "💽", hint: "3 a 6 chante" },
  mixtape: { label: "Mixtape", icon: "📼", hint: "Yon seri chante" },
  album: { label: "Album", icon: "💿", hint: "Yon pwojè konplè" },
};

export type Release = { id: string; title: string; kind: ReleaseKind; artist_id: string; created_at: string };

export function releaseLabel(kind: ReleaseKind) {
  const l = RELEASE_LABELS[kind];
  return `${l.icon} ${l.label}`;
}
