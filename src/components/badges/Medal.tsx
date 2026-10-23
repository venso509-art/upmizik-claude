// ===== Meday trofe ak nivo yo: yon disk metal (bwonz, ajan, lò...) ak yon ikòn liy pwòp =====
// Pa gen emoji: menm stil sou tout aparèy. Gradyan yo an CSS (pa gen id SVG), kidonk li mache nan konpozan sèvè yo.

export type MedalTier = "bronze" | "silver" | "gold" | "platinum" | "emerald" | "sapphire" | "ruby" | "violet";

export type MedalIcon =
  | "mic"
  | "disc"
  | "layers"
  | "flame"
  | "zap"
  | "users"
  | "heart"
  | "message"
  | "gift"
  | "coins"
  | "trending"
  | "trophy"
  | "badgeCheck"
  | "cake"
  | "sprout"
  | "star"
  | "gem"
  | "crown"
  | "music"
  | "target"
  | "medal";

// [limyè, mitan, fonse] pou chak metal
const TIERS: Record<MedalTier, [string, string, string]> = {
  bronze: ["#F6D2B0", "#C27C45", "#6E3D1C"],
  silver: ["#FFFFFF", "#BCC6D1", "#5E6B7A"],
  gold: ["#FFF4B8", "#F2C230", "#8A5A00"],
  platinum: ["#F1F8FF", "#A9C8E8", "#46678E"],
  emerald: ["#B9F3D6", "#22A36A", "#0A4D2E"],
  sapphire: ["#CDE3FF", "#3B82F6", "#1E3A8A"],
  ruby: ["#FFD0D8", "#E0405E", "#7F1230"],
  violet: ["#EBDCFF", "#9B5CF6", "#4C1D95"],
};

const PATHS: Record<MedalIcon, string[]> = {
  mic: ["M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z", "M19 10a7 7 0 0 1-14 0", "M12 17v5", "M8 22h8"],
  disc: ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z", "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z", "M6.5 12a5.5 5.5 0 0 1 5.5-5.5"],
  layers: ["M12 2 2 7l10 5 10-5-10-5Z", "M2 17l10 5 10-5", "M2 12l10 5 10-5"],
  flame: [
    "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5Z",
  ],
  zap: ["M13 2 3 14h9l-1 8 10-12h-9l1-8Z"],
  users: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z", "M22 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"],
  heart: ["M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"],
  message: ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z", "M8 9h8", "M8 13h5"],
  gift: [
    "M3 8h18v4H3Z",
    "M12 8v13",
    "M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7",
    "M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5",
  ],
  coins: ["M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2Z", "M18.09 10.37A6 6 0 1 1 10.34 18", "M7 6h1v4", "M16.71 13.88l.7.71-2.82 2.82"],
  trending: ["M22 7 13.5 15.5l-5-5L2 17", "M16 7h6v6"],
  trophy: [
    "M6 9H4.5a2.5 2.5 0 0 1 0-5H6",
    "M18 9h1.5a2.5 2.5 0 0 0 0-5H18",
    "M4 22h16",
    "M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22",
    "M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22",
    "M18 2H6v7a6 6 0 0 0 12 0V2Z",
  ],
  badgeCheck: [
    "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z",
    "m9 12 2 2 4-4",
  ],
  cake: [
    "M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8",
    "M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1",
    "M2 21h20",
    "M7 8v3",
    "M12 8v3",
    "M17 8v3",
    "M7 4h.01",
    "M12 4h.01",
    "M17 4h.01",
  ],
  sprout: [
    "M7 20h10",
    "M10 20c5.5-2.5.8-6.4 3-10",
    "M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8Z",
    "M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2Z",
  ],
  star: ["M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z"],
  gem: ["M6 3h12l4 6-10 13L2 9Z", "M11 3 8 9l4 13 4-13-3-6", "M2 9h20"],
  crown: [
    "M11.56 3.27a.5.5 0 0 1 .88 0l2.95 5.6a1 1 0 0 0 1.52.3l4.27-3.67a.5.5 0 0 1 .8.52l-2.83 10.25a1 1 0 0 1-.96.73H5.81a1 1 0 0 1-.96-.73L2.02 6.02a.5.5 0 0 1 .8-.52L7.1 9.16a1 1 0 0 0 1.51-.29Z",
    "M5 21h14",
  ],
  music: ["M9 18V5l12-2v13", "M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z", "M18 13a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"],
  target: ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z", "M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z", "M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"],
  medal: [
    "M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15",
    "M11 12 5.12 2.2",
    "m13 12 5.88-9.8",
    "M8 7h8",
    "M12 12a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z",
    "M12 18v-2h-.5",
  ],
};

const LOCK = ["M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z", "M7 11V7a5 5 0 0 1 10 0v4"];

const SIZES = {
  xs: { box: "h-7 w-7", ring: "p-[2px]", icon: "h-3.5 w-3.5", stroke: 2.2 },
  sm: { box: "h-10 w-10", ring: "p-[2.5px]", icon: "h-[18px] w-[18px]", stroke: 2 },
  md: { box: "h-14 w-14", ring: "p-[3px]", icon: "h-6 w-6", stroke: 1.9 },
  lg: { box: "h-20 w-20", ring: "p-1", icon: "h-9 w-9", stroke: 1.7 },
} as const;

export function MedalGlyph({ icon, className = "h-5 w-5", strokeWidth = 2 }: { icon: MedalIcon | "lock"; className?: string; strokeWidth?: number }) {
  const paths = icon === "lock" ? LOCK : PATHS[icon];
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

export function Medal({
  icon,
  tier,
  size = "md",
  locked = false,
  title,
  className = "",
}: {
  icon: MedalIcon;
  tier: MedalTier;
  size?: keyof typeof SIZES;
  locked?: boolean;
  title?: string;
  className?: string;
}) {
  const s = SIZES[size];
  const [light, mid, dark] = locked ? ["#3A4560", "#262F47", "#141B30"] : TIERS[tier];
  return (
    <span
      className={`relative inline-flex shrink-0 rounded-full ${s.box} ${s.ring} ${locked ? "" : "shadow-[0_6px_18px_-6px_rgba(0,0,0,0.7)]"} ${className}`}
      // Bòdi metal la: gradyan "conic" ki bay efè limyè k ap reflete sou metal la
      style={{ background: `conic-gradient(from 200deg, ${light}, ${mid}, ${dark}, ${mid}, ${light}, ${mid}, ${dark}, ${light})` }}
      title={title}
      role={title ? "img" : undefined}
      aria-label={title}
    >
      <span
        className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full"
        style={{ background: `radial-gradient(circle at 30% 25%, ${light} 0%, ${mid} 45%, ${dark} 100%)` }}
      >
        {/* Ti reflè limyè anlè a goch */}
        {!locked && <span className="pointer-events-none absolute -left-1/4 -top-1/3 h-2/3 w-3/4 rotate-[-25deg] rounded-full bg-white/25 blur-[2px]" />}
        <span className={`relative ${locked ? "text-zinc-500" : "text-white drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.55)]"}`}>
          <MedalGlyph icon={icon} className={s.icon} strokeWidth={s.stroke} />
        </span>
      </span>
      {locked && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-[40%] w-[40%] items-center justify-center rounded-full bg-zinc-800 text-zinc-300 ring-2 ring-zinc-950">
          <MedalGlyph icon="lock" className="h-[60%] w-[60%]" strokeWidth={2.4} />
        </span>
      )}
    </span>
  );
}
