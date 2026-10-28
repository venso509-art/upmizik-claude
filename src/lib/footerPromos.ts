// ===== Mesaj kat envitasyon footer a: yo chanje chak 2 èdtan (menm mesaj pou tout moun nan menm 2 è a) =====
// Pou ajoute oswa chanje yon mesaj: modifye lis yo anba a. "hl" = mo ki an jòn nan tit la.

export type FooterPromo = { badge: string; title: string; hl: string; after?: string; body: string; cta: string; href: string };

export const ARTIST_PROMOS: FooterPromo[] = [
  {
    badge: "🎤 Espas atis",
    title: "Fanatik ou yo ap tann",
    hl: "pwochen chante w",
    after: ".",
    body: "Pibliye yon chante, fè yon live, oswa poste yon stati pou rete pre fanatik ou yo.",
    cta: "Pibliye yon chante",
    href: "/upload",
  },
  {
    badge: "🔴 Live",
    title: "Fè yon",
    hl: "live jodi a",
    after: ", resevwa kado.",
    body: "Fanatik ou yo ka voye kado an dirèk pandan live la. Chak kado vin lajan pou ou.",
    cta: "Kòmanse yon live",
    href: "/live/nouvo",
  },
  {
    badge: "⏳ Stati 24 è",
    title: "Montre yo sa w ap",
    hl: "prepare nan estidyo a",
    after: ".",
    body: "Yon ti videyo oswa yon foto an stati, epi abone ou yo resevwa yon notifikasyon touswit.",
    cta: "Poste yon stati",
    href: "/dashboard",
  },
  {
    badge: "🔥 Boost",
    title: "Mete chante w",
    hl: "devan tout moun",
    after: ".",
    body: "Ak yon Boost, chante w oswa pwofil ou parèt anlè paj akèy la epi nan pop-up vizitè yo.",
    cta: "Booste yon chante",
    href: "/dashboard",
  },
  {
    badge: "⭐ Pwofil Pro",
    title: "Vin atis",
    hl: "Pro",
    after: ", fè fanatik yo abone.",
    body: "Bouton « Abone », chante an vedèt sou paj ou, ak badj PRO a: abone ou yo pa rate anyen.",
    cta: "Wè avantaj Pro yo",
    href: "/dashboard",
  },
  {
    badge: "📣 Sosyal",
    title: "Bay fanatik ou yo",
    hl: "nouvèl ou",
    after: ".",
    body: "Yon konsè, yon nouvo pwojè, yon mèsi: yon pòs nan Sosyal rive jwenn tout abone ou yo.",
    cta: "Ekri yon pòs",
    href: "/dashboard",
  },
];

export const VISITOR_PROMOS: FooterPromo[] = [
  {
    badge: "🎤 Atis, sa a se pou ou",
    title: "Yo renmen mizik ou. Kounye a yo ka",
    hl: "sipòte w",
    after: ".",
    body: "Kreye paj atis ou gratis. Resevwa sipò sou MonCash ak NatCash.",
    cta: "Enskri gratis",
    href: "/enskri?wol=atis",
  },
  {
    badge: "🎧 Dekouvri",
    title: "Gen",
    hl: "nouvo talan",
    after: " k ap tann ou.",
    body: "Koute atis ayisyen yo, abone nan sa w renmen yo, epi pataje mizik yo ak zanmi w.",
    cta: "Wè atis yo",
    href: "/atis",
  },
  {
    badge: "🪙 Kredi live",
    title: "Voye yon",
    hl: "kado an dirèk",
    after: " bay atis ou renmen.",
    body: "Achte kredi ak MonCash oswa NatCash, epi fè atis la wè ou pandan live li.",
    cta: "Achte kredi",
    href: "/kredi",
  },
  {
    badge: "🤝 Manm afilye",
    title: "Fè atis enskri,",
    hl: "touche kòb",
    after: ".",
    body: "Vin manm UpMizik: chak atis ki enskri ak pseudo ou rapòte w lajan chak mwa.",
    cta: "Vin manm",
    href: "/manm",
  },
  {
    badge: "💬 Sosyal",
    title: "Swiv sa k ap pase nan",
    hl: "mizik ayisyen",
    after: ".",
    body: "Nouvèl, evènman ak nouvo pwojè atis yo, tout nan yon sèl kote.",
    cta: "Ale nan Sosyal",
    href: "/sosyal",
  },
];

// Chak 2 è: yon lòt mesaj, nan yon lòd melanje (7 pa gen okenn divizè komen ak 5 ni 6, kidonk tout mesaj yo pase)
export function promoForNow(list: FooterPromo[], now = Date.now()) {
  const slot = Math.floor(now / (2 * 3600 * 1000));
  return list[(slot * 7 + 3) % list.length];
}
