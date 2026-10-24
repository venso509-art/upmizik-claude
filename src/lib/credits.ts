// ===== Kredi UpMizik (pou voye kado nan live yo) =====
// Valè 1 kredi an goud nan settings.credit_htg (pa defo: 1 kredi = 1 goud)

export const CREDIT_PACKS = [50, 100, 250, 500, 1000, 2500];
export const MIN_CREDITS = 10;
export const MAX_CREDITS = 100000;

export function creditsToHtg(credits: number, creditHtg: number) {
  return Math.round(credits * creditHtg * 100) / 100;
}

export function formatCredits(n: number) {
  return `${Math.round(n).toLocaleString("fr-HT")} kredi`;
}
