// ===== Mesaj ki akonpaye lyen yo lè yon moun pataje (WhatsApp, Facebook, Instagram, SMS...) =====
// Objektif: fè moun ki resevwa lyen an vin KOUTE mizik la, epi ankouraje l fè yon DON bay atis la.
// Lyen an li menm ajoute apre mesaj la (pa navigatè a oswa pa shareLink).

// Pwofil atis la: atis la li menm (isOwner) pale an premye moun
export function artistShareText(name: string, isOwner: boolean) {
  return isOwner
    ? `🎤 Mwen sou UpMizik! Vin koute mizik mwen gratis 🎧\n` +
        `Si sa w tande a touche w, sipòte m dirèkteman ak yon ti don sou MonCash oswa NatCash 💝 ` +
        `Chak ekout ak chak don ede m kontinye fè mizik. Mèsi davans! 🙏🇭🇹`
    : `🔥 Dekouvri ${name} sou UpMizik! 🎧\n` +
        `Vin koute mizik li gratis, epi sipòte l dirèkteman ak yon don sou MonCash oswa NatCash 💝 ` +
        `Ann pouse talan ayisyen yo! 🇭🇹`;
}

// Yon chante
export function songShareText(title: string, artistName: string) {
  return (
    `🎶 « ${title} » pa ${artistName} disponib sou UpMizik! 🎧\n` +
    `Klike pou w koute l gratis. Si l touche w, fè yon ti don pou sipòte ${artistName} dirèkteman 💝 ` +
    `Chak ekout konte! 🇭🇹`
  );
}

// Yon EP, yon Mixtape oswa yon Album
export function releaseShareText(kindLabel: string, title: string, artistName: string) {
  return (
    `💿 Nouvo ${kindLabel} « ${title} » pa ${artistName} sou UpMizik! 🎧\n` +
    `Vin koute tout pwojè a gratis, epi sipòte atis la ak yon don sou MonCash oswa NatCash 💝 🇭🇹`
  );
}

// Paj don an (/don/<atis>)
export function donateShareText(name: string, isOwner: boolean) {
  return isOwner
    ? `💝 Ou renmen mizik mwen? Ou ka sipòte m dirèkteman sou UpMizik ak MonCash oswa NatCash. ` +
        `Menm yon ti kontribisyon ede m kontinye kreye. Mèsi pou sipò w! 🙏🇭🇹`
    : `💝 Sipòte ${name} sou UpMizik! Voye yon don dirèk sou MonCash oswa NatCash. ` +
        `Chak ti kontribisyon ede l kontinye fè mizik! 🇭🇹`;
}

// Sit la menm (bouton pataje anba paj la)
export function siteShareText() {
  return (
    `🇭🇹🎶 Ou konnen UpMizik? Se platfòm mizik 100% ayisyen an!\n` +
    `Koute dènye tit atis nou yo GRATIS, dekouvri nouvo talan, epi sipòte yo dirèkteman 💝\n` +
    `Vin fè yon ti vire, w ap renmen l 👇`
  );
}

// Yon pòs Sosyal
export function postShareText(artistName: string) {
  return `📣 Gade dènye nouvèl ${artistName} sou UpMizik! Vin koute mizik li epi sipòte l 💝🇭🇹`;
}
