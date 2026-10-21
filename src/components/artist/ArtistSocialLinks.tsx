// Bouton rezo sosyal atis la: sèlman sa ki gen yon lyen parèt
type Links = { youtube?: string | null; instagram?: string | null; tiktok?: string | null; whatsapp?: string | null };

const ICONS = {
  youtube: {
    label: "YouTube",
    hover: "hover:bg-[#FF0000] hover:border-[#FF0000]",
    path: "M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z",
  },
  tiktok: {
    label: "TikTok",
    hover: "hover:border-[#25F4EE] hover:shadow-[3px_3px_0_#FE2C55]",
    path: "M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z",
  },
  whatsapp: {
    label: "WhatsApp",
    hover: "hover:bg-[#25D366] hover:border-[#25D366] hover:text-zinc-950",
    path: "M12.04 2a9.9 9.9 0 0 0-8.47 15.03L2.5 21.5l4.6-1.05A9.9 9.9 0 1 0 12.04 2Zm5.78 14.03c-.24.68-1.4 1.3-1.93 1.34-.5.05-.97.23-3.27-.68-2.77-1.09-4.52-3.93-4.66-4.11-.13-.18-1.11-1.48-1.11-2.82 0-1.34.7-2 .95-2.27.25-.27.54-.34.72-.34h.52c.17 0 .4-.06.62.48.24.56.8 1.94.86 2.08.07.14.12.3.02.48-.1.18-.14.3-.28.46l-.42.48c-.14.14-.28.29-.12.57.16.27.72 1.18 1.54 1.91 1.06.94 1.95 1.24 2.23 1.38.27.14.43.12.6-.07.16-.18.7-.81.88-1.09.18-.27.37-.23.62-.14.25.09 1.6.76 1.87.9.27.13.46.2.52.32.07.12.07.66-.17 1.33Z",
  },
} as const;

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.6" cy="6.4" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ArtistSocialLinks({ links }: { links: Links }) {
  const base =
    "flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/70 text-zinc-200 backdrop-blur transition hover:text-white";
  const items: { key: string; href: string; label: string; hover: string; icon: React.ReactNode }[] = [];
  if (links.youtube)
    items.push({ key: "yt", href: links.youtube, label: ICONS.youtube.label, hover: ICONS.youtube.hover, icon: <Svg d={ICONS.youtube.path} /> });
  if (links.instagram)
    items.push({
      key: "ig",
      href: links.instagram,
      label: "Instagram",
      hover: "hover:border-transparent hover:bg-gradient-to-tr hover:from-amber-500 hover:via-pink-600 hover:to-purple-600",
      icon: <InstagramIcon />,
    });
  if (links.tiktok) items.push({ key: "tt", href: links.tiktok, label: ICONS.tiktok.label, hover: ICONS.tiktok.hover, icon: <Svg d={ICONS.tiktok.path} /> });
  if (links.whatsapp)
    items.push({ key: "wa", href: links.whatsapp, label: ICONS.whatsapp.label, hover: ICONS.whatsapp.hover, icon: <Svg d={ICONS.whatsapp.path} /> });
  if (items.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((i) => (
        <li key={i.key}>
          <a href={i.href} target="_blank" rel="noopener noreferrer" aria-label={i.label} title={i.label} className={`${base} ${i.hover}`}>
            {i.icon}
          </a>
        </li>
      ))}
    </ul>
  );
}

function Svg({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="currentColor" d={d} />
    </svg>
  );
}
