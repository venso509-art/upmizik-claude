// Mesaj admin nan voye bay atis yo (WhatsApp / imèl) apre li apwouve oswa rejte enskripsyon yo.
// Modifye tèks yo isit la.

export function approvedMessage(name: string) {
  return (
    `Bonjou ${name}! 🎉\n\n` +
    `Kont atis ou sou UpMizik apwouve. Ou ka konekte kounye a sou https://upmizik.com/konekte ` +
    `epi kòmanse pibliye mizik ou.\n\n` +
    `Byenvini nan fanmi UpMizik la! 🎶\n— Ekip UpMizik`
  );
}

export function rejectedMessage(name: string, reason: string | null) {
  return (
    `Bonjou ${name},\n\n` +
    `Nou pa t ka valide prèv peman frè enskripsyon w lan sou UpMizik.` +
    (reason ? `\nRezon: ${reason}` : "") +
    `\n\nKonekte sou https://upmizik.com/konekte pou w voye yon nouvo prèv. ` +
    `Si w gen kesyon, reponn mesaj sa a.\n\nMèsi!\n— Ekip UpMizik`
  );
}

export function messageForStatus(status: "pending" | "verified" | "rejected", name: string, reason: string | null) {
  if (status === "verified") return approvedMessage(name);
  if (status === "rejected") return rejectedMessage(name, reason);
  return "";
}
