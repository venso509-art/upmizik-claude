// Ikòn liy pwòp pou zouti edisyon yo (koupe, vire, stickers, tèks...), menm stil tankou CapCut/Instagram
const PATHS = {
  close: ["M18 6 6 18", "M6 6l12 12"],
  check: ["M20 6 9 17l-5-5"],
  crop: ["M6 2v14a2 2 0 0 0 2 2h14", "M18 22V8a2 2 0 0 0-2-2H2"],
  rotate: ["M21 12a9 9 0 1 1-3-6.7L21 8", "M21 3v5h-5"],
  reset: ["M3 12a9 9 0 1 0 3-6.7L3 8", "M3 3v5h5"],
  zoomIn: ["M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z", "m21 21-4.3-4.3", "M11 8v6", "M8 11h6"],
  zoomOut: ["M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z", "m21 21-4.3-4.3", "M8 11h6"],
  sticker: ["M12 2a10 10 0 1 0 10 10", "M22 12h-6a4 4 0 0 1-4-4V2", "M8 14s1.5 2 4 2 4-2 4-2", "M9 9h.01", "M15 9h.01"],
  text: ["M4 7V4h16v3", "M9 20h6", "M12 4v16"],
  scissors: ["M6 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z", "M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z", "M20 4 8.12 15.88", "M14.47 14.48 20 20", "M8.12 8.12 12 12"],
  move: ["M5 9l-3 3 3 3", "M9 5l3-3 3 3", "M15 19l-3 3-3-3", "M19 9l3 3-3 3", "M2 12h20", "M12 2v20"],
  trash: ["M3 6h18", "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6", "M10 11v6", "M14 11v6", "M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"],
  minus: ["M5 12h14"],
  plus: ["M12 5v14", "M5 12h14"],
  play: ["M7 4v16l13-8Z"],
  pause: ["M7 4h3v16H7Z", "M14 4h3v16h-3Z"],
  background: ["M4 5h16v14H4Z", "M8 12h8"],
} as const;

export type EditorIconName = keyof typeof PATHS;

export function EditorIcon({ name, className = "h-5 w-5", strokeWidth = 2 }: { name: EditorIconName; className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

// Bouton zouti anba ekran an (ikòn + ti etikèt), tankou nan aplikasyon edisyon yo
export function ToolButton({
  icon,
  label,
  active = false,
  onClick,
  disabled,
}: {
  icon: EditorIconName;
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium transition disabled:opacity-40 ${
        active ? "text-citron-300" : "text-zinc-300 hover:text-white"
      }`}
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-full transition ${active ? "bg-citron-400/15 ring-1 ring-citron-400/60" : "bg-white/5"}`}>
        <EditorIcon name={icon} className="h-5 w-5" />
      </span>
      {label}
    </button>
  );
}
