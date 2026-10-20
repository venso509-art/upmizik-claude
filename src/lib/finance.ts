// ===== Règ finans yo (dwe matche ak migration 20261026000000_finance.sql) =====
export const ARTIST_SHARE_PERCENT = 85;
export const PLATFORM_FEE_PERCENT = 15;
export const MIN_PAYOUT_HTG = 500;

export type PayoutStatus = "pending" | "paid" | "rejected";

export const PAYOUT_BADGE: Record<PayoutStatus, { label: string; cls: string }> = {
  pending: { label: "⏳ An atant", cls: "bg-amber-500/15 text-amber-300 ring-amber-500/30" },
  paid: { label: "✅ Peye", cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" },
  rejected: { label: "❌ Rejte", cls: "bg-red-500/15 text-red-300 ring-red-500/30" },
};

export type Balance = {
  earnedHtg: number;
  paidHtg: number;
  pendingHtg: number;
  availableHtg: number;
  donationCount: number;
};

export type BalanceRow = { earned_htg: number; paid_htg: number; pending_htg: number; available_htg: number; donation_count: number };

export function toBalance(row: BalanceRow | null | undefined): Balance {
  return {
    earnedHtg: Number(row?.earned_htg ?? 0),
    paidHtg: Number(row?.paid_htg ?? 0),
    pendingHtg: Number(row?.pending_htg ?? 0),
    availableHtg: Number(row?.available_htg ?? 0),
    donationCount: Number(row?.donation_count ?? 0),
  };
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-HT", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Port-au-Prince" });
}
