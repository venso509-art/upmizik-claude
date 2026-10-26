// Règleman entèn ekip la pou demann manm afilye yo (admin sèlman): kisa pou tcheke, kilè pou apwouve,
// rejte oswa bloke, ak kijan pou peye. Yon gid konkrè pou tout admin pran menm desizyon yo.

const SECTIONS: { icon: string; title: string; tone: string; items: string[] }[] = [
  {
    icon: "🔎",
    title: "1. Tcheke anvan w deside (chak demann)",
    tone: "text-sky-300",
    items: [
      "Non konplè a sanble ak yon vrè non (pa yon tinon, pa yon non atis).",
      "Ekri oswa rele nimewo WhatsApp la: moun nan dwe reponn epi konfime se li ki voye demann nan.",
      "Kont UpMizik la pa fèk kreye pou fè demann nan sèlman (gade « Kont depi »).",
      "Moun nan pa gen yon lòt kont manm (menm telefòn, menm imèl, menm non).",
      "Motivasyon an serye: li konnen atis, li gen yon rezo (gwoup WhatsApp, studio, katye...).",
      "Moun nan gen omwen 18 an (mande l si w gen dout).",
    ],
  },
  {
    icon: "✅",
    title: "2. Apwouve lè",
    tone: "text-emerald-300",
    items: [
      "Tout tcheke yo pase, e moun nan reponn sou WhatsApp.",
      "Ou eksplike l règ yo: sèlman atis TOUT BON konte, peman chak 5 nan mwa a, pa gen fo kont.",
      "Sistèm nan kreye pseudo a otomatikman; manm nan ka chanje l 3 fwa chak 30 jou.",
    ],
  },
  {
    icon: "↩️",
    title: "3. Rejte (li ka korije epi voye ankò) lè",
    tone: "text-amber-300",
    items: [
      "Enfòmasyon yo pa konplè oswa yo mal ekri (non, imèl, telefòn).",
      "Nimewo a pa reponn apre 2 eseye nan 48 è.",
      "Motivasyon an twò vag. Ekri rezon an klè: moun nan ap wè l.",
    ],
  },
  {
    icon: "⛔",
    title: "4. Bloke lè",
    tone: "text-red-300",
    items: [
      "Li kreye fo kont atis, oswa atis ki pa egziste, pou l touche lajan.",
      "Plizyè atis li fè enskri gen menm telefòn, menm foto, oswa yo pa janm pibliye anyen.",
      "Li bay atis yo fo pwomès (« UpMizik ap peye w », « ou pral sou TV »...), li mande atis yo lajan, oswa li fè spam.",
      "Pseudo a ofansan, oswa li itilize non UpMizik pou twonpe moun.",
      "Règ la: 1ye fwa = avètisman sou WhatsApp; 2yèm fwa = bloke. Fwod peman = bloke touswit.",
    ],
  },
  {
    icon: "💸",
    title: "5. Peman (chak 5 nan mwa a)",
    tone: "text-[#FFD700]",
    items: [
      "Peye sèlman mwa ki FINI (mwa anvan an). Sistèm nan konte sèlman atis ekip la te apwouve.",
      "Anvan w peye, gade kèk atis nan lis la: yo dwe gen yon pwofil serye.",
      "Voye kòb la sou MonCash/NatCash manm nan, epi mete nimewo tranzaksyon an nan « Peye ».",
      "Kalkil la: 1 $ pa atis jiska objektif la (50), 2,50 $ pa atis apre sa. Montan an goud swiv to UpMizik la.",
    ],
  },
];

export function MemberRules() {
  return (
    <details className="group mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 open:border-[#FFD700]/40">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFD700]/15 text-xl" aria-hidden>
          📜
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-white">Règleman entèn: kijan pou trete demann manm yo</span>
          <span className="text-xs text-zinc-400">Tcheke, apwouve, rejte, bloke, peye: menm règ pou tout admin.</span>
        </span>
        <span className="text-zinc-400 transition group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="grid gap-4 border-t border-zinc-800 p-4 md:grid-cols-2">
        {SECTIONS.map((s) => (
          <section key={s.title} className="rounded-xl bg-zinc-950/60 p-4">
            <h3 className={`font-bold ${s.tone}`}>
              {s.icon} {s.title}
            </h3>
            <ul className="mt-2 space-y-1.5 text-sm text-zinc-300">
              {s.items.map((it) => (
                <li key={it} className="flex gap-2">
                  <span className="text-zinc-600" aria-hidden>
                    •
                  </span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </details>
  );
}
