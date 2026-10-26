// ===== TUTO POU ATIS YO =====
// Manm afilye yo voye yo bay atis ki enskri ak pseudo yo (WhatsApp, elatriye), youn chak jou.
// Etap yo swiv vrè non bouton ak paj sit la.

export type Tutorial = { id: string; icon: string; question: string; intro: string; steps: string[]; path: string };

export const TUTORIALS: Tutorial[] = [
  {
    id: "mete-mizik",
    icon: "🎵",
    question: "Kijan pou w mete yon mizik sou UpMizik?",
    intro: "Pibliye chante w nan kèk minit, gratis.",
    steps: [
      "Konekte nan kont atis ou.",
      "Peze « + Upload » anlè a (oswa « Pibliye yon chante » nan meni ☰ a).",
      "Ekri tit chante a epi chwazi jan mizik la (Konpa, Rap Kreyòl, Gospel...).",
      "Ajoute yon imaj kouvèti: koupe l ak dwèt ou pou l bèl nan kare a.",
      "Chwazi fichye odyo a (MP3, M4A, WAV...).",
      "Si gen featuring oswa kolaboratè, ajoute yo ak pousantaj yo.",
      "Peze « Pibliye ». Chante a parèt sou paj ou ak sou paj akèy la! 🎉",
    ],
    path: "/upload",
  },
  {
    id: "poste",
    icon: "📣",
    question: "Kijan pou w ajoute yon pòs sou kont ou?",
    intro: "Pòs yo parèt nan Sosyal: nouvèl, evènman, nouvo pwojè.",
    steps: [
      "Ale nan Dashboard ou.",
      "Desann jis nan seksyon « Sosyal ».",
      "Ekri mesaj ou (nouvo chante, konsè, remèsiman...).",
      "Ajoute yon foto oswa yon lyen si w vle.",
      "Peze « 📣 Pibliye ». Fanatik ou yo ak abone ou yo resevwa yon notifikasyon.",
    ],
    path: "/dashboard",
  },
  {
    id: "pwofil",
    icon: "👤",
    question: "Kijan pou w chanje pwofil ou?",
    intro: "Foto, non, biyografi: fè moun rekonèt ou.",
    steps: [
      "Konekte, epi ale sou « Pwofil » (oswa peze non ou nan meni an).",
      "Peze foto a pou w chanje foto pwofil ou: santre figi w nan wonn nan.",
      "Ajoute yon foto kouvèti (gwo imaj anlè paj ou a).",
      "Ekri yon ti biyografi: kiyès ou ye, ki kote w soti, ki stil mizik ou.",
      "Peze « Anrejistre ». Paj ou mete l ajou touswit.",
    ],
    path: "/pwofil",
  },
  {
    id: "cv-bel",
    icon: "✨",
    question: "Kijan pou w fè CV atis ou bèl?",
    intro: "Yon paj atis konplè fè fanatik yo ak pwodiktè yo fè w konfyans.",
    steps: [
      "Ouvri pwòp paj atis ou: gen yon lis « Pwogresyon pwofil » ki montre sa k manke.",
      "Mete yon bon foto pwofil ak yon foto kouvèti klè.",
      "Ranpli biyografi, vil ou, enspirasyon ou ak vizyon ou.",
      "Ajoute lyen YouTube, Instagram, TikTok ak WhatsApp ou.",
      "Pibliye omwen 3 chante ak bèl kouvèti.",
      "Atis Pro: chwazi yon chante « an vedèt » pou l parèt an premye.",
    ],
    path: "/pwofil#bio",
  },
  {
    id: "pataje",
    icon: "🔗",
    question: "Kijan pou w pataje mizik ou sou WhatsApp, TikTok ak Instagram?",
    intro: "Plis moun tande w, plis ou monte nan Top 10 la.",
    steps: [
      "Ouvri paj chante w la sou UpMizik.",
      "Peze bouton « 🔗 Pataje ».",
      "Chwazi WhatsApp, Facebook, Instagram oswa kopye lyen an.",
      "Mete lyen an nan estati WhatsApp ou ak nan « bio » TikTok/Instagram ou.",
      "Mande zanmi w yo koute l, like l epi kòmante l!",
    ],
    path: "/dashboard",
  },
  {
    id: "don-retre",
    icon: "💝",
    question: "Kijan fanatik yo sipòte w, e kijan pou w retire kòb ou?",
    intro: "Fanatik yo voye don sou MonCash/NatCash dirèkteman nan kont ou.",
    steps: [
      "Fanatik yo peze « Sipòte » sou paj ou oswa sou chante ou.",
      "Ekip la verifye don an, epi l antre nan balans ou.",
      "Ale nan Dashboard → « 💰 Finans » pou wè kòb ou.",
      "Peze « Mande retrè », konfime ak PIN retrè ou.",
      "Ekip la voye kòb la sou MonCash oswa NatCash ou.",
    ],
    path: "/dashboard/finans",
  },
  {
    id: "pro",
    icon: "⭐",
    question: "Kijan pou w vin atis Pro?",
    intro: "Pro bay plis avantaj: badj PRO, live, stati, abone, chante an vedèt...",
    steps: [
      "Ale sou « Pwofil » ou.",
      "Peze « Aplike pou yon pwofil Pro ».",
      "Voye montan an sou MonCash oswa NatCash (pri a parèt nan fenèt la).",
      "Voye foto prèv peman an.",
      "Lè ekip la valide l, badj PRO a parèt sou pwofil ou ak tout avantaj yo. ⭐",
    ],
    path: "/pwofil",
  },
  {
    id: "stati",
    icon: "📸",
    question: "Kijan pou w poste yon stati (24 è)?",
    intro: "Tankou WhatsApp: foto, videyo, odyo oswa tèks ki dire 24 è (atis Pro).",
    steps: [
      "Ale nan Dashboard → seksyon « 📸 Stati 24 è ».",
      "Chwazi tèks, foto, videyo oswa odyo.",
      "Ajoute stickers oswa yon lejand si w vle, epi koupe videyo a.",
      "Peze « Pibliye ». Abone ou yo resevwa yon notifikasyon.",
      "Peze 👁 sou stati w pou wè kiyès ki gade l ak kiyès ki like li.",
    ],
    path: "/dashboard",
  },
  {
    id: "live",
    icon: "🔴",
    question: "Kijan pou w fè yon live?",
    intro: "Pale ak fanatik ou yo an dirèk epi resevwa kado (atis Pro).",
    steps: [
      "Ale nan Dashboard → « 🔴 Kòmanse » (Fè yon live).",
      "Bay telefòn nan otorizasyon pou kamera ak mikwo.",
      "Ekri yon tit pou live la, epi peze « 🔴 Kòmanse live la ».",
      "Fanatik yo voye like ak kado; ou ka envite yon lòt atis monte sou sèn nan.",
      "Apre live la, ale nan « Revni live » pou remèsye moun ki voye kado yo.",
    ],
    path: "/live/nouvo",
  },
  {
    id: "abone",
    icon: "➕",
    question: "Kijan pou w jwenn plis abone?",
    intro: "Abone ou yo resevwa tout sa w pibliye (atis Pro).",
    steps: [
      "Pataje lyen paj atis ou toupatou (WhatsApp, TikTok, Instagram).",
      "Mande fanatik ou yo peze « ＋ Abone » sou paj ou.",
      "Pibliye regilyèman: chante, pòs, stati, live.",
      "Reponn kòmantè yo epi remèsye moun ki sipòte w.",
      "Plis ou aktif, plis ou parèt sou paj akèy la. 🚀",
    ],
    path: "/dashboard",
  },
];

// Tuto jodi a: chanje chak jou (menm pou tout manm yo)
export function tutorialOfTheDay(now = new Date()) {
  const day = Math.floor(now.getTime() / 86400000);
  return TUTORIALS[day % TUTORIALS.length];
}

// Tèks pou pataje sou WhatsApp
export function tutorialText(t: Tutorial, origin: string, code?: string) {
  const steps = t.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
  return `${t.icon} *${t.question}*\n${t.intro}\n\n${steps}\n\n👉 ${origin}${t.path}${code ? `\n\n🎁 Ou poko enskri? Itilize pseudo ${code}: ${origin}/enskri?wol=atis&ref=${code}` : ""}\n\n— UpMizik 🇭🇹`;
}
