// ===== Modèl mesaj admin nan: rezon refi ak mesaj remèsiman (WhatsApp / imèl) =====
// Modifye tèks yo isit la. Chak lis gen plizyè modèl: admin nan chwazi youn, epi l ka modifye l anvan l voye l.
import { formatHTG, formatUSD } from "@/lib/donations";

export type Template = { label: string; text: string };
const SIGN = "\n\n— Ekip UpMizik 🎶";
const SITE = "https://upmizik.com";

// ---------------------------------------------------------------------
// REZON TOU PARE (admin nan klike sou youn pou l ranpli bwat rezon an)
// ---------------------------------------------------------------------
export const REJECT_REASONS = {
  registration: [
    "Foto prèv la pa klè, nou pa ka li enfòmasyon yo.",
    "Montan ki voye a pa kòrèk pou frè enskripsyon an.",
    "Nou pa jwenn tranzaksyon sa a nan kont MonCash/NatCash UpMizik la.",
    "Nimewo tranzaksyon an pa koresponn ak foto prèv la.",
    "Prèv sa a deja itilize pou yon lòt enskripsyon.",
    "Non atis la pa respekte règ UpMizik yo (ofansan oswa li pa pou ou).",
  ],
  donation: [
    "Foto prèv la pa klè, nou pa ka li enfòmasyon yo.",
    "Montan ki sou prèv la pa menm ak montan don an.",
    "Nou pa jwenn tranzaksyon sa a nan kont MonCash/NatCash UpMizik la.",
    "Prèv sa a deja itilize pou yon lòt don.",
    "Prèv la pa montre nimewo ofisyèl UpMizik la.",
  ],
  payout: [
    "Nimewo MonCash/NatCash la pa valid, oswa li pa sou non atis la.",
    "Balans disponib la pa ase pou montan sa a.",
    "Nou pa ka verifye idantite atis la pou kounye a.",
    "Gen yon lòt retrè ki deja ap trete pou menm lajan an.",
    "Kont lan anba verifikasyon pou aktivite ki pa nòmal.",
  ],
} as const;

// ---------------------------------------------------------------------
// ENSKRIPSYON ATIS
// ---------------------------------------------------------------------
export function registrationApprovedTemplates(name: string): Template[] {
  return [
    {
      label: "🎉 Byenvini (cho)",
      text: `Bonjou ${name}! 🎉\n\nBon nouvèl: kont atis ou sou UpMizik apwouve! Ou ka konekte kounye a sou ${SITE}/konekte epi pibliye premye chante w.\n\nByenvini nan fanmi UpMizik la. Nou kontan anpil pou n akonpaye w! 🙌${SIGN}`,
    },
    {
      label: "📋 Fòmèl",
      text: `Bonjou ${name},\n\nNou verifye peman frè enskripsyon w lan, e kont atis ou sou UpMizik aktive.\n\nPwochen etap yo:\n1. Konekte sou ${SITE}/konekte\n2. Ranpli pwofil ou (foto, bio, rezo sosyal)\n3. Pibliye mizik ou\n\nMèsi paske w chwazi UpMizik.${SIGN}`,
    },
    {
      label: "⚡ Kout",
      text: `Bonjou ${name}! ✅ Kont atis UpMizik ou apwouve. Konekte sou ${SITE}/konekte epi lage mizik ou! 🎶${SIGN}`,
    },
  ];
}

export function registrationRejectedTemplates(name: string, reason: string | null): Template[] {
  const why = reason ? `\nRezon: ${reason}` : "";
  return [
    {
      label: "🙏 Janti",
      text: `Bonjou ${name},\n\nMèsi pou enterè w pou UpMizik. Malerezman, nou pa t ka valide prèv peman frè enskripsyon w lan.${why}\n\nPa enkyete w: konekte sou ${SITE}/konekte pou w voye yon nouvo prèv, e n ap verifye l rapidman. Si w gen kesyon, reponn mesaj sa a.${SIGN}`,
    },
    {
      label: "📋 Fòmèl",
      text: `Bonjou ${name},\n\nDemann enskripsyon atis ou sou UpMizik pa t ka apwouve.${why}\n\nOu ka voye yon nouvo prèv peman lè w konekte sou ${SITE}/konekte.${SIGN}`,
    },
  ];
}

// ---------------------------------------------------------------------
// DON
// ---------------------------------------------------------------------
type DonationCtx = { donorName: string | null; amountUsd: number; amountHtg: number; artistName: string; songTitle: string | null };

export function donationThanksTemplates(d: DonationCtx): Template[] {
  const name = d.donorName ? ` ${d.donorName}` : "";
  const forWhat = d.songTitle ? `pou chante « ${d.songTitle} » ${d.artistName}` : `pou ${d.artistName}`;
  const amount = `${formatUSD(d.amountUsd)} (${formatHTG(d.amountHtg)})`;
  return [
    {
      label: "🙏 Mèsi (cho)",
      text: `Bonjou${name}! 🙏\n\nMèsi anpil pou don ${amount} ou fè ${forWhat} sou UpMizik. Nou verifye l, e l ap ede atis la kontinye kreye bèl mizik. 🎶\n\nSe fanatik tankou w ki fè mizik ayisyen an viv! ❤️${SIGN}`,
    },
    {
      label: "📋 Konfimasyon",
      text: `Bonjou${name},\n\nNou konfime nou resevwa don ${amount} ou fè ${forWhat}. Li valide, e atis la resevwa pa li.\n\nMèsi pou sipò w!${SIGN}`,
    },
    {
      label: "⚡ Kout",
      text: `Mèsi${name}! 🙏 Don ${amount} ou ${forWhat} valide. ${d.artistName} di w mèsi! 🎶${SIGN}`,
    },
  ];
}

export function donationRejectedTemplates(d: DonationCtx, reason: string | null): Template[] {
  const name = d.donorName ? ` ${d.donorName}` : "";
  const amount = `${formatUSD(d.amountUsd)} (${formatHTG(d.amountHtg)})`;
  const why = reason ? `\nRezon: ${reason}` : "";
  return [
    {
      label: "🙏 Janti",
      text: `Bonjou${name},\n\nMèsi pou volonte w pou sipòte ${d.artistName}. Malerezman, nou pa t ka valide don ${amount} ou an.${why}\n\nSi w deja voye lajan an, reponn mesaj sa a ak yon foto ki pi klè (oswa nimewo tranzaksyon an), e n ap regle sa pou ou.${SIGN}`,
    },
    {
      label: "📋 Fòmèl",
      text: `Bonjou${name},\n\nDon ${amount} pou ${d.artistName} pa t ka valide.${why}\n\nOu ka refè don an sou ${SITE} ak yon nouvo prèv.${SIGN}`,
    },
  ];
}

// ---------------------------------------------------------------------
// RETRÈ
// ---------------------------------------------------------------------
type PayoutCtx = { artistName: string; amountHtg: number; method: string; reference?: string | null };

export function payoutPaidTemplates(p: PayoutCtx): Template[] {
  const ref = p.reference ? `\nReferans tranzaksyon: ${p.reference}` : "";
  return [
    {
      label: "💸 Peman voye",
      text: `Bonjou ${p.artistName}! 💸\n\nNou voye ${formatHTG(p.amountHtg)} sou ${p.method} ou.${ref}\n\nMèsi paske w pataje mizik ou sou UpMizik. Kontinye konsa! 🎶${SIGN}`,
    },
    {
      label: "📋 Resi",
      text: `Bonjou ${p.artistName},\n\nRetrè ou a peye.\nMontan: ${formatHTG(p.amountHtg)}\nMetòd: ${p.method}${ref}\n\nOu ka wè istwa retrè w yo sou ${SITE}/dashboard/finans.${SIGN}`,
    },
  ];
}

export function payoutRejectedTemplates(p: PayoutCtx, reason: string | null): Template[] {
  const why = reason ? `\nRezon: ${reason}` : "";
  return [
    {
      label: "🙏 Janti",
      text: `Bonjou ${p.artistName},\n\nNou pa t ka trete demann retrè ${formatHTG(p.amountHtg)} ou an pou kounye a.${why}\n\nLajan an toujou sou balans ou. Korije enfòmasyon an epi refè demann lan sou ${SITE}/dashboard/finans, oswa reponn mesaj sa a si w gen kesyon.${SIGN}`,
    },
    {
      label: "📋 Fòmèl",
      text: `Bonjou ${p.artistName},\n\nDemann retrè ${formatHTG(p.amountHtg)} ou an rejte.${why}\n\nBalans ou pa chanje.${SIGN}`,
    },
  ];
}
