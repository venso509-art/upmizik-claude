// Ti badj "LIVE" wouj ak yon pwen k ap klere, pou atis k ap fè live kounye a
export function LiveBadge({ className = "", size = "sm" }: { className?: string; size?: "sm" | "md" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md bg-red-600 font-black uppercase tracking-wide text-white shadow-lg shadow-red-600/40 ${
        size === "md" ? "px-2.5 py-1 text-xs" : "px-1.5 py-px text-[10px]"
      } ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
      </span>
      Live
    </span>
  );
}
