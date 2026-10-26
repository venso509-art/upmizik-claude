// Ti flanm 🔥 sou mizik/pwofil boosted yo. Pa gen mo "Boost" (vizitè yo pa bezwen konnen se piblisite):
// yon ti wonn dore ak yon flanm ki bat dousman.
export function BoostBadge({ size = "sm", className = "" }: { size?: "xs" | "sm" | "md"; className?: string }) {
  const s = size === "md" ? "h-8 w-8 text-base" : size === "xs" ? "h-5 w-5 text-[11px]" : "h-6 w-6 text-[13px]";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-orange-500 to-rose-500 shadow-[0_0_12px_rgba(249,115,22,0.6)] ring-2 ring-white/40 ${s} ${className}`}
      aria-hidden
    >
      <span className="leading-none motion-safe:animate-heartbeat">🔥</span>
    </span>
  );
}
