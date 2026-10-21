import { SOCIAL_LINKS } from "@/lib/site";

// Ikòn rezo sosyal yo (SVG), ak koulè mak yo lè w pase sourit la
const ICONS: Record<(typeof SOCIAL_LINKS)[number]["name"], { path: React.ReactNode; hover: string }> = {
  Facebook: {
    hover: "hover:bg-[#1877F2]",
    path: (
      <path
        fill="currentColor"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.43c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.24 2.69.24v2.95h-1.52c-1.49 0-1.95.93-1.95 1.87v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z"
      />
    ),
  },
  Instagram: {
    hover: "hover:bg-gradient-to-tr hover:from-amber-500 hover:via-pink-600 hover:to-purple-600",
    path: (
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
        <circle cx="12" cy="12" r="4.2" />
        <circle cx="17.6" cy="6.4" r="0.6" fill="currentColor" stroke="none" />
      </g>
    ),
  },
  X: {
    hover: "hover:bg-zinc-100 hover:text-zinc-950",
    path: (
      <path
        fill="currentColor"
        d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.21-6.82-5.97 6.82H1.68l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64Z"
      />
    ),
  },
  YouTube: {
    hover: "hover:bg-[#FF0000]",
    path: (
      <path
        fill="currentColor"
        d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z"
      />
    ),
  },
  TikTok: {
    hover: "hover:bg-zinc-950 hover:ring-2 hover:ring-[#25F4EE] hover:shadow-[3px_3px_0_#FE2C55]",
    path: (
      <path
        fill="currentColor"
        d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z"
      />
    ),
  },
};

export function SocialIcons() {
  return (
    <ul className="flex gap-2">
      {SOCIAL_LINKS.map(({ name, url }) => {
        const icon = ICONS[name];
        const svg = (
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            {icon.path}
          </svg>
        );
        return (
          <li key={name}>
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`UpMizik sou ${name}`}
                className={`flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-200 transition hover:text-white ${icon.hover}`}
              >
                {svg}
              </a>
            ) : (
              <span
                title={`${name}: byento`}
                aria-label={`${name}: byento`}
                className="flex h-10 w-10 cursor-default items-center justify-center rounded-full bg-zinc-900 text-zinc-600"
              >
                {svg}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
