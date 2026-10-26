// Ti badj 🔥 Boost: mizik oswa pwofil ki peye pou parèt an premye
export function BoostBadge({ size = "sm", className = "" }: { size?: "xs" | "sm" | "md"; className?: string }) {
  const s =
    size === "md" ? "gap-1 px-2.5 py-1 text-xs" : size === "xs" ? "gap-0.5 px-1.5 py-[1px] text-[9px]" : "gap-1 px-2 py-0.5 text-[10px]";
  return (
    <span
      className={`inline-flex items-center rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 font-black uppercase tracking-wide text-[#FFFFFF] shadow-[0_0_12px_rgba(249,115,22,0.55)] ring-1 ring-white/30 ${s} ${className}`}
      title="Atis sa a boost mizik li"
    >
      <span className="motion-safe:animate-heartbeat" aria-hidden>
        🔥
      </span>
      Boost
    </span>
  );
}
