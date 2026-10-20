import type { DayPoint } from "@/components/stats/DailyChart";

export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];

export function parseRange(value: string | undefined): Range {
  const n = Number(value);
  return (RANGES as readonly number[]).includes(n) ? (n as Range) : 30;
}

type DailyRow = { day: string; starts: number; real_plays: number; listeners: number };

export function summarizeDaily(rows: unknown) {
  const list = (rows ?? []) as DailyRow[];
  const points: DayPoint[] = list.map((r) => ({ day: r.day, realPlays: Number(r.real_plays), starts: Number(r.starts) }));
  const realPlays = points.reduce((s, p) => s + p.realPlays, 0);
  const starts = points.reduce((s, p) => s + p.starts, 0);
  return {
    points,
    realPlays,
    starts,
    // Pousantaj ekout ki depase 5 segonn
    realRate: starts > 0 ? Math.round((realPlays / starts) * 100) : null,
  };
}

export type TopSongRow = { song_id: string; title: string; artist_id: string; artist_name: string; starts: number; real_plays: number };
export type TopArtistRow = { artist_id: string; artist_name: string; starts: number; real_plays: number };
