// ===== Gwo fraz anlè paj akèy la: li chanje chak 6 èdtan (menm fraz pou tout moun nan menm 6 è a) =====
// Pou ajoute oswa chanje yon fraz: modifye lis la. "hl" = mo ki an jòn (degrade) nan fen fraz la.

export type HeroSlogan = { text: string; hl: string };

export const HERO_SLOGANS: HeroSlogan[] = [
  { text: "Chak Ekout Pouse Yon", hl: "Atis Ayisyen" },
  { text: "Mizik Ou Renmen An Merite", hl: "Sipò Ou" },
  { text: "Yon Klik Pou Ou, Yon Pa Pou", hl: "Kilti Nou" },
  { text: "Koute Lokal, Fè", hl: "Talan Nou Monte" },
  { text: "Pwochen Gwo Zetwal La Ap Tann", hl: "Zòrèy Ou" },
  { text: "Konpa, Rap, Rasin: Tout Son", hl: "Peyi A La" },
  { text: "Fè Atis Ou Renmen An", hl: "Tande Vwa Ou" },
  { text: "Mizik Ayisyen An Gen Kay Li:", hl: "UpMizik" },
  { text: "Pa Sèlman Koute, Ede Yo", hl: "Grandi" },
  { text: "Chak Pataj Mete Yon Atis", hl: "Sou Wout Siksè" },
  { text: "Lakay Nou, Son Nou,", hl: "Fyète Nou" },
  { text: "Dekouvri Talan Ki Poko", hl: "Sou Radyo" },
];

// Chak 6 è: yon lòt fraz, nan yon lòd melanje (5 pa gen okenn divizè komen ak 12, kidonk tout fraz yo pase)
export function sloganForNow(now = Date.now()) {
  const slot = Math.floor(now / (6 * 3600 * 1000));
  return HERO_SLOGANS[(slot * 5) % HERO_SLOGANS.length];
}
