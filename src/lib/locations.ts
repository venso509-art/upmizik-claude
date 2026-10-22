// ===== Zòn atis yo: vil prensipal chak depatman Ayiti ak vil dyaspora kote gen anpil Ayisyen =====
// Valè ki sove a (profiles.location) se tèks ki parèt la, pa egzanp "Okap, Nò" oswa "Miami, Etazini".

export type LocationGroup = { label: string; places: string[] };

const haiti = (dept: string, cities: string[]) => ({ label: `🇭🇹 ${dept}`, places: cities.map((c) => `${c}, ${dept}`) });
const abroad = (flag: string, country: string, cities: string[]) => ({
  label: `${flag} ${country}`,
  places: cities.map((c) => `${c}, ${country}`),
});

export const LOCATION_GROUPS: LocationGroup[] = [
  haiti("Lwès", ["Pòtoprens", "Dèlma", "Petyonvil", "Kafou", "Tabarre", "Kwadebouke", "Leyogàn", "Akayè", "Lagonav"]),
  haiti("Nò", ["Okap", "Limonad", "Plèndinò", "Milo", "Lenbe"]),
  haiti("Nòdès", ["Fòlibète", "Wanament", "Twou dinò"]),
  haiti("Nòdwès", ["Pòdepè", "Senlwidinò", "Mòl Sen Nikola"]),
  haiti("Latibonit", ["Gonayiv", "Senmak", "Dèsalin", "Gwomòn", "Lestè"]),
  haiti("Sant", ["Ench", "Mibalè", "Laskawobas"]),
  haiti("Sid", ["Okay", "Kanperen", "Akin", "Pòsali"]),
  haiti("Sidès", ["Jakmèl", "Bèlans", "Kayjakmèl"]),
  haiti("Grandans", ["Jeremi", "Danmari", "Ansdeno"]),
  haiti("Nip", ["Miragwàn", "Ansavo", "Baradè"]),
  abroad("🇺🇸", "Etazini", ["Miami", "Nòt Miyami", "Fò Lodèdal", "Orlando", "Nouyòk (Brooklyn)", "Nouyòk (Queens)", "Boston", "Newark", "Atlanta", "Filadèlfi"]),
  abroad("🇨🇦", "Kanada", ["Monreyal", "Laval", "Otawa", "Toronto"]),
  abroad("🇫🇷", "Lafrans", ["Pari", "Lil-de-Frans"]),
  abroad("🇬🇵", "Antiy", ["Gwadloup", "Matinik", "Giyàn"]),
  abroad("🇩🇴", "Dominikani", ["Sendomeng", "Santiyago"]),
  abroad("🌎", "Amerik Latin", ["Santiyago (Chili)", "São Paulo (Brezil)", "Nasò (Bahamas)", "Tik ak Kayik"]),
];

export const ALL_PLACES = LOCATION_GROUPS.flatMap((g) => g.places);
export const OTHER_PLACE = "__lot__"; // opsyon "Lòt kote": atis la ekri vil li
export const LOCATION_MAX = 100;
