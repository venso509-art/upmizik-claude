// ===== BOOST (piblisite peye) =====
// Yon atis peye pou yon mizik oswa pwofil li parèt an premye sou sit la, pandan kèk jou.
// Yon boost aktif = is_boosted AK boost_expires_at poko pase (li sispann poukont li apre dat la).

export type BoostType = "mizik" | "profil";
export type BoostPlan = { id: string; label: string; days: number; price_htg: number };
export type BoostStatus = "pending" | "active" | "rejected";

export function isBoostActive(flag: boolean | null | undefined, expiresAt: string | null | undefined, now = Date.now()) {
  return !!flag && !!expiresAt && new Date(expiresAt).getTime() > now;
}

// Konbyen jou ki rete (pou "rete 3 jou")
export function boostDaysLeft(expiresAt: string, now = Date.now()) {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 86400000));
}

export const BOOST_STATUS_LABEL: Record<BoostStatus, string> = {
  pending: "⏳ Ap tann verifikasyon",
  active: "🔥 Aktive",
  rejected: "❌ Refize",
};
