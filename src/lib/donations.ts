// ===== Paramèt don yo: chanje yo isit la =====
export const HTG_PER_USD = 145;
export const MIN_DONATION_USD = 5;
export const MAX_DONATION_USD = 10000;
export const DONATION_PRESETS_USD = [5, 10, 20, 50, 100];

export type DonationMethod = "moncash" | "natcash";
export type ContactType = "email" | "whatsapp";

export const DONATION_METHODS: Record<DonationMethod, { label: string; number: string; color: string }> = {
  moncash: { label: "MonCash", number: "38 91 2317", color: "from-red-500 to-red-700" },
  natcash: { label: "NatCash", number: "35 37 1184", color: "from-orange-500 to-amber-600" },
};

export function toHTG(usd: number) {
  return Math.round(usd * HTG_PER_USD * 100) / 100;
}

export function formatUSD(usd: number) {
  return `$${usd.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function formatHTG(htg: number) {
  return `${htg.toLocaleString("fr-HT", { maximumFractionDigits: 2 })} goud`;
}

// Retounen yon mesaj erè, oswa null si kontak la valid
export function validateContact(type: ContactType, value: string): string | null {
  const v = value.trim();
  if (type === "email") return /^\S+@\S+\.\S+$/.test(v) ? null : "Imèl la pa valid.";
  const digits = v.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? null : "Nimewo WhatsApp la pa valid (egz: +509 3412 3456).";
}

// Lyen wa.me bezwen kòd peyi a: si se 8 chif (nimewo Ayiti), nou ajoute 509
export function whatsappLink(phone: string, text: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 8) digits = `509${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function thankYouMessage(d: { donorName: string | null; amountUsd: number; amountHtg: number; artistName: string; songTitle: string | null }) {
  const name = d.donorName ? ` ${d.donorName}` : "";
  const forWhat = d.songTitle ? `pou chante « ${d.songTitle} » ${d.artistName}` : `pou ${d.artistName}`;
  return (
    `Bonjou${name}! 🙏\n\n` +
    `Mèsi anpil pou don ${formatUSD(d.amountUsd)} (${formatHTG(d.amountHtg)}) ou fè ${forWhat} sou UpMizik. ` +
    `Nou verifye l, e l ap ede atis la kontinye kreye bèl mizik. 🎶\n\n— Ekip UpMizik`
  );
}
