// To echanj la, nimewo MonCash/NatCash yo ak don minimòm lan nan baz done a kounye a
// (tablo "settings", modifyab sou /admin/peman): gade src/lib/settings.ts.
export const MAX_DONATION_USD = 10000;
export const DONATION_PRESETS_USD = [5, 10, 20, 50, 100];

export type DonationMethod = "moncash" | "natcash";
export type ContactType = "email" | "whatsapp";

// Non ak koulè chak metòd (nimewo yo soti nan paramèt yo: methodNumber())
export const DONATION_METHODS: Record<DonationMethod, { label: string; color: string }> = {
  moncash: { label: "MonCash", color: "from-red-500 to-red-700" },
  natcash: { label: "NatCash", color: "from-orange-500 to-amber-600" },
};

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
