// Ti badj "PRO" (atis ki peye Pwofil Pro a)
export function ProBadge({ size = "sm", className = "" }: { size?: "sm" | "md"; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-md bg-gradient-to-r from-citron-300 to-amber-500 font-black uppercase tracking-wider text-zinc-950 shadow-sm ${
        size === "md" ? "px-2 py-0.5 text-xs" : "px-1.5 py-px text-[10px]"
      } ${className}`}
      title="Atis Pro UpMizik"
    >
      ★ Pro
    </span>
  );
}
