// ===== Pwofil Pro: avantaj ak limit yo (menm valè ak migration 20261130000000_pro_profiles.sql) =====
import { MAX_AUDIO_BYTES } from "@/lib/upload";
import { MAX_SPLITS } from "@/lib/splits";

export const PRO_MAX_AUDIO_BYTES = 100 * 1024 * 1024;
export const PRO_MAX_SPLITS = 10;
export const PRO_POSTS_PER_DAY = 15;
export const PRO_POST_DAYS = 60;

export function isPro(proUntil: string | null | undefined, now = Date.now()) {
  return !!proUntil && new Date(proUntil).getTime() > now;
}

export function maxAudioBytes(pro: boolean) {
  return pro ? PRO_MAX_AUDIO_BYTES : MAX_AUDIO_BYTES;
}

export function maxSplits(pro: boolean) {
  return pro ? PRO_MAX_SPLITS : MAX_SPLITS;
}

export const PRO_BENEFITS: { icon: string; title: string; text: string }[] = [
  { icon: "⭐", title: "Badj PRO sou pwofil ou", text: "Fanatik yo wè touswit ou se yon atis serye." },
  { icon: "🚀", title: "Ou parèt an premye", text: "Nan paj Atis yo ak nan « Atis popilè » sou paj akèy la." },
  { icon: "📸", title: "Stati 24 è", text: "Poste jiska 5 stati pa jou (foto, videyo, odyo oswa tèks) nan wonn ou, tankou WhatsApp." },
  { icon: "📌", title: "Chante an vedèt", text: "Chwazi 1 chante ki parèt gwo anlè paj pwofil ou, ak yon bouton Jwe." },
  { icon: "💬", title: `${PRO_POSTS_PER_DAY} pòs Sosyal pa jou`, text: `Olye 5, epi pòs ou yo rete ${PRO_POST_DAYS} jou olye 30.` },
  { icon: "🎚️", title: "Fichye pi gwo", text: "Odyo jiska 100 MB olye 50 MB (pi bon kalite son)." },
  { icon: "🤝", title: `Jiska ${PRO_MAX_SPLITS} kolaboratè`, text: "Pou pataj royalties yo, olye 5." },
];
