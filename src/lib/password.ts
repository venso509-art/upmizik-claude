// ===== Fòs modpas (enskripsyon): menm règ nan navigatè a AK sou sèvè a =====
export const PASSWORD_MIN = 8;

// Modpas moun itilize twòp: yo fasil pou devine menm si yo gen lèt ak chif
const COMMON = ["password", "motdepasse", "azerty", "qwerty", "123456", "12345678", "iloveyou", "upmizik", "ayiti", "haiti", "abc123", "admin"];

export type PasswordCheck = { ok: boolean; label: string };

export function passwordChecks(pw: string): PasswordCheck[] {
  return [
    { ok: pw.length >= PASSWORD_MIN, label: `Omwen ${PASSWORD_MIN} karaktè` },
    { ok: /[A-Za-zÀ-ÿ]/.test(pw), label: "Omwen yon lèt" },
    { ok: /\d/.test(pw), label: "Omwen yon chif" },
    { ok: /[A-ZÀ-Ý]/.test(pw) || /[^A-Za-zÀ-ÿ0-9]/.test(pw), label: "Yon lèt majiskil oswa yon senbòl (+ fò)" },
  ];
}

// Retounen yon mesaj si modpas la twò fèb pou yo aksepte l, oswa null si li bon
export function passwordProblem(pw: string): string | null {
  if (pw.length < PASSWORD_MIN) return `Modpas la twò kout: li dwe gen omwen ${PASSWORD_MIN} karaktè.`;
  if (!/[A-Za-zÀ-ÿ]/.test(pw) || !/\d/.test(pw)) return "Modpas la fèb: li dwe gen lèt AK chif (egz: Konpa2026).";
  const lower = pw.toLowerCase();
  if (COMMON.some((c) => lower.includes(c)) && pw.length < 12) return "Modpas sa a twò fasil pou devine. Chwazi yon lòt.";
  if (/^(.)\1+$/.test(pw)) return "Modpas la pa ka se menm karaktè a repete.";
  return null;
}

// 0 = fèb, 1 = mwayen, 2 = bon, 3 = fò
export function passwordScore(pw: string): 0 | 1 | 2 | 3 {
  if (!pw || passwordProblem(pw)) return 0;
  let s = 1;
  if (pw.length >= 10) s++;
  if (/[A-ZÀ-Ý]/.test(pw) && /[^A-Za-zÀ-ÿ0-9]/.test(pw)) s++;
  else if (/[A-ZÀ-Ý]/.test(pw) || /[^A-Za-zÀ-ÿ0-9]/.test(pw)) s = Math.max(s, 2);
  return Math.min(3, s) as 1 | 2 | 3;
}
