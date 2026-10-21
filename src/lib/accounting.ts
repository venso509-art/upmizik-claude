// ===== Kont atis yo (admin): tip ak ti zouti (migration 20261121000000_admin_artist_accounts.sql) =====

const MONTHS = ["janvye", "fevriye", "mas", "avril", "me", "jen", "jiyè", "out", "septanm", "oktòb", "novanm", "desanm"];

// "2026-10-01" → "oktòb 2026"
export function monthLabel(isoDate: string) {
  const [y, m] = isoDate.split("-").map(Number);
  return `${MONTHS[(m || 1) - 1]} ${y}`;
}

// "2026-10" (paramèt URL) → "2026-10-01", oswa null si li pa valid
export function parseMonthParam(v: string | undefined): string | null {
  if (!v || !/^\d{4}-(0[1-9]|1[0-2])$/.test(v)) return null;
  return `${v}-01`;
}

// "2026-10-01" → "2026-10" (pou URL yo)
export function monthParam(isoDate: string) {
  return isoDate.slice(0, 7);
}

// Mwa kounye a an Ayiti, fòma "2026-10-01"
export function currentMonthIso() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Port-au-Prince", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  return `${y}-${m}-01`;
}

export type MonthRow = {
  month: string;
  artist_id: string;
  donations_count: number;
  gross_htg: number;
  platform_htg: number;
  own_htg: number;
  featuring_in_htg: number;
  featuring_out_htg: number;
  collaborators_htg: number;
  fee_htg: number;
  net_htg: number;
  paid_htg: number;
  closed: boolean;
};

// Supabase voye "numeric" kòm tèks: konvèti tout chif yo
export function toNumbers<T extends Record<string, unknown>>(row: T, keys: (keyof T)[]): T {
  const out = { ...row };
  for (const k of keys) out[k] = Number(row[k] ?? 0) as T[keyof T];
  return out;
}

export const MONEY_KEYS = [
  "donations_count",
  "gross_htg",
  "platform_htg",
  "own_htg",
  "featuring_in_htg",
  "featuring_out_htg",
  "collaborators_htg",
  "fee_htg",
  "net_htg",
  "paid_htg",
] as const;

// Verifikasyon: tout goud yon don dwe ale yon kote (sit la + atis la + featuring + kolaboratè).
// Retounen diferans lan (0 = balanse). Nou tolere 0.05 goud pou awondi yo.
export function balanceGap(r: Pick<MonthRow, "gross_htg" | "platform_htg" | "own_htg" | "featuring_out_htg" | "collaborators_htg">) {
  const gap = r.gross_htg - (r.platform_htg + r.own_htg + r.featuring_out_htg + r.collaborators_htg);
  return Math.abs(gap) < 0.05 ? 0 : Math.round(gap * 100) / 100;
}
