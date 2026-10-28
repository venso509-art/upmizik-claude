// Rapò revni admin nan: kalite peman yo, peryòd yo, ak kalkil total yo

export type RevenueKind = "don" | "enskripsyon" | "pro" | "boost" | "kredi";

export type RevenueRow = {
  kind: RevenueKind;
  id: string;
  at: string;
  payer_name: string;
  payer_id: string | null;
  target_name: string;
  target_id: string | null;
  detail: string;
  method: string;
  reference: string | null;
  total_htg: number;
  total_usd: number;
  site_htg: number | null; // null = kredi live (separasyon an fèt lè moun nan voye kado)
  shared_htg: number | null;
  shared_with: string | null;
};

export type RevenueExtras = {
  live_gifts_htg: number;
  live_artist_htg: number;
  live_platform_htg: number;
  fee_htg: number;
  artist_paid_htg: number;
  member_paid_htg: number;
  member_paid_usd: number;
  credits_unspent_htg: number;
};

export const KINDS: Record<RevenueKind, { label: string; icon: string; color: string; note: string }> = {
  don: { label: "Don", icon: "💝", color: "#F472B6", note: "15 % pou sit la, rès la pou atis yo" },
  enskripsyon: { label: "Enskripsyon", icon: "🎤", color: "#A78BFA", note: "Pou sit la, mwens pa manm ki fè atis la enskri a" },
  pro: { label: "Pwofil Pro", icon: "⭐", color: "#FFD700", note: "100 % pou sit la" },
  boost: { label: "Boost", icon: "🔥", color: "#FB923C", note: "100 % pou sit la" },
  kredi: { label: "Kredi live", icon: "🪙", color: "#38BDF8", note: "Separe lè moun yo voye kado nan live" },
};
export const KIND_ORDER: RevenueKind[] = ["don", "enskripsyon", "pro", "boost", "kredi"];

export const PERIODS = [
  { key: "aktyel", label: "Depi dènye reset" },
  { key: "mwa", label: "Mwa sa a" },
  { key: "mwa-pase", label: "Mwa pase" },
  { key: "30", label: "30 jou" },
  { key: "90", label: "90 jou" },
  { key: "365", label: "1 an" },
  { key: "tout", label: "Tout tan" },
] as const;
export type PeriodKey = (typeof PERIODS)[number]["key"];

const iso = (d: Date) => d.toISOString().slice(0, 10);

// Dat jodi a an Ayiti (YYYY-MM-DD), pou peryòd yo pa chanje dapre lè sèvè a
function haitiToday() {
  const s = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Port-au-Prince", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return new Date(`${s}T00:00:00Z`);
}

export function parsePeriod(v?: string): { key: PeriodKey; from: string; to: string } {
  const key = (PERIODS.find((p) => p.key === v)?.key ?? "aktyel") as PeriodKey;
  const today = haitiToday();
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  // "Depi dènye reset": paj la itilize dat egzak dènye reset la (from/to isit la se sèlman pou non fichye a)
  if (key === "aktyel") return { key, from: iso(today), to: iso(today) };
  if (key === "mwa") return { key, from: iso(new Date(Date.UTC(y, m, 1))), to: iso(today) };
  if (key === "mwa-pase") return { key, from: iso(new Date(Date.UTC(y, m - 1, 1))), to: iso(new Date(Date.UTC(y, m, 0))) };
  if (key === "tout") return { key, from: "2024-01-01", to: iso(today) };
  const days = Number(key);
  return { key, from: iso(new Date(today.getTime() - (days - 1) * 86400000)), to: iso(today) };
}

export function summarize(rows: RevenueRow[], x: RevenueExtras) {
  const sum = (list: RevenueRow[], f: (r: RevenueRow) => number | null) => list.reduce((s, r) => s + Number(f(r) ?? 0), 0);
  const byKind = KIND_ORDER.map((kind) => {
    const list = rows.filter((r) => r.kind === kind);
    return { kind, count: list.length, total: sum(list, (r) => r.total_htg), site: sum(list, (r) => r.site_htg), shared: sum(list, (r) => r.shared_htg) };
  });
  const k = Object.fromEntries(byKind.map((b) => [b.kind, b])) as Record<RevenueKind, (typeof byKind)[number]>;
  const memberShare = sum(rows.filter((r) => r.kind === "enskripsyon"), (r) => r.shared_htg);

  const total = sum(rows, (r) => r.total_htg);
  // Pou sit la: pa sit la sou chak peman + pa sit la sou kado live yo + frè lojistik atis yo
  const siteParts = [
    { label: "Don (15 %)", value: k.don.site },
    { label: "Enskripsyon atis", value: k.enskripsyon.site },
    { label: "Pwofil Pro", value: k.pro.site },
    { label: "Boost", value: k.boost.site },
    { label: "Kado live (pa sit la)", value: Number(x.live_platform_htg) },
    { label: "Frè lojistik atis (0,99 $/mwa)", value: Number(x.fee_htg) },
  ];
  // Pou pataje: sa ki pou atis yo, featuring/kolaboratè, ak manm yo
  const sharedParts = [
    { label: "Atis yo (don, ak featuring)", value: k.don.shared - Number(x.fee_htg) },
    { label: "Atis yo (kado live)", value: Number(x.live_artist_htg) },
    { label: "Manm yo (enskripsyon)", value: memberShare },
  ];
  const site = siteParts.reduce((s, p) => s + p.value, 0);
  const shared = sharedParts.reduce((s, p) => s + p.value, 0);
  return { total, site, shared, siteParts, sharedParts, byKind, credits: k.kredi.total };
}

// Rapò achive (reset): sa ki anrejistre nan revenue_reports
export type ArchivedReport = {
  id: string;
  number: number;
  title: string;
  period_from: string;
  period_to: string;
  created_at: string;
  data: { rows: RevenueRow[]; extras: RevenueExtras | null };
};

export const EMPTY_EXTRAS: RevenueExtras = {
  live_gifts_htg: 0,
  live_artist_htg: 0,
  live_platform_htg: 0,
  fee_htg: 0,
  artist_paid_htg: 0,
  member_paid_htg: 0,
  member_paid_usd: 0,
  credits_unspent_htg: 0,
};

const STAMP = new Intl.DateTimeFormat("fr-HT", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Port-au-Prince" });
export const fullDate = (iso: string) => STAMP.format(new Date(iso));
