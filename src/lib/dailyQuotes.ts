// ===== Mesaj jounen an: tip, kategori, dat an Kreyòl, ak ti zouti pou tèks la =====

export type QuoteFormat = "feed" | "story" | "square";
export type QuoteTemplate = 1 | 2 | 3 | 4 | 5 | 6;

export type DailyQuote = { teks: string; kategori: string; etiket: string; sous: string | null };
export type QuoteArtist = { name: string; avatarUrl: string | null; genre: string | null };

export const FORMAT_SIZE: Record<QuoteFormat, { w: number; h: number; label: string }> = {
  feed: { w: 1080, h: 1350, label: "Feed" },
  story: { w: 1080, h: 1920, label: "Story" },
  square: { w: 1080, h: 1080, label: "Kare" },
};

export const TEMPLATE_NAMES: Record<QuoteTemplate, string> = {
  1: "Jòn Solèy",
  2: "Ble Lanmè",
  3: "Wouj Konpa",
  4: "Vèt Rasin",
  5: "Woz Gospel",
  6: "Nwa Vinil",
};

// Kategori sitasyon yo (menm kle ak baz done a)
export const QUOTE_CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: "motivasyon", label: "Motivasyon", icon: "🔥" },
  { key: "mizik", label: "Mizik", icon: "🎵" },
  { key: "lanmou", label: "Lanmou", icon: "❤️" },
  { key: "konsey", label: "Konsèy", icon: "💡" },
  { key: "blag", label: "Blag", icon: "😂" },
  { key: "ede_pwochen", label: "Ede pwochen", icon: "🤝" },
  { key: "espwa", label: "Espwa", icon: "🌅" },
  { key: "atis_travay", label: "Atis k ap travay", icon: "🎙️" },
  { key: "pwoveb", label: "Pwovèb", icon: "📜" },
  { key: "sajes", label: "Sajès", icon: "🦉" },
];
export const categoryLabel = (key: string) => QUOTE_CATEGORIES.find((c) => c.key === key)?.label ?? key;

export const WEEKDAYS = ["Dimanch", "Lendi", "Madi", "Mèkredi", "Jedi", "Vandredi", "Samdi"];

const MONTHS = ["jan", "fev", "mas", "avr", "me", "jen", "jiy", "out", "sept", "okt", "nov", "des"];

// "2026-10-28" → { d: 28, m: 10, y: 2026, mon: "okt" }
export function dayParts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { d, m, y, mon: MONTHS[(m || 1) - 1] };
}

// Gwosè tèks sitasyon an dapre longè l (pi long = pi piti), pou l pa janm depase kat la
export function quoteScale(text: string) {
  const n = text.length;
  if (n <= 40) return 1;
  if (n <= 52) return 0.92;
  if (n <= 64) return 0.84;
  if (n <= 76) return 0.8;
  return 0.76;
}

// Non atis la: maks ~22 karaktè
export const shortName = (name: string) => (name.length > 22 ? `${name.slice(0, 21).trimEnd()}…` : name);

// Pati sitasyon an ki an koulè/italik nan kèk desen: sa ki apre dènye vigil la (si l kout), sinon 2 dènye mo yo
export function splitHighlight(text: string): [string, string] {
  const t = text.trim();
  const cut = Math.max(t.lastIndexOf(", "), t.lastIndexOf("; "), t.lastIndexOf(": "));
  if (cut > 0) {
    const tail = t.slice(cut + 2);
    const words = tail.split(/\s+/).length;
    if (words >= 2 && words <= 6) return [t.slice(0, cut + 2), tail];
  }
  const words = t.split(/\s+/);
  if (words.length < 5) return [t, ""];
  const tail = words.slice(-2).join(" ");
  return [t.slice(0, t.length - tail.length), tail];
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
