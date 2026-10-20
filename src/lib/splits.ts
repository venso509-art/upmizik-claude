export type Split = { name: string; role: string; email: string; percentage: number };

export const MAX_SPLITS = 5;
export const SPLIT_ROLES = ["Featuring", "Pwodiktè", "Konpozitè", "Parolye", "Mizisyen", "Enjenyè son", "Manadjè", "Lòt"];

export function splitsTotal(splits: Split[]) {
  return Math.round(splits.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0) * 100) / 100;
}

// Retounen yon mesaj erè, oswa null si tout bagay kòrèk
export function validateSplits(splits: Split[]): string | null {
  if (splits.length > MAX_SPLITS) return `Ou ka ajoute maksimòm ${MAX_SPLITS} kolaboratè.`;
  for (let i = 0; i < splits.length; i++) {
    const s = splits[i];
    const n = i + 1;
    if (!s.name.trim()) return `Kolaboratè #${n}: mete non li.`;
    if (s.name.trim().length > 80) return `Kolaboratè #${n}: non an twò long.`;
    if (!s.role.trim()) return `Kolaboratè #${n}: chwazi wòl li.`;
    if (s.email && !/^\S+@\S+\.\S+$/.test(s.email.trim())) return `Kolaboratè #${n}: imèl la pa valid.`;
    if (!(s.percentage > 0) || s.percentage > 100) return `Kolaboratè #${n}: pousantaj la dwe ant 0.01 ak 100.`;
  }
  if (splitsTotal(splits) > 100) return "Total pousantaj kolaboratè yo pa ka depase 100%.";
  return null;
}
