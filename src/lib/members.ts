// ===== MANM AFILYE (Referral) =====
// Kòb chak mwa: 1 $ pa atis apwouve jiska objektif la (50), 2,50 $ pa atis apre sa (menm règ ak SQL member_month_earnings).

export const BASE_RATE_USD = 1;
export const BONUS_RATE_USD = 2.5;
export const MILESTONES = [10, 25, 50, 75, 100]; // pousantaj objektif la

export type MemberStatus = "pending" | "approved" | "rejected" | "blocked";
export type Referral = {
  artist_id: string;
  name: string;
  avatar_url: string | null;
  status: string;
  signed_up_at: string;
  counted_at: string | null; // dat ekip la apwouve atis la (li konte)
  promo_until: string | null;
};

export function monthEarnings(count: number, objective: number) {
  const base = Math.min(count, objective);
  const bonus = Math.max(count - objective, 0);
  return { base, bonus, usd: base * BASE_RATE_USD + bonus * BONUS_RATE_USD };
}

// Kle mwa a ("2026-10") ak non li an kreyòl
const MONTHS = ["janvye", "fevriye", "mas", "avril", "me", "jen", "jiyè", "out", "septanm", "oktòb", "novanm", "desanm"];
export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
export function monthName(key: string, withYear = false) {
  const [y, m] = key.split("-").map(Number);
  const name = MONTHS[m - 1] ?? key;
  return withYear ? `${name} ${y}` : name;
}

// Atis ki konte (apwouve) pa mwa
export function countByMonth(referrals: Referral[]) {
  const map = new Map<string, number>();
  for (const r of referrals) {
    if (!r.counted_at) continue;
    const k = monthKey(new Date(r.counted_at));
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

// Konbyen jou ki rete nan mwa a
export function daysLeftInMonth(now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
}

// Ki mwa kontra a (1 sou 6...)
export function contractMonth(approvedAt: string | null, total: number, now = new Date()) {
  if (!approvedAt) return 1;
  const a = new Date(approvedAt);
  const n = (now.getFullYear() - a.getFullYear()) * 12 + (now.getMonth() - a.getMonth()) + 1;
  return Math.min(Math.max(n, 1), total);
}

// Ti mesaj ankourajman dapre pwogrè a
export function encouragement(count: number, objective: number) {
  const left = objective - count;
  if (count === 0) return "Pataje lyen ou a jodi a: premye atis la se pi enpòtan an!";
  if (left > objective / 2) return `Bon kòmansman! ${left} atis ankò pou rive ${objective}.`;
  if (left > 0) return `Ou prèske la! ${left} atis ankò pou rive ${objective}. 💪`;
  return `Bravo, ou depase objektif la! Chak nouvo atis vo ${BONUS_RATE_USD.toFixed(2).replace(".", ",")} $ kounye a. 🔥`;
}

export const formatUsd = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(2).replace(".", ",")} $`;
