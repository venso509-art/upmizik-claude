export const GENRES = ["Konpa", "Rasin", "Rap Kreyòl", "Twoubadou", "Gospel", "Rabòday", "Zouk", "Kanaval", "Afro"];

export const GENRE_MAX = 40;
export const OTHER_GENRE = "__lot__"; // opsyon "Lòt jan": atis la ekri jan pa l

// Netwaye yon jan atis la ekri: retire espas anplis, premye lèt majiskil.
// Retounen null si chan an vid, oswa undefined si li pa valid.
export function normalizeGenre(raw: string | null | undefined): string | null | undefined {
  const value = (raw ?? "").trim().replace(/\s+/g, " ");
  if (!value) return null;
  // Si se yon jan ki nan lis la (menm si atis la ekri l an miniskil), pran vèsyon ofisyèl la
  const known = GENRES.find((g) => g.toLowerCase() === value.toLowerCase());
  if (known) return known;
  if (value.length < 2 || value.length > GENRE_MAX) return undefined;
  // Lèt (ak aksan yo), chif, espas ak kèk ponktyasyon sèlman
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ0-9 &'’.\-/]+$/.test(value)) return undefined;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
