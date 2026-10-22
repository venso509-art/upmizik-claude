"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Ikòn yo: liy (pa aktif) oswa ranpli (aktif), tankou yon app mobil
function HomeIcon({ active }: { active: boolean }) {
  return active ? (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M11.3 2.7a1 1 0 0 1 1.4 0l8.5 8a1 1 0 0 1 .3.7V20a2 2 0 0 1-2 2h-4.5v-6.5h-6V22H4.5a2 2 0 0 1-2-2v-8.6a1 1 0 0 1 .3-.7l8.5-8Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinejoin="round" aria-hidden>
      <path d="M3.5 11.4 12 3.5l8.5 7.9V20a1 1 0 0 1-1 1h-4.5v-6.5h-6V21H4.5a1 1 0 0 1-1-1v-8.6Z" />
    </svg>
  );
}

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" aria-hidden>
      <rect x="8.5" y="2.5" width="7" height="12" rx="3.5" fill={active ? "currentColor" : "none"} />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3.5M8.5 21.5h7" />
    </svg>
  );
}

function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.9} strokeLinejoin="round" aria-hidden>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.6 3.8a.5.5 0 0 1-.8-.4V16.0A2.5 2.5 0 0 1 4 14V5.5Z" />
      {!active && <path d="M8 8.5h8M8 11.5h5" strokeLinecap="round" />}
    </svg>
  );
}

const ITEMS = [
  { href: "/", label: "Akèy", Icon: HomeIcon, match: (p: string) => p === "/" },
  { href: "/atis", label: "Atis", Icon: MicIcon, match: (p: string) => p === "/atis" || p.startsWith("/atis/") },
  { href: "/sosyal", label: "Sosyal", Icon: ChatIcon, match: (p: string) => p.startsWith("/sosyal") },
];

// Ba navigasyon anba ekran an (telefòn sèlman)
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasyon prensipal"
      className="fixed inset-x-0 bottom-0 z-50 transform-gpu border-t border-white/5 bg-zinc-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-3">
        {ITEMS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition active:scale-95 ${
                  active ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {/* Ti ba gradyan anlè opsyon ki aktif la */}
                <span
                  className={`absolute top-0 h-[3px] w-10 rounded-b-full bg-gradient-to-r from-fuchsia-500 to-violet-500 transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
                  aria-hidden
                />
                <span className={`flex h-8 w-14 items-center justify-center rounded-full transition ${active ? "bg-fuchsia-500/15 text-fuchsia-300" : ""}`}>
                  <Icon active={active} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
