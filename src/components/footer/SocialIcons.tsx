import { SOCIAL_LINKS, WHATSAPP_URL } from "@/lib/site";
import { ShareSiteButton } from "./ShareSiteButton";

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
    <ul className="flex flex-wrap gap-2">
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
      {/* WhatsApp UpMizik: +509 38 91 2317 */}
      <li>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Ekri UpMizik sou WhatsApp (+509 38 91 2317)"
          title="WhatsApp: +509 38 91 2317"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-200 transition hover:bg-[#25D366] hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            <path
              fill="currentColor"
              d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35ZM12.04 21.5h-.01a9.5 9.5 0 0 1-4.84-1.33l-.35-.21-3.6.94.96-3.51-.23-.36A9.46 9.46 0 0 1 2.5 12a9.54 9.54 0 0 1 16.28-6.73A9.45 9.45 0 0 1 21.56 12c0 5.25-4.27 9.5-9.52 9.5Zm8.1-17.6A11.4 11.4 0 0 0 12.04.5C5.73.5.6 5.63.6 11.94c0 2.02.53 3.99 1.53 5.72L.5 23.5l5.98-1.57a11.4 11.4 0 0 0 5.56 1.42h.01c6.31 0 11.44-5.13 11.44-11.44 0-3.06-1.19-5.93-3.35-8.1Z"
            />
          </svg>
        </a>
      </li>
      {/* Flèch pou pataje sit la */}
      <li>
        <ShareSiteButton />
      </li>
    </ul>
  );
}
