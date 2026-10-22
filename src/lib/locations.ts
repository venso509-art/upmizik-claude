// ===== Zòn atis yo: vil prensipal chak depatman Ayiti ak vil dyaspora kote gen anpil Ayisyen =====
// Valè ki sove a (profiles.location) se tèks ki parèt la, pa egzanp "Okap, Nò" oswa "Miami, Etazini".

export type LocationGroup = { label: string; places: string[] };

const haiti = (dept: string, cities: string[]) => ({ label: `🇭🇹 ${dept}`, places: cities.map((c) => `${c}, ${dept}`) });
const abroad = (flag: string, country: string, cities: string[]) => ({
  label: `${flag} ${country}`,
  places: cities.map((c) => `${c}, ${country}`),
});

export const LOCATION_GROUPS: LocationGroup[] = [
  // Omwen 10 vil pa depatman (komin prensipal yo, pi gwo yo an premye)
  haiti("Lwès", [
    "Pòtoprens", "Dèlma", "Kafou", "Petyonvil", "Site Solèy", "Tabarre", "Kwadebouke", "Leyogàn",
    "Tigwav", "Grangwav", "Akayè", "Gantye", "Kenskòf", "Gresye", "Lagonav", "Kònay",
  ]),
  haiti("Nò", [
    "Okap", "Limonad", "Plèndinò", "Milo", "Lenbe", "Akil dinò", "Gran Rivyè dinò", "Plezans",
    "Pòmago", "Bòg", "Senrafayèl", "Dondon", "Pilat", "Katye Moren",
  ]),
  haiti("Nòdès", [
    "Fòlibète", "Wanament", "Twou dinò", "Teryewouj", "Karakòl", "Valyè", "Mon Òganize", "Kapotil",
    "Mobenkwochi", "Fèye", "Karis", "Pèch",
  ]),
  haiti("Nòdwès", [
    "Pòdepè", "Senlwidinò", "Jan Rabèl", "Mòl Sen Nikola", "Bonbadopolis", "Bedèn", "Latòti", "Ansafolè",
    "Basenble", "Chansòl",
  ]),
  haiti("Latibonit", [
    "Gonayiv", "Senmak", "Dèsalin", "Gwomòn", "Lestè", "Ti Rivyè Latibonit", "Verèt", "Sen Michèl Latalay",
    "Ennri", "Mamlad", "Lachapèl", "Answouj", "Tènèv", "Grann Salin", "Lyankou",
  ]),
  haiti("Sant", [
    "Ench", "Mibalè", "Laskawobas", "Beladè", "Boukankare", "Sodo", "Mayisad", "Tomond", "Tomasik",
    "Sèka Lasous", "Sèka Kavajal", "Savanèt",
  ]),
  haiti("Sid", [
    "Okay", "Kanperen", "Akin", "Pòsali", "Kavayon", "Tòbèk", "Senlwidisid", "Koto", "Pòtapiman",
    "Chantal", "Tibiwon", "Chadonyè", "Manich", "Zanglè", "Ilavach",
  ]),
  haiti("Sidès", ["Jakmèl", "Bèlans", "Kayjakmèl", "Marigo", "Bennèt", "Kòt Defè", "Gran Gozye", "Tyòt", "Anspit", "Lavale"]),
  haiti("Grandans", [
    "Jeremi", "Danmari", "Ansdeno", "Abriko", "Koray", "Pestèl", "Wozo", "Bomon", "Mowon", "Chanbelan",
    "Lezirwa", "Twou Bonbon", "Mafran",
  ]),
  haiti("Nip", [
    "Miragwàn", "Ansavo", "Baradè", "Fondènèg", "Ti Rivyè Nip", "Plezans disid", "Ti Twou Nip", "Gran Boukan",
    "Ano", "Lazil", "Payan",
  ]),
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
