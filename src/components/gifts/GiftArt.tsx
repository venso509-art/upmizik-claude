import credits from "@/lib/giftPhotoCredits.json";

// Ti kado live yo: imaj 3D (Fluent Emoji © Microsoft, lisans MIT) nan public/gifts/<id>.png.
const WITH_ART = new Set(["rose", "kafe", "konpa", "tanbou", "lyon", "kouwon", "avyon", "fize", "chato", "diaman"]);

// Kado mizik yo (nivo 1-5): vrè foto (Wikimedia Commons, lisans lib; kredi yo sou /kredi-imaj)
// PNG yo se foto pwodwi sou fon blan: montre yo antye (contain); JPG yo ranpli kat la (cover)
const PHOTOS: Record<string, { src: string; contain: boolean }> = Object.fromEntries(
  credits.map((c) => [c.id, { src: `/gifts/foto/${c.file}`, contain: c.file.endsWith(".png") }]),
);
export const giftPhoto = (id: string): { src: string; contain: boolean } | undefined => PHOTOS[id];

export function GiftArt({ id, emoji, className = "h-10 w-10" }: { id: string; emoji: string; className?: string }) {
  if (!WITH_ART.has(id)) {
    return (
      <span className={`flex items-center justify-center text-3xl ${className}`} aria-hidden>
        {emoji}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/gifts/${id}.png`} alt="" loading="lazy" draggable={false} className={`object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.45)] ${className}`} />;
}

// Kat chak nivo: bwonz → ajan → lò → platin → dyaman
export const TIER_FRAME: Record<number, { card: string; glow: string; label: string }> = {
  0: { card: "bg-zinc-900 ring-zinc-700", glow: "", label: "text-zinc-300" },
  1: { card: "bg-gradient-to-b from-[#7a4a22]/40 to-zinc-950 ring-[#c98a4b]/50", glow: "bg-[#c98a4b]/25", label: "text-[#e9b27a]" },
  2: { card: "bg-gradient-to-b from-slate-300/20 to-zinc-950 ring-slate-300/50", glow: "bg-slate-200/20", label: "text-slate-200" },
  3: { card: "bg-gradient-to-b from-[#FFD700]/25 to-zinc-950 ring-[#FFD700]/60", glow: "bg-[#FFD700]/25", label: "text-[#FFE34D]" },
  4: { card: "bg-gradient-to-b from-violet-400/25 to-zinc-950 ring-violet-300/60", glow: "bg-violet-400/30", label: "text-violet-200" },
  5: { card: "bg-gradient-to-b from-fuchsia-500/25 via-cyan-400/10 to-zinc-950 ring-cyan-300/70", glow: "bg-gradient-to-r from-fuchsia-500/40 to-cyan-400/40", label: "text-cyan-100" },
};
