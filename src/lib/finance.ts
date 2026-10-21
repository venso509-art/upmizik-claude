// ===== Règ finans yo (dwe matche ak migration 20261101000000_artist_finance_v2.sql) =====
export const ARTIST_SHARE_PERCENT = 85;
export const PLATFORM_FEE_PERCENT = 15;
export const MIN_PAYOUT_HTG = 500;
// Frè mansyèl la ($0.99) ak to a nan paramèt yo kounye a: gade src/lib/settings.ts
export const PAYOUT_WAIT_MONTHS = 3;

export type PayoutStatus = "pending" | "paid" | "rejected";

export const PAYOUT_BADGE: Record<PayoutStatus, { label: string; cls: string }> = {
  pending: { label: "⏳ An atant", cls: "bg-amber-500/15 text-amber-300 ring-amber-500/30" },
  paid: { label: "✅ Peye", cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" },
  rejected: { label: "❌ Rejte", cls: "bg-red-500/15 text-red-300 ring-red-500/30" },
};

export type Balance = {
  earnedHtg: number; // tout pa atis la (apre splits)
  currentMonthHtg: number; // mwa sa a: poko disponib
  feesHtg: number; // total $0.99 pa mwa yo
  paidHtg: number;
  pendingHtg: number;
  availableHtg: number;
  donationCount: number;
  eligibleFrom: string | null; // dat li ka kòmanse retire
};

export type BalanceRow = {
  earned_htg: number;
  current_month_htg: number;
  fees_htg: number;
  paid_htg: number;
  pending_htg: number;
  available_htg: number;
  donation_count: number;
  eligible_from: string | null;
};

export function toBalance(row: BalanceRow | null | undefined): Balance {
  return {
    earnedHtg: Number(row?.earned_htg ?? 0),
    currentMonthHtg: Number(row?.current_month_htg ?? 0),
    feesHtg: Number(row?.fees_htg ?? 0),
    paidHtg: Number(row?.paid_htg ?? 0),
    pendingHtg: Number(row?.pending_htg ?? 0),
    availableHtg: Math.max(0, Number(row?.available_htg ?? 0)),
    donationCount: Number(row?.donation_count ?? 0),
    eligibleFrom: row?.eligible_from ?? null,
  };
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-HT", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Port-au-Prince" });
}
